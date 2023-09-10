import { execute } from "@submodule/core"
import { Hono } from "hono"

import { config } from "./config"
import { Route } from "./router"

export default await execute(async (config) => {
  const port = config.honoConfig.port

  const app = new Hono()

  const router: Record<string, Route> = {
    add: await import('./routes/add'),
    list: await import('./routes/list'),
    toggle: await import('./routes/toggle'),
  }

  for (const routeKey in router) {
    const route = router[routeKey]
    const methods = route.meta?.methods || ['GET']
    app.on(
      methods,
      '/' + routeKey,
      async (context) => {
        console.log('incoming request to path %s - %s', context.req.method, context.req.url)
        return await route.handle(context)
      }
    )
  }

  console.log('hono will be listening at port', port)

  return {
    port,
    fetch: app.fetch
  }
}, config)