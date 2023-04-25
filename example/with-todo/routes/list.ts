import { Todo } from "../services/todo.service"
import { defineRoute } from "../submodule.types"

export const handle = defineRoute(async (services) => {
  return services.todoService.listTodos()
})