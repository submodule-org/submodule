import fastify from "fastify"

import { ExtractRouteFn, GetRouteModules, builder } from "@submodule/core"
import { FastifyRequest, FastifyReply, HTTPMethods } from "fastify"

type Config = { port: number }
type Services = {}
type RequestContext = { req: FastifyRequest, rep: FastifyReply }
type HandleFunction<Output = unknown> = (handleParam: RequestContext) => Output | Promise<Output> | void
type RouteMeta = { methods: HTTPMethods | HTTPMethods[] }
type RouteModule = {
  default: HandleFunction
  meta?: RouteMeta
}

interface RouteFnExtractor extends ExtractRouteFn<RouteModule> {
  routeFn: this['routeModule']['default']
}

export const sb = builder()
  .config<Config>()
  .services<Services>()
  .context<RequestContext>()
  .routeModule<RouteModule, RouteFnExtractor>()

const submodule: typeof sb.serverSubmodule = {
  createConfig() {
    return {
      port: Number(process.env.PORT_NUMBER || 3000)
    }
  },

  async loadRouteModules({ }) {
    return {
      echo: await import("./routes/echo")
    }
  },

  async createRoute({ routeModule, routeName }) {
    return {
      handle: async (context) => {
        const result = await routeModule.default(context)

        if (result !== undefined) {
          context.rep.send(result)
        }
      },
      routeModule, routeName
    }
  },

  async serve({ config, router }) {
    const server = fastify()

    for (const [routeName, route] of Object.entries(router)) {
      server.route({
        method: route.routeModule.meta?.methods || ['GET'],
        url: `/${routeName}`,
        handler: (req, rep) => {
          return route.handle({ req, rep })
        }
      })
    }

    server.listen({
      port: config.port
    })

    console.log("Server is listening at port", config.port)
  }
}

export const defineRoute = sb.defineRouteFn
export const defineMeta = (meta: RouteMeta) => meta
export type Submodule = typeof sb.serverSubmodule
export type Routes = GetRouteModules<typeof submodule>