import { Logger, Level } from "pino"
import type { FastifyRequest, FastifyReply } from "fastify"

export type Config = {
  port?: number,
  logLevel?: Level
}

export type PreparedContext = {
  readonly logger: Logger
}

export type RouteMeta = {
  method: Array<'POST' | 'GET' | 'PUT'>
  path?: string
  websocket?: boolean
}

export type Context = FastifyParam & PreparedContext
export type RouteFn<Param = unknown> = (context: Context, param: Param) => Promise<any> | any

type FastifyParam = {
  request: FastifyRequest
  response: FastifyReply
}

export type RouteModule = {
  meta?: RouteMeta
  handle: (param: FastifyParam) => ReturnType<RouteFn<any>>
}

export type Router = Record<string, RouteModule>
