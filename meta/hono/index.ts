import { Hono } from "hono"
import { serve } from '@hono/node-server'

import { combine, value, type Executor, scoper, group, create } from "@submodule/core"
import { createLogger } from "@submodule/meta-pino"

export type Options = Omit<Parameters<typeof serve>[0], "fetch">

type HonoConfig = {
  port: number
}

const defaultLogger = createLogger("hono")
const defaultConfig = value<Options>({
  port: 4000
})
const defaultRoutes = value<Hono[]>([])

export const server = create(async ({ config, routes, logger, scoper }) => {
  const hono = new Hono()

  logger.debug("starting web server...")
  if (routes.length === 0) {
    logger.warn("no routes registered, will not start server")
    return
  }

  for (const route of routes) {
    logger.debug({ routeDetail: route.routes }, "registering route")
    hono.route("/", route)
  }

  logger.info({ port: config.port }, "starting hono server")
  const server = serve({
    port: config.port,
    fetch: hono.fetch
  }, () => {
    logger.info("server started")
  })

  scoper.addDefer(async () => {
    logger.info("shutting down server...")
    server.close()
  })

  return new Promise(() => server)
}, combine({ scoper, config: defaultConfig, routes: defaultRoutes, logger: defaultLogger }))

export function setConfig(uc: HonoConfig | Executor<HonoConfig>) {
  server.patch(defaultConfig, uc)
}

export const startServer = (config: HonoConfig | Executor<HonoConfig>, ...routes: Array<Executor<Hono<any, any, any>>>) => {
  const _routes = group(...routes)
  server.patch(defaultRoutes, _routes)
  server.patch(defaultConfig, config)

  return server
}