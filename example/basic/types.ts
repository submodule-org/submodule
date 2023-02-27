export type Services = {
  test: () => any
}

export type Context = {}

export type RouteFn<Param = any> = (context: Param) => unknown | Promise<unknown>
export type RouteDef = {
  handle: (param: any) => ReturnType<RouteFn>
}

export type Router = Record<string, RouteDef>