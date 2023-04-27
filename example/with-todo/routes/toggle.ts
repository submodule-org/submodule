import { Todo } from "../services/todo.service"
import { defineRoute, defineMeta } from "../submodule"

export const handle = defineRoute(async (services, input: Todo) => {
  await services.todoService.toggleTodo(input.id)
  return services.todoService.getTodo(input.id)
})

export const meta = defineMeta({ 
  method: 'PUT'
})