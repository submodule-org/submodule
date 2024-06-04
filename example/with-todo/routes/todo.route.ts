import { create, group } from "@submodule/core"
import { Hono } from "hono"
import { todo } from "../services/todo.service"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"

export const toggle = create((todoSvc) => {
  return new Hono().post('/:id', async (context) => {
    const id = context.req.query('id')

    await todoSvc.toggleTodo(id as string)
    return context.json(await todoSvc.getTodo(id as string))
  })
}, todo)

export const add = create((todoSvc) => {
  return new Hono().post('/', zValidator('json', z.object({ value: z.string() })), async (context) => {
    const todo = context.req.valid('json')
    return context.json(await todoSvc.addTodo(todo))
  })
}, todo)

export const list = create((todoSvc) => {
  return new Hono().get('/todo', async (context) => {
    return context.json(await todoSvc.listTodos())
  })
}, todo)

export const routes = group(add, list, toggle)