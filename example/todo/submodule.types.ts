import type { Submodule, DefaultRouteModule, RouteLike } from "@submodule/cli"
import type { RestSubmodule } from "@submodule/receipe-rest"

import { Level } from "level"
import type { LevelConfig } from "./services/level.client"
import type { TodoService } from "./services/todo.service"
import type { Context as HonoContext } from "hono"

export declare module TodoApp {
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

  type CallContext = { context: Context, services: Services}

  type Definition<Input = unknown, Output = unknown> = RestSubmodule.RestRouteModule<CallContext, Input, Output>

  type RouteModule<Input = unknown, Output = unknown> = {
    default: Definition<Input, Output>
  }
  
  type TodoSubmodule = Submodule<Config, Services, Context, RouteModule>
}
