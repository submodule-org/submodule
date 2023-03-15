import type { TodoApp } from "../submodule.types"
import type { Todo } from "../services/todo.service"

export default {
  handle: async ({ services, input }) => {
    const todoId = await services.todoService.addTodo({ value: input.value })
    return { id: todoId }
  },
  meta: {
    method: 'POST'
  }
} satisfies TodoApp.Definition<Omit<Todo, 'id'>>