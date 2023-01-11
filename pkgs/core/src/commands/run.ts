import { Command } from "commander"
import requireDir from "require-dir";
import path from "path"
import { z } from "zod"
import { trace } from "../instrument"

function tryRequire(args: { dir: string, modulePath: string, optional?: boolean }) {
  try {
    return require(path.join(args.dir, args.modulePath))
  } catch (e) {
    if (!!args.optional) return undefined
    else throw e
  }
}

type Arg = {
  cwd: string,
  config: string,
  routeDir: string
}

// don't overuse zod to validate function shape, it has performance impact as well as weird interception to the input and result
const submoduleSchema = z.object({
  configFn: z.function().optional(),
  preparedContextFn: z.function().optional(),
  handlerFn: z.function().optional(),
  adaptorFn: z.function().optional()
})

export default new Command()
  .option('--cwd', 'current working dir', process.cwd())
  .option('-c, --config', 'config file', './submodule')
  .option('-r, --routeDir', 'route dir', './routes')
  .action(async (args: Arg) => {
    const nonValidatedSubmodule = tryRequire({ dir: args.cwd, modulePath: args.config })

    const submodule = submoduleSchema.parse(nonValidatedSubmodule.default || nonValidatedSubmodule)
    const config = await submodule?.configFn?.() || {}

    const preparedContext = await submodule?.preparedContextFn?.({ config }) || {}

    const routes = requireDir(path.join(args.cwd, args.routeDir))
    const preparedRoutes = await submodule?.handlerFn?.({ config, preparedContext, handlers: routes }) || routes

    // trap the route so we know when it is started/ended
    Object.keys(preparedRoutes).forEach(routeKey => {
      const route = preparedRoutes[routeKey]

      if (typeof route === 'function') {
        preparedRoutes[routeKey] = trace(routeKey, route)
      } else {
        preparedRoutes[routeKey].handle = trace(routeKey, preparedRoutes[routeKey].handle)
      }
    })

    await submodule?.adaptorFn?.({ config, preparedContext, router: preparedRoutes })
  });
