import { Logger, Level } from "pino"

export type Config = {
  port?: number,
  logLevel?: Level
}

export type PreparedContext = {
  logger: Logger
}

export type RouteMeta = {
  method: Array<'POST' | 'GET' | 'PUT'>
  path?: string
  websocket?: boolean
}

export type RouteFn<Param> = (context: Context, param: Param) => Promise<any> | any

export type RouteModule<Param = any> = {
  meta?: RouteMeta
  handle: RouteFn<Param>
}

export type Context = PreparedContext & {}