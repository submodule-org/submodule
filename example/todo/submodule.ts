import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"

import { Hono } from "hono"
import { serve } from '@hono/node-server'

import type { TodoApp } from "./submodule.types"

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

  async createServices({ config }) {
    const db = await createDb(config.levelConfig)
    const todoService = createService({ db })

    debugSetup('actual services %O', { db, todoService })
    return {
      db, todoService
    }
  },

  async createRoute({ config, services, routeModule }) {
    return {
      async handle(context) {
        debugRuntime('incoming request %O', context.honoContext.req)
        const input = context.honoContext.req.query()
        
        const { default: fn } = routeModule

        const result = await fn({ config, services, context, input })
        debugRuntime('actualized value %O', result)

        return context.honoContext.json(result)
      },
      meta: routeModule.meta
    }
  },

  async createCommands({ config, router }) {
    const port = config.honoConfig?.port || 3000

    const app = new Hono()

    for (const routeKey of Object.keys(router)) {
      const route = router[routeKey]
      debugSetup('adding new route %O', route)
      
      app.on([route?.meta || 'GET'], '/' + routeKey, (context) => route.handle({ honoContext: context}) as any)
    }

    app.on(['GET'], '/routes', c => c.text(JSON.stringify(router)))

    serve({ 
      fetch: app.fetch,
      port
    })

    console.log('Server is listening at port', port)
  }
  
} satisfies TodoApp.TodoSubmodule

export default submodule