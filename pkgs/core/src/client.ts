import type { DefaultRouteModule, RouteLike, Submodule, SubmoduleInstance } from "./";
import type { O, S, Any } from "ts-toolbelt"
import { inferSubmodule } from ".";

export const INSTANCE_KEY = Symbol.for('_submodule_')

export type Caller<
  Router extends Record<string, unknown> = Record<string, unknown>,
  Context = unknown,
  Extractor extends string = 'default',
> = (submodule: Submodule<unknown, unknown, Context>) => <
  Query extends keyof Router = keyof Router
> (entry: Query, context: Context) => Promise<inferReturnType<O.Path<Router, S.Split<`${Any.Cast<Query, string>}.${Extractor}`, '.'>>>>

type inferReturnType<T> = T extends () => infer R
  ? R extends Promise<infer A> ? A : R
  : never

const debug = require('debug')('submodule.client')

function getInstance<
  Config = unknown,
  Services = unknown,
  Context = unknown,
  RouteModule = DefaultRouteModule<unknown, unknown, Config, Services, Context>,
  Route extends RouteLike<Context, RouteModule> = RouteLike<Context, RouteModule>,
  Router extends Record<string, Route> = Record<string, Route>
>(): SubmoduleInstance<Config, Services, Context, RouteModule, Route, Router> {
  debug('trying to retrieve instance')

  if (!global[INSTANCE_KEY]) {
    debug(`couldn't figure out current module, creating a new one`)
    throw new Error('submodule is yet initialized')
  }

  return global[INSTANCE_KEY]
}

function createCaller<
  Router extends Record<string, any>,
  S extends Submodule<any, any, any, any, any, any> = Submodule,
  Extractor extends string = 'default',
  T extends inferSubmodule<S> = inferSubmodule<S>
>(
  caller: (submodule: SubmoduleInstance<T['config'], T['services'], T['context']>, query: string, context: unknown) => Promise<any>,

): ReturnType<Caller<Router, T['context'], Extractor>> {
  return async (query, context) => {
    const instance = getInstance() as any

    return caller(instance, String(query), context)
  }
}


export { createCaller }