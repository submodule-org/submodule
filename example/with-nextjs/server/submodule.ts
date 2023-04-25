import { IOExtractor, createExecutable, typeBuilder } from "@submodule/core";
import { todoService, TodoService } from "./services/todo.service"

type Services = { todoService: TodoService }
type RouteFn<Input = any, Output = unknown> = (services: Services, input: Input) => Output | Promise<Output>
type RouteModule = {
  default: RouteFn
}

const type = typeBuilder
  .services<Services>()
  .routeModule<RouteModule, 'default'>()

export const defineRoute = type.defineRouteFn

interface Extractor extends IOExtractor<Promise<RouteModule>> {
  input: Parameters<Awaited<this['routeModule']>['default']>[1]
  output: Promise<Awaited<ReturnType<Awaited<this['routeModule']>['default']>>>
}

const routes = {
  addTodo: import('./routes/addTodo'),
  listTodo: import('./routes/listTodo'),
}

export const caller = createExecutable<Extractor, typeof routes>({
  async createServices() {
    return { todoService }
  },

  async loadRouteModule({ query }) {
    return routes[query]
  },

  async execute({ route, input, services }) {
    return route.default(services, input)
  }

} satisfies typeof type.executableSubmodule)