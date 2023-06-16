import { combine } from "@submodule/core"
import { Context } from "hono"

import { level } from "./services/level.client"
import { todo } from "./services/todo.service"

export const services = combine({ level, todo })

export const route = services.prepare<[Context], Promise<Response>>

type Meta = {
  methods?: ['GET' | 'POST' | 'PUT']
}

export const defineMeta = (meta: Meta) => { return meta }

export type Route = {
  handle: ReturnType<typeof route>
  meta?: Meta
}