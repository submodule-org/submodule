import { builder } from "@submodule/core";
import { todoService, TodoService } from "./services/todo.service"
import { promiseDefaults } from "@submodule/receipes"

type Services = { todoService: TodoService }

const routes = {
  addTodo: import('./routes/addTodo'),
  listTodo: import('./routes/listTodo'),
}

const sb = builder()
  .init<typeof routes>()
  .routes<typeof routes>()
  .services<Services>()
  .routeModule<
    promiseDefaults.RouteModule<Services>, 
    promiseDefaults.RouteFnExtractor<Services>
  >()
  .extractor<promiseDefaults.InputOutputExtractor<Services>>()

export const defineRoute = sb.defineRouteFn

export const caller = sb.createExecutable({
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

}, routes)
