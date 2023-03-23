import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"

import { Hono } from "hono"
import { serve } from '@hono/node-server'

import type { TodoApp } from "./submodule.types"
import type { Submodule } from "@submodule/cli"

const debugRuntime = require('debug')('todo.runtime')
const debugSetup = require('debug')('todo.setup')

export default {
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
      async handle(context: TodoApp.Context) {
        debugRuntime('incoming request %O', context.honoContext.req)
        
        const body = context.honoContext.req.body && await context.honoContext.req.json()
        const query = context.honoContext.req.queries()

        // non-optimized implementation, very idiomatic, JSON oriented
        const input = {
          ...body,
          ...query
        }

        const { default: route } = routeModule as TodoApp.RouteModule

        const result = await route.handle({ services, context, input })
        debugRuntime('actualized value %O', result)

        // error will likely to be handled by hono
        return context.honoContext.json(result)
      },
      routeModule,
      routeName
    }
  },

  async createCommands({ config, router }) {
    const port = config.honoConfig?.port || 3000

    const app = new Hono()

    for (const routeKey in router) {
      const route = router[routeKey]
      debugSetup('adding new route %s, %O', route.routeName, route?.routeModule.default.meta?.method || 'GET')

      const method = !route?.routeModule.default.meta?.method
        ? undefined
        : Array.isArray(route?.routeModule.default.meta?.method)
          ? route?.routeModule.default.meta?.method
          : [route?.routeModule.default.meta?.method]

      app.on(
        method || ['GET'],
        '/' + route.routeName,
        (context) => {
          debugRuntime('incoming request to path %s', context.req.url)
          return route.handle({ honoContext: context }) as any
        }
      )
    }

    serve({
      fetch: app.fetch,
      port
    })

    console.log('Server is listening at port', port)
  }
// } satisfies TodoApp.TodoSubmodule
} satisfies TodoApp.TodoSubmodule
