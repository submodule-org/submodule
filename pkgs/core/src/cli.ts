import * as tracing from "./tracing"
import { register } from "esbuild-register/dist/node"
register({})

import { Command } from "commander"
import requireDir from "require-dir";
import path from "path"
import { z } from "zod"
import { trace, instrument } from "./instrument"

type Arg = {
  cwd: string,
  config: string,
  routeDir: string,
  dev: boolean
}

const submoduleConfigSchema = z.object({
  appName: z.string(),
  traceEnabled: z.boolean().default(true)
})

// don't overuse zod to validate function shape, it has performance impact as well as weird interception to the input and result
const submoduleSchema = z.object({
  configFn: z.function().optional(),
  preparedContextFn: z.function().optional(),
  handlerFn: z.function().optional(),
  adaptorFn: z.function().optional(),
  submodule: submoduleConfigSchema.default({
    appName: 'local',
    traceEnabled: true
  }).optional()
})

const debugCore = require('debug')('submodule.core')

const program = new Command()
  .option('--cwd', 'current working dir', process.cwd())
  .option('-c, --config', 'config file', './submodule')
  .option('-r, --routeDir', 'route dir', './routes')
  .option('--dev', 'watch for changes automatically', false)
  .passThroughOptions(true)
  .action(async function (args: Arg, command: Command) {
    const loaded = requireDir(args.cwd, { recurse: false })
    const nonValidatedSubmodule = loaded['submodule'] || {}

    const submodule = submoduleSchema.parse(nonValidatedSubmodule.default || nonValidatedSubmodule)
    const submoduleConfig = submodule.submodule

    debugCore('submodule loaded')

    // not needed to wait
    submoduleConfig?.traceEnabled && tracing.init(submoduleConfig)

    const config = await submodule?.configFn?.() || {}
    debugCore('config loaded')

    const preparedContext = instrument(await submodule?.preparedContextFn?.({ config }) || {}, 1)
    debugCore('preparedContext loaded')
    
    debugCore('executing run')

    const routes = requireDir(path.join(args.cwd, args.routeDir))
    debugCore('routes loaded')

    const preparedRoutes = instrument(await submodule?.handlerFn?.({ config, preparedContext, handlers: routes }) || routes, 1)
    debugCore('routes enriched')

    // trap the route so we know when it is started/ended
    Object.keys(preparedRoutes).forEach(routeKey => {
      const route = preparedRoutes[routeKey]

      if (typeof route === 'function') {
        preparedRoutes[routeKey] = trace(routeKey, route)
      } else {
        preparedRoutes[routeKey].handle = trace(routeKey, preparedRoutes[routeKey].handle)
      }
    })

    command.addCommand(new Command('inspect')
      .description('support you to understand current config')
      .action(async function inspect() {
        debugCore('executing inspect')
        console.dir({ config, preparedContext, routes, preparedRoutes }, { depth: 2 })
        process.exit(0)
      }))
    
    command.addCommand(new Command('run')
      .description('process to run the application')
      .action(async function defaultAction() {
      

      await submodule?.adaptorFn?.({ config, preparedContext, router: preparedRoutes })
    }))

    command.action(async function() {
      command.help()
    })

    await command.parseAsync(command.args, { from: 'user' })
  });

program.parse()
