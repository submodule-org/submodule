import { Command } from "commander"
import requireDir from "require-dir";
import path from "path"
import { z } from "zod"

import shimmer from "shimmer";

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

function measurableFn(original: () => any) {
  const returnFn = async function () {
    console.log("Starting request!");
    var returned = await original.apply(this, arguments)
    console.log("Done setting up request -- OH YEAH!");
    return returned;
  };

  returnFn.name = original.name + 'Wrapped'

  return returnFn
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
        shimmer.wrap<any, any>(preparedRoutes, routeKey, measurableFn)
      } else {
        shimmer.wrap<any, any>(route, 'handle', measurableFn)
      }
    })

    await submodule?.adaptorFn?.({ config, preparedContext, router: preparedRoutes })
  });
