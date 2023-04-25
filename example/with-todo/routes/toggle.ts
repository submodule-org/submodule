import type { TodoApp } from "../submodule.types"

export default {
  handle: async ({ services, input }) => {
    await services.todoService.toggleTodo(input.id)
    return services.todoService.getTodo(input.id)
  },
  meta: {
    method: 'PUT'
  }
} satisfies  TodoApp.Definition<{ id: string }>