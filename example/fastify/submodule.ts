import pino from "pino"
import { Submodule } from "submodule"
import { z } from "zod"
import { Config, Context, PreparedContext, RouteMeta, RouteModule } from "./types"
import fastify from "fastify"

export default <Submodule<Config, PreparedContext, Context, RouteModule>>{
  configFn() {
    const configSchema = z.object({
      port: z.number(),
      logLevel: z.literal("fatal")
        .or(z.literal("error"))
        .or(z.literal("warn"))
        .or(z.literal("info"))
        .or(z.literal("debug"))
        .or(z.literal("trace"))
    }) satisfies z.ZodType<Config>

    return configSchema.parse({
      port: Number(process.env.PORT || 3000),
      logLevel: process.env.LOG_LEVEL || 'info'
    })
  },
  preparedContextFn({ config }) {
    return {
      logger: pino({ level: config.logLevel })
    }
  },
  handlerFn({ handlers }) {
    const metaSchema = z.object({
      websocket: z.boolean().optional(),
      path: z.string().optional(),
      method: z.array(z.literal('GET').or(z.literal('POST').or(z.literal('PUT'))))
    }) satisfies z.ZodType<RouteMeta>

    const routeModSchema = z.object({
      default: z.function(),
      meta: metaSchema.optional()
    }) satisfies z.ZodType<RouteModule>
    
    // just in case name format is needed
    const routes: Record<string, RouteModule> = {}
    Object.keys(handlers).forEach(route => {
      const routeModule = routeModSchema.safeParse(handlers[route])

      if (routeModule.success) {
        routes[route] = routeModule.data
      }
    })

    return routes
  },
  adaptorFn({ config, preparedContext, router }) {
    const server = fastify({
      logger: {
        level: config.logLevel
      }
    })

    Object.keys(router).forEach(route => {
      server.route({
        method: router[route]?.meta?.method || 'GET',
        url: `/${route}`,
        async handler(req, res) {
          const fn = router[route].default
          const result = await fn({ ...preparedContext })

          res.send(result)
        }
      })
    })

    server.listen({
      port: config.port
    })
  },
}