import { Route, config } from "./submodule"
import { Hono } from "hono"
import { serve as honoServe } from '@hono/node-server'
import createDebug from "debug"
import { from } from "@submodule/core"

const debugRuntime = createDebug('todo.runtime')

from(config)
  .execute(async (config) => {
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

          const routeHandler = await route.handle.execute()

          return routeHandler(context)
        }
      )
    }

    honoServe({
      fetch: app.fetch,
      port
    })

    console.log('Server is listening at port', port)
  })