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

export type RouteFn = (context: Context) => Promise<any> | any

export type RouteModule = {
  meta?: RouteMeta
  default: RouteFn
}

export type Context = PreparedContext & {}