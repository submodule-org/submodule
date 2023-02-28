import type { Submodule, DefaultRouteModule, RouteLike } from "@submodule/cli"
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

  type RouteMeta = 'GET' | 'POST' | 'PUT'

  type RouteModule<Input = unknown, Output = unknown> = DefaultRouteModule<Input, Output, Config, Services, Context> & { meta?: RouteMeta }
  type Route = RouteLike<Context> & { meta?: RouteMeta }
  
  type RouteFn<Input = unknown, Output = unknown> = RouteModule<Input, Output>['default']

  type TodoSubmodule = Submodule<Config, Services, Context, RouteModule, Route>
}
