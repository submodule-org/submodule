
import { withControllerUnit } from "./controller"
import { instrument, trace, debug } from "./instrument"
import type { ServerSubmodule } from "./types"
import createDebug from 'debug'
import { defaultSubmodule } from "./defaultSubmodule"

export type DefineSubmodule = <
  InitArgs,
  Config,
  Services,
  Context,
  RouteModule
> (defineOpts: ServerSubmodule<InitArgs, Config, Services, Context, RouteModule>) => ServerSubmodule<InitArgs, Config, Services, Context, RouteModule>

export const defineSubmodule = ((submodule) => submodule) satisfies DefineSubmodule

export const serve = withControllerUnit(async (
  nonValidatedSubmodule: ServerSubmodule<any, any, any, any, any, any, any>
) => {
  const _debug = createDebug('submodule.createSubmoduleInstance')

  const submodule = { ...defaultSubmodule, ...nonValidatedSubmodule }
  instrument(submodule, debug)
  instrument(submodule, trace)

  const initArgs = await submodule.init()
  const config = await submodule.createConfig({ initArgs })
  const routeModules = await submodule.loadRouteModules({ config, initArgs })

  const services = await submodule.createServices({ config, initArgs })

  const routes = {}
  for (const [routeName, routeModule] of Object.entries(routeModules)) {
    const maybeRoute = await submodule.createRoute({ initArgs, config, services, routeModule, routeName })

    instrument(maybeRoute, debug, 2)
    instrument(maybeRoute, trace, 2)

    if (maybeRoute === undefined) continue
    if (Array.isArray(maybeRoute)) {
      maybeRoute.forEach(route => routes[route['routeName']] = route)
    } else {
      routes[maybeRoute['routeName']] = maybeRoute
    }
  }

  const router = await submodule.createRouter({ initArgs, config, services, routes })

  const startPromise = submodule.serve({ initArgs, config, services, router })

  const client = await submodule.createInnerClient({ initArgs, config, services, router, startPromise })

  return { submodule, config, services, router, startPromise, client }
})