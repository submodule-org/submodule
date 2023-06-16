import { defineMeta, route } from "../router"

export const handle = route(async (services, context) => {
  const id = context.req.query('id')

  await services.todo.toggleTodo(id as string)
  return context.json(await services.todo.getTodo(id as string))
})

export const meta = defineMeta({ methods: ['POST'] })