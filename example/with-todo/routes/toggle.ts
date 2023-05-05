import { defineMeta, route } from "../submodule"

export const handle = route(async ({ services }, context) => {
  const id = context.req.query('id')

  await services.todoService.toggleTodo(id as string)
  return context.json(await services.todoService.getTodo(id as string))
})

export const meta = defineMeta({ methods: ['POST'] })