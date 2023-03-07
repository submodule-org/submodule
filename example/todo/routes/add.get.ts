import type { TodoApp } from "../submodule.types"

const fn: TodoApp.RouteFn<{ value: string}> = async ({ services, input }) => {
  const todoId = await services.todoService.addTodo({ value: input.value })
  return { id: todoId }
}

export default fn

export const meta: TodoApp.RouteMeta = "GET"