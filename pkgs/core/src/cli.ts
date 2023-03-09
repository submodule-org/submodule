#!/usr/bin/env node

import { fork } from "child_process"

const debugCli = require('debug')('submodule.cli')

if (typeof global['Deno'] === 'undefined') {
  require('esbuild-register')
}

import { Command } from "commander"

import type { ArgShape, CommandShape, OptShape, SubmoduleArgs } from "./index"
import { createSubmodule } from "./core"
import { z } from "zod"
import path from "path"

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

const commandsSchema = z.record(commandSchema.or(z.function()))

const program = new Command()
  .option('--cwd <cwd>', 'current working dir', process.cwd())
  .option('-c, --config <config>', 'config file', 'submodule')
  .option('-r, --routeDir <routeDir>', 'route dir', './routes')
  .option('-d, --dev', 'watch for changes automatically', Boolean(process.env.SUBMODULE_DEV))
  .option('--nowatch [file]', 'skip watching on glob, for code generation')
  .argument('[subCommand]', 'subcommand to forward to')
  .passThroughOptions(true)
  .action(async function (subCommand: string, args: SubmoduleArgs, command: Command) {
    debugCli('submodule starting %O', args)

    if (args.dev && !process.env.SUBMODULE_CHILD) {
      debugCli('Running in dev')
      const chokidar = await import('chokidar')
      const ignored = args.nowatch && [path.join(args.cwd, args.nowatch)]
      const watcher = chokidar.watch(`${args.cwd}/**/*.{js,ts,json}`, { ignored })

      function delegate() {
        const forked = fork(`${__dirname}/cli.js`, command.args, {
          env: { ...process.env, SUBMODULE_CHILD: "true", SUBMODULE_DEV: "true" },
          execArgv: [...process.execArgv, '--enable-source-maps']
        });

        forked.on('error', console.error)
        return forked
      }

      let forked = delegate()

      watcher.on('change', async (path) => {
        debugCli('change detected %s. restarting submodule', path)

        !forked.killed && forked.kill()
        forked = delegate()
      })

    } else {
      const { config, router, services, submodule } = await createSubmodule({ args })

      const commands = await submodule?.createCommands?.({ config, services, router, subCommand, commandArgs: ['submoduleCommand', subCommand, ...command.args], submoduleArgs: args })
      if (submodule.createCommands && commands === undefined) {
        debugCli('finished processing, expected the createCommands did something already')
        return
      }

      if (submodule.createCommands) {
        debugCli('using %O to create more commands', commands)
        const validatedCommandsShape = commandsSchema.parse(commands)

        for (const commandName of Object.keys(validatedCommandsShape)) {
          const commandShape = validatedCommandsShape[commandName]
          debugCli('adding command %s %O', commandName, commandShape)

          if (typeof commandShape !== 'function') {
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
          } else {
            command.command(commandName)
              .action(async function commandHandler() {
                const refCommand = arguments[arguments.length - 1] as Command
                commandShape({ args: refCommand.args, opts: refCommand.opts() })
              })
          }
        }

        if (!subCommand) {
          debugCli('No subcommand found, displaying help')
          return command.help()
        } else {
          debugCli('Subcommand found, executing')
          await command.parseAsync(command.args, { from: 'user' })
        }
      } else if (subCommand && router[subCommand]) {
        debugCli('Subcommand found, executing route in router')
        await router[subCommand]?.handle?.({ config, services })
      } else {
        debugCli('Subcommand not found, or path not found, displaying help')
        return command.help()
      }
    }
  });

program.on('error', function errorHandler() {
  console.log(arguments)
  process.exit(1)
})

program.parse()


