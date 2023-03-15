import { Todo } from "../services/todo.service"
import type { TodoApp } from "../submodule.types"

export default {
  handle: async ({ services }) => {
    return services.todoService.listTodos()
  }
} satisfies TodoApp.Definition<undefined, Todo[]>