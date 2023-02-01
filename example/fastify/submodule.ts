import pino from "pino"
import { Builder } from "@submodule/cli"
import { z } from "zod"
import { Config, Context, PreparedContext, RouteMeta, Router } from "./types"
import fastify from "fastify"

export default Builder.new({
  appName: 'submodule-fastify'
})
  .setConfigFn<Config>(() => {
    const configSchema = z.object({
      port: z.number().default(3000),
      logLevel: z.literal("fatal")
        .or(z.literal("error"))
        .or(z.literal("warn"))
        .or(z.literal("info"))
        .or(z.literal("debug"))
        .or(z.literal("trace"))
        .default('info')
    }) satisfies z.ZodType<Config>

    return configSchema.parse({
      port: process.env.PORT,
      logLevel: process.env.LOG_LEVEL
    })
  })
  .setPreparedContextFn<PreparedContext>(async ({ config }) => {
    return {
      logger: pino({ level: config.logLevel })
    }
  })
  .setHandlerFn<Context, Router>(async ({ handlers, preparedContext }) => {
    const metaSchema = z.object({
      websocket: z.boolean().optional(),
      path: z.string().optional(),
      method: z.array(z.literal('GET').or(z.literal('POST').or(z.literal('PUT'))))
    }) satisfies z.ZodType<RouteMeta>

    const routeModSchema = z.object({
      default: z.function(),
      meta: metaSchema.optional()
    })

    // just in case name format is needed
    const routes: Router = {}
    Object.keys(handlers).forEach(route => {
      const routeModule = routeModSchema
        .passthrough().safeParse(handlers[route])

      if (routeModule.success) {
        const routeHandler = routeModule.data.default

        routes[route] = {
          handle: ({ request }) => {
            const param = Object.assign({}, request.query, request.body)

            return routeHandler(preparedContext, param)
          },
          meta: routeModule.data.meta
        }
      }
    })

    return routes
  })
  .setAdaptorFn<Router>(async ({ config, preparedContext, router }) => {
    const server = fastify({
      logger: preparedContext.logger
    })

    Object.keys(router).forEach(route => {
      server.route({
        method: router[route]?.meta?.method || 'GET',
        url: `/${route}`,
        async handler(req, res) {
          const result = await router[route].handle({ request: req, response: res })
          res.send(result)
        }
      })
    })

    server.listen({
      port: config.port
    })
  })
  .build()