import type { TodoApp } from "../submodule.types"

const fn: TodoApp.RouteFn = ({ services }) => {
  return services.todoService.listTodos()
}

export default fn

export const meta: TodoApp.RouteMeta = "GET"