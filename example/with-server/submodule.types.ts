import { typeBuilder } from "@submodule/core"
import { FastifyRequest, FastifyReply, HTTPMethods } from "fastify"

type Config = { port: number }
type Services = {}
type RequestContext = { req: FastifyRequest, rep: FastifyReply }
type HandleFunction<Output = unknown> = (handleParam: RequestContext) => Output | Promise<Output> | void
type RouteMeta = { methods: HTTPMethods | HTTPMethods[] }

const type = typeBuilder
  .config<Config>()
  .services<Services>()
  .context<RequestContext>()
  .routeModule<{
    default: HandleFunction
    meta?: RouteMeta
  }, 'default'>()

export const defineRoute = type.defineRouteFn
export type Submodule = typeof type.serverSubmodule