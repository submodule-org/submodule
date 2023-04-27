import { defineRoute } from "../submodule"
import type { Todo } from "../services/todo.service"

export const handle = defineRoute(async (services, input: Omit<Todo, 'id'>) => {
  return services.todoService.addTodo(input)
})