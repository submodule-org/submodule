import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"
import createDebug from "debug"

import { Context } from "hono"
import { combine, create, from, inferProvide } from "@submodule/core"

const debugSetup = createDebug('todo.setup')

export const config = create(() => {
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
})

export const levelDb = create(
  (config) => createDb(config.levelConfig), 
  config
)

export const todo = create(db => createService({ db }), levelDb)

export const services = combine({ levelDb, todo })
export type Services = inferProvide<typeof services>

type Handler = (services: Services, ctx: Context) => Promise<Response>

export const createRoute = from(services)
  .provide((services) => {
    return (handler: Handler) => {
      return (ctx: Context) => {
        return handler(services, ctx)
      }
    }
  })

export const route = (handler: Handler) => {
  return from(createRoute).provide((x) => x(handler))
}

type Meta = {
  methods?: ['GET' | 'POST' | 'PUT']
}

export const defineMeta = (meta: Meta) => { return meta }

export type Route = {
  handle: ReturnType<typeof route>
  meta?: Meta
}