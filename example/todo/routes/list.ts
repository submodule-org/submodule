import { Todo } from "../services/todo.service"
import type { TodoApp } from "../submodule.types"

const fn: TodoApp.RouteFn<undefined, Todo[]> = ({ services }) => {
  return services.todoService.listTodos()
}

export default fn

export const meta: TodoApp.RouteMeta = "GET"