import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"
import createDebug from "debug"

import { Context } from "hono"
const debugSetup = createDebug('todo.setup')
import { prepareExecutable } from "@submodule/core"

export const configor = prepareExecutable({
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
  }
})

export const levelDb = prepareExecutable({
  async createServices({ initArgs }) {
    return await createDb(initArgs.levelConfig)
  },
}, { 
  initArgs: configor.config 
})

export const todo = prepareExecutable({

  async createServices({ initArgs: db }) {
    return createService({ db })
  },
}, { 
  initArgs: levelDb.services 
})

type Meta = {
  methods?: ['GET' | 'POST' | 'PUT']
}

export const route = todo.prepare<Context, Response>
export const defineMeta = (meta: Meta) => { return meta }

export type Route = {
  handle: ReturnType<typeof route>
  meta?: Meta
}