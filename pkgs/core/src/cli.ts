#!/usr/bin/env node

import * as tracing from "./tracing"
import { fork } from "child_process"

const debugCore = require('debug')('submodule.core')

import { register } from "esbuild-register/dist/node"
register()

import { Command } from "commander"
import { requireDir } from "./loader";
import path from "path"
import { z } from "zod"
import { trace, instrument } from "./instrument"
import fs from "fs"

import type { Submodule, ArgShape, CommandShape, OptShape, SubmoduleArgs } from "./index"

type S = Required<Submodule>

const submoduleConfigSchema = z.object({
  appName: z.string(),
  traceEnabled: z.boolean().default(true)
})

// don't overuse zod to validate function shape, it has performance impact as well as weird interception to the input and result
const submoduleSchema = z.object({
  createConfig: z.custom<S['createConfig']>().optional(),
  createServices: z.custom<S['createServices']>().optional(),
  createRoute: z.custom<S['createRoute']>().optional(),
  createRouter: z.custom<S['createRouter']>().optional(),
  createCommands: z.custom<S['createCommands']>().optional(),
  submodule: submoduleConfigSchema.default({
    appName: 'local',
    traceEnabled: true
  }).optional()
})

const routeModuleSchema = z.object({
  default: z.function()
})

const argSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional().default(false),
  defaultValue: z.string().optional(),
  value: z.string().optional()
}) satisfies z.ZodType<ArgShape>


const optSchema = z.object({
  name: z.string(),
  shortName: z.string().length(1).optional(),
  description: z.string().optional(),
  required: z.boolean().optional().default(false),
  defaultValue: z.string().optional(),
  value: z.string().optional()
}) satisfies z.ZodType<OptShape>

const commandSchema = z.object({
  description: z.string().optional(),
  action: z.function().returns(z.void().or(z.promise(z.void()))),
  args: z.array(argSchema).optional(),
  opts: z.array(optSchema).optional()
}) satisfies z.ZodType<CommandShape>

const commandsSchema = z.record(commandSchema)

const program = new Command()
  .option('--cwd <cwd>', 'current working dir', process.cwd())
  .option('-c, --config <config>', 'config file', 'submodule')
  .option('-r, --routeDir <routeDir>', 'route dir', './routes')
  .option('-d, --dev', 'watch for changes automatically', false)
  .argument('[subCommand]', 'subcommand to forward to')
  .passThroughOptions(true)
  .action(async function (subCommand: string, args: SubmoduleArgs, command: Command) {
    debugCore('submodule starting %O', args)

    if (args.dev && !process.env.SUBMODULE_CHILD) {
      debugCore('Running in dev')
      const chokidar = await import('chokidar')
      const watcher = chokidar.watch(`${args.cwd}/**/*.{js,ts,json}`)

      function delegate() {
        const forked = fork(`${__dirname}/cli.js`, command.args, {
          env: { ...process.env, SUBMODULE_CHILD: "true" },
          execArgv: [...process.execArgv, '--enable-source-maps']
        });

        forked.on('error', console.error)
        return forked
      }

      let forked = delegate()

      watcher.on('change', async (path) => {
        debugCore('change detected %s. restarting submodule', path)

        !forked.killed && forked.kill()
        forked = delegate()
      })

    } else {
      const resovledCwd = path.resolve(process.cwd(), args.cwd)
      const loaded = await requireDir(resovledCwd, { recurse: false })

      let nonValidatedSubmodule = {}

      if (loaded[args.config]) {
        debugCore('loading custom submodule')
        nonValidatedSubmodule = loaded[args.config].default || loaded[args.config]
      } else {
        debugCore('using default submodule')
      }

      const submodule = submoduleSchema.parse(nonValidatedSubmodule)
      const submoduleConfig = submodule.submodule

      debugCore('submodule loaded %O', submoduleConfig)

      // not needed to wait
      submoduleConfig?.traceEnabled && tracing.init(submoduleConfig)

      const config = await submodule?.createConfig?.() || {}
      debugCore('config loaded %O', config)

      const services = instrument(await submodule?.createServices?.({ config }) || {}, 1)
      debugCore('services loaded %O', services)

      debugCore('executing run')

      /** Loading routes dir */
      async function loadRoutes() {
        const isRouteDirExist = fs.existsSync(path.join(args.cwd, args.routeDir))

        if (!isRouteDirExist && command.getOptionValueSource('routeDir') === 'default') {
          return { routes: {}, preparedRoutes: {} }
        }

        const routes = await requireDir(path.join(args.cwd, args.routeDir))
        debugCore('routes loaded %O', routes)

        const preparedRoutes = {}
        const createRoute = submodule.createRoute
          ? instrument(submodule.createRoute, 1)
          : instrument(function defaultCreateRoute({ config, services, routeModule }) {
            const verifiedModule = routeModuleSchema.parse(routeModule)

            return {
              handle: async function defaultRouteHandler(context: unknown) {
                return await verifiedModule.default({ config, services, context })
              }
            }
          }, 1)

        for (const routeName of Object.keys(routes)) {
          const routeModule = routes[routeName]
          preparedRoutes[routeName] = await createRoute({ config, services, routeModule, routeName })
        }

        const router = instrument(await submodule?.createRouter?.({ config, services, routeModules: preparedRoutes }) || preparedRoutes, 1)
        debugCore('router %O', router)

        // trap the route so we know when it is started/ended
        Object.keys(router).forEach(routeKey => {
          router[routeKey].handle = trace(routeKey, router[routeKey].handle)
        })

        return { routes, router }
      }

      const { router } = await instrument(loadRoutes(), 1)

      const commands = await submodule?.createCommands?.({ config, services, router, subCommand, commandArgs: ['submoduleCommand', subCommand, ...command.args], submoduleArgs: args })
      if (submodule.createCommands && commands === undefined) {
        debugCore('finished processing, expected the createCommands did something already')
        return
      }

      if (submodule.createCommands) {
        debugCore('using %O to create more commands', commands)
        const validatedCommandsShape = commandsSchema.parse(commands)

        for (const commandName of Object.keys(validatedCommandsShape)) {
          const commandShape = validatedCommandsShape[commandName]
          debugCore('adding command %s %O', commandName, commandShape)

          const addingCommand = new Command(commandName).action(async function commandHandler() {
            const refCommand = arguments[arguments.length - 1] as Command
            commandShape.action({ args: refCommand.args, opts: refCommand.opts() })
          })

          commandShape.description && addingCommand.description(commandShape.description)

          commandShape?.args?.forEach(arg => {
            const wrapper = () => arg.required ? `<${arg.name}>` : `[${arg.name}]`
            addingCommand.argument(wrapper(), arg.description, arg.defaultValue)
          })

          commandShape?.opts?.forEach(opt => {
            const shortName = opt.shortName ? `-${opt.shortName}` : ''
            const fullName = opt.required ? `--${opt.name} <${opt.name}>` : `--${opt.name}`
            addingCommand.option(`${shortName}, ${fullName}`, opt.description)
          })

          command.addCommand(addingCommand)
        }

        if (!subCommand) {
          return command.help()
        } else {
          await command.parseAsync(command.args, { from: 'user' })
        }
      } else {
        await router[subCommand]?.handle?.({ config, services })
      }
    }

  });

program.on('error', function errorHandler() {
  console.log(arguments)
  process.exit(1)
})

program.parse()
