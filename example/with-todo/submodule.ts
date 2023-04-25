import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"

import { serve } from "@submodule/core"
import { Hono } from "hono"
import { serve as honoServe } from '@hono/node-server'

import type { Submodule } from "./submodule.types"

const debugRuntime = require('debug')('todo.runtime')
const debugSetup = require('debug')('todo.setup')

const submodule = {
  createConfig() {
    const config = {
      levelConfig: {
        name: 'todo.level'
      },
      honoConfig: {
        port: 3000
      }
    }
    debugSetup('actual config value %O', config)
    return config
  },

  async loadRouteModules() {
    return {
      add: await import('./routes/add'),
      list: await import('./routes/list')
    }
  },

  async createServices({ config }) {
    const db = await createDb(config.levelConfig)
    const todoService = createService({ db })

    debugSetup('actual services %O', { db, todoService })
    return {
      db, todoService
    }
  },

  async createRoute({ services, routeModule, routeName }) {
    return {
      async handle(context) {
        debugRuntime('incoming request %O', context.honoContext.req)
        
        const body = context.honoContext.req.body && await context.honoContext.req.json()
        const query = context.honoContext.req.queries()

        // non-optimized implementation, very idiomatic, JSON oriented
        const input = {
          ...body,
          ...query
        }

        const { handle } = routeModule

        const result = await handle(services, input)
        debugRuntime('actualized value %O', result)

        // error will likely to be handled by hono
        return context.honoContext.json(result)
      },
      routeModule,
      routeName
    }
  },

  async serve({ config, router }) {
    const port = config.honoConfig?.port || 3000

    const app = new Hono()

    for (const routeKey in router) {
      const route = router[routeKey]
      debugSetup('adding new route %s, %O', route.routeName, route?.routeModule.meta?.method || 'GET')

      const method = route?.routeModule.meta?.method || "GET"

      app.on(
        [method],
        '/' + route.routeName,
        (context) => {
          debugRuntime('incoming request to path %s', context.req.url)
          return route.handle({ honoContext: context }) as any
        }
      )
    }

    honoServe({
      fetch: app.fetch,
      port
    })

    console.log('Server is listening at port', port)
  }
} satisfies Submodule

serve(submodule)