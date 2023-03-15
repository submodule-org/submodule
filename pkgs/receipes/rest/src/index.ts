import type { RouteLike, Submodule, DefaultHandleFn } from "@submodule/cli"

export declare module RestSubmodule {

  type RestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTION'

  type RestRouteMeta = {
    method?: RestMethod | RestMethod[]
  }

  type RestRouteModule<CallContext = unknown, Input = unknown, Output = unknown> = {
    meta?: RestRouteMeta
    handle: DefaultHandleFn<CallContext, Input, Output>
  }

  type RestRoute<Context, Input = unknown, Output = unknown> = RouteLike<Context, RestRouteModule<Context, Input, Output>>

}
