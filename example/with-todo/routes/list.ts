import { defineRoute } from "../submodule"

export const handle = defineRoute(async (services) => {
  return services.todoService.listTodos()
})