import { withControllerUnit } from "./controller"
import type { ExecutableSubmodule } from "./types"
import { defaultSubmodule } from "./defaultSubmodule"
import { instrument, trace, debug } from "./instrument"

export interface IOExtractor<T = unknown> {
  routeModule: T;
  input: unknown;
  output: unknown;
}

export type DefineExecutable = <
  InitArgs,
  Config,
  Services,
  RouteModule
> (defineOpts: ExecutableSubmodule<InitArgs, Config, Services, RouteModule>) => ExecutableSubmodule<InitArgs, Config, Services, RouteModule>

export const defineExecutable = ((submodule) => submodule) satisfies DefineExecutable

export const createExecutable = withControllerUnit(function _createExecutable<
  Extractor extends IOExtractor,
  Routes = unknown
>(
  submoduleDef: ExecutableSubmodule<any, any, any, any>
): <
  Query extends keyof Routes,
  IO extends Extractor & { routeModule: Routes[Query] } = Extractor & { routeModule: Routes[Query] }
>(query: Query | Exclude<string, Query>, input: IO['input']) => Promise<IO['output']> {
  let cached: { config: any, services: any, initArgs: any } | undefined = undefined
  const routeModules = new Map()

  const submodule = { ...defaultSubmodule, ...submoduleDef }
  instrument(submodule, debug)
  instrument(submodule, trace)

  async function load() {
    if (!cached) {
      const initArgs = await submodule.init()
      const config = await submodule.createConfig({ initArgs })
      const services = await submodule.createServices({ config, initArgs })
      cached = { config, services, initArgs }
    }

    return cached
  }

  return async (query, input) => {
    const queryString = query.toString()

    const { config, services, initArgs } = await load()

    const routeModule = routeModules.has(queryString)
      ? routeModules.get(query)
      : await submodule.loadRouteModule({ initArgs, config, query: queryString })

    return await submodule.execute({ initArgs, config, services, query: queryString, input, route: routeModule })
  }
})