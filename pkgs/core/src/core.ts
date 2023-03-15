import fs from "fs"
import path from "path"
import { z } from "zod"

import type { DefaultRouteModule, RouteLike, Submodule, SubmoduleArgs, SubmoduleInstance } from "./index"
import { instrument, trace } from "./instrument"
import { requireDir } from "./loader"
import * as tracing from "./tracing"
import { INSTANCE_KEY } from "./client"

const debugCore = require('debug')('submodule.core')

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

export type CreateSubmoduleArgs = {
  args: SubmoduleArgs
}

export const createSubmodule = async <
  Config = unknown,
  Services = unknown,
  Context = unknown,
  RouteModule = DefaultRouteModule<unknown, unknown, Config, Services, Context>,
  Route extends RouteLike<Context, RouteModule> = RouteLike<Context, RouteModule>,
  Router extends Record<string, Route> = Record<string, Route>>({ args }: CreateSubmoduleArgs): Promise<SubmoduleInstance<Config, Services, Context, RouteModule, Route, Router>> => {

  const resovledCwd = path.resolve(process.cwd(), args.cwd)
  const loaded = await requireDir(resovledCwd, { recurse: false, filter: (p) => p.name !== args.config })

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

  const config: unknown = await submodule?.createConfig?.() || {}
  debugCore('config loaded %O', config)

  const services = instrument(await submodule?.createServices?.({ config: config as any }) || {}, 1)
  debugCore('services loaded %O', services)

  debugCore('executing run')

  /** Loading routes dir */
  async function loadRoutes() {
    const isRouteDirExist = fs.existsSync(path.join(args.cwd, args.routeDir))

    if (!isRouteDirExist) {
      return { routes: {}, preparedRoutes: {} }
    }

    const routes = await requireDir(path.join(args.cwd, args.routeDir))
    debugCore('routes loaded %O', routes)

    const routeModules = {}
    const createRoute: S['createRoute'] = submodule.createRoute
      ? instrument(submodule.createRoute, 1)
      : instrument(function defaultCreateRoute({ config, services, routeModule, routeName }) {
        const verifiedModule = routeModuleSchema.parse(routeModule)

        return {
          handle: async function defaultRouteHandler(context: unknown) {
            return await verifiedModule.default({ config, services, context })
          },
          routeModule: routeModule,
          routeName: routeName
        }
      }, 1)

    for (const routeName in routes) {
      const routeModule = routes[routeName]

      const createRouteResult = await createRoute({ config, services, routeModule, routeName })

      if (createRouteResult === undefined) {
        debugCore('skipping routeName: %s, as createRoute returned undefined', routeName)
        continue
      }
      
      if (Array.isArray(createRouteResult)) {
        debugCore('additional routes detected in path %s', routeName)
        for (const routeResult of createRouteResult) {
          debugCore('adding route %s', routeName)
          routeModules[routeResult.routeName] = routeResult
        }
        continue
      }
      
      debugCore('adding route %s', routeName)
      routeModules[createRouteResult.routeName] = createRouteResult
    }

    const createRouter: S['createRouter'] = submodule.createRouter
      ? instrument(submodule.createRouter, 1)
      : instrument(function defaultCreateRouter({ routeModules }) {
        return routeModules
      })

    const router: Router = await createRouter({ config, services, routeModules }) as any
    debugCore('router %O', router)

    // trap the route so we know when it is started/ended
    for (const routeKey in router) {
      router[routeKey].handle = trace(routeKey, router[routeKey].handle)
    }

    return { routes, router }
  }

  const { router } = await instrument(loadRoutes(), 1)
  const submoduleInstance = { config: config as any, services, router, submodule: submodule as any }
  global[INSTANCE_KEY] = submoduleInstance
  
  return submoduleInstance as any
}