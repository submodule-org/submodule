import { serve as honoServe } from '@hono/node-server'
import { execute } from "@submodule/core"
import createDebug from "debug"
import { Hono } from "hono"

import { config } from "./config"
import { Route } from "./router"

const debugRuntime = createDebug('todo.runtime')

execute(async (config) => {
  const port = config.honoConfig?.port || 3000

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
        debugRuntime('incoming request to path %s - %s', context.req.method, context.req.url)

        return await route.handle(context)
      }
    )
  }

  honoServe({
    fetch: app.fetch,
    port
  })

  console.log('Server is listening at port', port)
}, config)