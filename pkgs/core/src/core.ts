import fs from "fs"
import path from "path"
import { z } from "zod"

import type { DefaultRouteModule, RouteLike, Submodule, SubmoduleArgs, SubmoduleInstance } from "./index"
import { instrument, trace } from "./instrument"
import { requireDir } from "./loader"
import * as tracing from "./tracing"

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
  Route extends RouteLike<Context> = RouteLike<Context>,
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

    const preparedRoutes = {}
    const createRoute = submodule.createRoute
      ? instrument(submodule.createRoute, 1)
      : instrument(function defaultCreateRoute({ config, services, routeModule }) {
        const verifiedModule = routeModuleSchema.parse(routeModule)

        return {
          handle: async function defaultRouteHandler(context: unknown) {
            return await verifiedModule.default({ config, services, context })
          }
        }
      }, 1)

    for (const routeName of Object.keys(routes)) {
      const routeModule = routes[routeName]
      preparedRoutes[routeName] = await createRoute({ config, services, routeModule, routeName })
    }

    const router = instrument(await submodule?.createRouter?.({ config, services, routeModules: preparedRoutes }) || preparedRoutes, 1)
    debugCore('router %O', router)

    // trap the route so we know when it is started/ended
    Object.keys(router).forEach(routeKey => {
      router[routeKey].handle = trace(routeKey, router[routeKey].handle)
    })

    return { routes, router }
  }

  const { router } = await instrument(loadRoutes(), 1)

  return { config: config as any, services, router, submodule: submodule as any }
}