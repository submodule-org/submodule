import { route } from "../submodule"

export const handle = route(async (services, context) => {
  return context.json(await services.listTodos())
})