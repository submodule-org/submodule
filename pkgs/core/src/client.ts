import { DefaultRouteModule, RouteLike, SubmoduleInstance } from "./index";

export const submoduleSymbol = Symbol.for('submodule')

function setClient(_submoduleInstance: SubmoduleInstance) {
  global[submoduleSymbol] = _submoduleInstance
}

function getClient<
  Config = unknown,
  Services = unknown,
  Context = unknown,
  RouteModule = DefaultRouteModule<unknown, unknown, Config, Services, Context>,
  Route extends RouteLike<Context> = RouteLike<Context>,
  Router extends Record<string, Route> = Record<string, Route>
>(): SubmoduleInstance<Config, Services, Context, RouteModule, Route, Router> {
  if (!global[submoduleSymbol]) throw new Error(`submodule isn't ready`)

  return global[submoduleSymbol]
}

export { getClient, setClient }