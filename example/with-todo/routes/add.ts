import { route } from "../router"
import type { Todo } from "../services/todo.service"

export const handle = route(async (services, context) => {
  const { value } = context.req.query()

  const todo: Omit<Todo, 'id'> = { value }

  return context.json(await services.todo.addTodo(todo))
})