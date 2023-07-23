import { combine, template } from "@submodule/core"
import { Context } from "hono"

import { level } from "./services/level.client"
import { todo } from "./services/todo.service"

export const services = combine({ level, todo })

type RouteFn = (context: Context) => (Response | Promise<Response>)
export const route = template(services)<RouteFn>

type Meta = {
  methods?: ['GET' | 'POST' | 'PUT']
}

export const defineMeta = (meta: Meta) => { return meta }

export type Route = {
  handle: RouteFn
  meta?: Meta
}