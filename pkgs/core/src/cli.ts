#!/usr/bin/env node

import * as tracing from "./tracing"
import { fork } from "child_process"
import { register } from "esbuild-register/dist/node"
register({})

import { Command } from "commander"
import { requireDir } from "./loader";
import path from "path"
import { z } from "zod"
import { trace, instrument } from "./instrument"
import fs from "fs"

import type { SubmoduleArgs } from "./index"

const submoduleConfigSchema = z.object({
  appName: z.string(),
  traceEnabled: z.boolean().default(true)
})

// don't overuse zod to validate function shape, it has performance impact as well as weird interception to the input and result
const submoduleSchema = z.object({
  createConfig: z.function().optional(),
  createServices: z.function().optional(),
  createRoute: z.function().optional(),
  createRouter: z.function().optional(),
  createCommands: z.function().optional(),
  submodule: submoduleConfigSchema.default({
    appName: 'local',
    traceEnabled: true
  }).optional()
})

const routeModuleSchema = z.object({
  default: z.function()
})

const debugCore = require('debug')('submodule.core')

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
      const chokidar = await import('chokidar')
      const watcher = chokidar.watch(args.cwd)

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
          return { routes: {}, preparedRoutes: {}}
        }
        
        const routes = await requireDir(path.join(args.cwd, args.routeDir))
        debugCore('routes loaded %O', routes)
    
        const preparedRoutes = {}
        const createRoute = submodule.createRoute
          ? submodule.createRoute
          : function defaultCreateRoute({ config, services, routeModule }) {
              const verifiedModule = routeModuleSchema.parse(routeModule)

              return {
                handle: async function defaultRouteHandler(context: unknown) {
                  return await verifiedModule.default({ config, services, context })
                }
              }
            }

        Object.keys(routes).forEach(routeKey => {
          const routeModule = routes[routeKey]
          preparedRoutes[routeKey] = createRoute({ config, services, routeModule })
        })

        const router = instrument(await submodule?.createRouter?.({ config, services, routeModules: preparedRoutes }) || preparedRoutes, 1)
        debugCore('router %O', router)
    
        // trap the route so we know when it is started/ended
        Object.keys(router).forEach(routeKey => {
          router[routeKey].handle = trace(routeKey, router[routeKey].handle)
        })

        return { routes, router }
      }

      const { router } = await loadRoutes()

      await submodule?.createCommands?.({ config, services, router, subCommand, commandArgs: ['submoduleCommand', subCommand, ...command.args] })
    }
    
  });

program.on('error', function errorHandler() {
  console.log(arguments)
  process.exit(1)
})

program.parse()
