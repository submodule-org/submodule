import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"

import { Hono } from "hono"
import { serve as honoServe } from '@hono/node-server'

const debugRuntime = require('debug')('todo.runtime')
const debugSetup = require('debug')('todo.setup')

import { ExtractRouteFn, builder } from "@submodule/core"

import { Level } from "level"
import type { LevelConfig } from "./services/level.client"
import type { TodoService } from "./services/todo.service"
import type { Context as HonoContext } from "hono"

type Config = {
  levelConfig: LevelConfig
  honoConfig?: { port: number }
}

type Services = {
  db: Level
  todoService: TodoService
}

type Context = {
  honoContext: HonoContext
}

type RouteModule<Input = any, Output = unknown> = {
  handle: (context: Services, input: Input) => Promise<Output>
  meta?: {
    path?: string
    method?: 'POST' | 'GET' | 'PUT' | 'DELETE'
    isWebsocket?: boolean
  }
}

interface RouteFnExtractor extends ExtractRouteFn<RouteModule> {
  routeFn: this['routeModule']['handle']
}

const sb = builder()
  .config<Config>()
  .services<Services>()
  .context<Context>()
  .routeModule<RouteModule, RouteFnExtractor>()

export const defineRoute = sb.defineRouteFn
export const defineMeta = (meta: RouteModule['meta']) => meta

sb.serve({
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
      list: await import('./routes/list'),
      toggle: await import('./routes/toggle')
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

        const query = context.honoContext.req.queries()

        // non-optimized implementation, very idiomatic, JSON oriented
        const input = {
          ...context.honoContext.req.body,
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
})