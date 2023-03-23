import { instrument, trace } from "./instrument"
import type { DefaultRouteModule, RouteLike, Submodule, SubmoduleInstance } from "./index"

import { INSTANCE_KEY } from "./client"

type S = Required<Submodule<unknown, unknown, unknown, unknown>>

export type CreateSubmoduleArgs = {
  args: { 
    cwd: string
    config: string
    routeDir: string
  }
}

export const createSubmoduleInstance = async (
  nonValidatedSubmodule: unknown,
  routes: Record<string, unknown>
): Promise<SubmoduleInstance> => {
  const debug = require('debug')('submodule.createSubmoduleInstance')
  const { z } = await import('zod')

  const submoduleConfigSchema = z.object({
    appName: z.string(),
    traceEnabled: z.boolean().default(false)
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

  const submodule = submoduleSchema.parse(nonValidatedSubmodule)
  const submoduleConfig = submodule.submodule

  debug('submodule loaded %O', submoduleConfig)

  if (submoduleConfig?.traceEnabled) {
    debug('start tracing')
    const tracing = await import('./tracing')
    tracing.init(submoduleConfig)
  }

  const config: unknown = await submodule?.createConfig?.() || {}
  debug('config loaded %O', config)

  const services = instrument(await submodule?.createServices?.({ config }) || {}, 1)
  debug('services loaded %O', services)

  async function createRouter(routes: Record<string, unknown>) {
    const routeModules = {}
    const createRoute: S['createRoute'] = submodule.createRoute
      ? instrument(submodule.createRoute, 1)
      : instrument(function defaultCreateRoute({ config, services, routeModule, routeName }) {
        debug('inspecting %s %O', routeName, routeModule)
        const verifiedModule = routeModuleSchema.parse(routeModule)

        return {
          handle: async function defaultRouteHandler(context: unknown) {
            return await verifiedModule.default({ config, services, context })
          },
          routeModule,
          routeName
        }
      }, 1)

    for (const routeName in routes) {
      const routeModule = routes[routeName]

      const createRouteResult = await createRoute({ config, services, routeModule, routeName })

      if (createRouteResult === undefined) {
        debug('skipping routeName: %s, as createRoute returned undefined', routeName)
        continue
      }
      
      if (Array.isArray(createRouteResult)) {
        debug('additional routes detected in path %s', routeName)
        for (const routeResult of createRouteResult) {
          debug('adding route %s', routeName)
          routeModules[routeResult.routeName] = routeResult
        }
        continue
      }
      
      debug('adding route %s', routeName)
      routeModules[createRouteResult.routeName] = createRouteResult
    }

    const createRouter: S['createRouter'] = submodule.createRouter
      ? instrument(submodule.createRouter, 1)
      : instrument(function defaultCreateRouter({ routeModules }) {
        return routeModules
      })

    const router = await createRouter({ config, services, routeModules }) as any
    debug('router %O', router)

    // trap the route so we know when it is started/ended
    for (const routeKey in router) {
      router[routeKey].handle = trace(routeKey, router[routeKey].handle)
    }

    return { routes, router }
  }

  debug('inspecting %O', routes)
  const { router } = await instrument(createRouter(routes), 1)

  const submoduleInstance = { config, services, router, submodule }
  global[INSTANCE_KEY] = submoduleInstance

  return submoduleInstance as any
}

export const createSubmodule = async <
  Config = unknown,
  Services = unknown,
  Context = unknown,
  RouteModule = DefaultRouteModule<unknown, unknown, Config, Services, Context>,
  Route extends RouteLike<Context, RouteModule> = RouteLike<Context, RouteModule>,
  Router extends Record<string, Route> = Record<string, Route>>({ args }: CreateSubmoduleArgs): Promise<SubmoduleInstance<Config, Services, Context, RouteModule, Route, Router>> => {
  const debug = require('debug')('submodule.createSubmodule')
  const fs = await import('fs')
  const loader = await import('./loader')
  const path = await import('path')

  const resovledCwd = path.resolve(process.cwd(), args.cwd)
  const loaded = await loader.requireDir(resovledCwd, { recurse: false, filter: (p) => p.name !== args.config })

  let nonValidatedSubmodule = {}

  if (loaded[args.config]) {
    debug('loading custom submodule')
    nonValidatedSubmodule = loaded[args.config].default || loaded[args.config]
  } else {
    debug('using default submodule')
  }

  /** Loading routes dir */
  async function loadRoutes(): Promise<Record<string, unknown>> {
    const isRouteDirExist = fs.existsSync(path.join(args.cwd, args.routeDir))

    if (!isRouteDirExist) {
      return {}
    }

    const routes = await loader.requireDir(path.join(args.cwd, args.routeDir))
    debug('routes loaded %O', routes)
    
    return routes
  }

  const routes = await instrument(loadRoutes(), 1)
  
  return createSubmoduleInstance(nonValidatedSubmodule, routes) as any
}