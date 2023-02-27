import { Submodule, RouterLike } from "@submodule/cli"
import { } from "@submodule/cli"
import { Level } from "level"
import type { LevelConfig } from "./services/level.client"
import type { TodoService } from "./services/todo.service"

export declare module TodoApp {
  type TodoServices = {
    db: Level
    todoService: TodoService
  }

  type RouteFn = (services: TodoServices, input?: unknown) => Promise<unknown>
  type RouteModule = {
    default: RouteFn
  }

  type TodoAppRouter = RouterLike<RouteModule>

  

  type TodoModuleConfig = {
    levelConfig: LevelConfig
  }

  type TodoSubmodule = Submodule<TodoModuleConfig, TodoServices>
}
