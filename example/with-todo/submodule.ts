import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"
import createDebug from "debug"

import { Context } from "hono"
const debugSetup = createDebug('todo.setup')
import { prepareExecutable } from "@submodule/core"

export const { execute, prepare } = prepareExecutable({
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
}, { eager: false, initArgs: undefined })

type Meta = {
  methods?: ['GET' | 'POST' | 'PUT']
}

export const route = prepare<Context, Response>
export const defineMeta = (meta: Meta) => { return meta }

export type Route = {
  handle: ReturnType<typeof route>
  meta?: Meta
}