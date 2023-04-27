import { IOExtractor, builder, ExtractRouteFn } from "@submodule/core";
import { todoService, TodoService } from "./services/todo.service"

type Services = { todoService: TodoService }
type RouteFn<Input = any, Output = unknown> = (services: Services, input: Input) => Output | Promise<Output>

type RouteModule = Promise<{
  default: RouteFn
}>

interface RouteFnExtractor extends ExtractRouteFn<RouteModule> {
  routeFn: Awaited<this['routeModule']>['default']
}

interface Extractor extends IOExtractor<Promise<RouteModule>> {
  input: Parameters<Awaited<this['routeModule']>['default']>[1]
  output: Awaited<ReturnType<Awaited<this['routeModule']>['default']>>
}

const routes = {
  addTodo: import('./routes/addTodo'),
  listTodo: import('./routes/listTodo'),
}

const sb = builder()
  .init<typeof routes>()
  .routes<typeof routes>()
  .services<Services>()
  .routeModule<RouteModule, RouteFnExtractor>()

export const defineRoute = sb.defineRouteFn

export const caller = sb.createExecutable<Extractor>({
  async createServices() {
    return { todoService }
  },

  async loadRouteModule({ initArgs, query }) {
    return initArgs[query]
  },

  async execute({ route: promiseRoute, input, services }) {
    const route = await promiseRoute
    return route.default(services, input)
  }

} satisfies typeof sb.executableSubmodule, routes)
