import { typeBuilder } from "@submodule/core"

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

const type = typeBuilder
  .config<Config>()
  .services<Services>()
  .context<Context>()
  .routeModule<RouteModule, 'handle'>()

export type Submodule = typeof type.serverSubmodule
export const defineRoute = type.defineRouteFn
export const defineMeta = (meta: RouteModule['meta']) => meta