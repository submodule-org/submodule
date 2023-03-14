import type { DefaultRouteModule, RouteLike, Submodule, SubmoduleInstance } from "@submodule/cli";
import type { O, S, Any } from "ts-toolbelt"
import { cacheKey } from "@submodule/cli"

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

async function getInstance<
  Config = unknown,
  Services = unknown,
  Context = unknown,
  RouteModule = DefaultRouteModule<unknown, unknown, Config, Services, Context>,
  Route extends RouteLike<Context> = RouteLike<Context>,
  Router extends Record<string, Route> = Record<string, Route>
>(): Promise<SubmoduleInstance<Config, Services, Context, RouteModule, Route, Router>> {
  debug('trying to retrieve instance')

  if (!global[cacheKey]) {
    debug(`couldn't figure out current module, creating a new one`)
    throw new Error('submodule is yet initialized')
  }

  return global[cacheKey]
}

function createCaller<
  Router extends Record<string, any>,
  Context = unknown,
  Extractor extends string = 'default'
>(caller: (submodule: SubmoduleInstance<unknown, unknown, Context>, query: string, context: unknown) => Promise<any>): ReturnType<Caller<Router, Context, Extractor>> {
  return async (query, context) => {
    const instance = await getInstance() as any

    return caller(instance, String(query), context)
  }
}


export { getInstance, createCaller }