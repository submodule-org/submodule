import { route } from "../router"

export const handle = route(async (services, context) => {
  return context.json(await services.todo.listTodos())
})