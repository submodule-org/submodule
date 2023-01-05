import { Command } from "commander"
import requireDir from "require-dir";
import path from "path"
import { z } from "zod"

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
    const config = submodule?.configFn?.() || {}
    
    const preparedContext = submodule?.preparedContextFn?.({ config }) || {}

    const routes = requireDir(path.join(args.cwd, args.routeDir))
    const preparedRoutes = submodule?.handlerFn?.({ config, preparedContext, handlers: routes }) || routes

    await submodule?.adaptorFn?.({ config, preparedContext, router: preparedRoutes })
  });