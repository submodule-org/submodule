import type { TodoApp } from "../submodule.types"

const fn: TodoApp.RouteFn<{ id: string }> = async ({ services, input }) => {
  await services.todoService.toggleTodo(input.id)
  return services.todoService.getTodo(input.id)
}

export default fn

export const meta: TodoApp.RouteMeta = "GET"