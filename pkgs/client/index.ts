import type { Any, Object } from "ts-toolbelt"

export interface RouteType {
  routeName: unknown
  routeModule: unknown
}

export interface ToRouteType {
  routes: unknown
  routeType: RouteType
}

export type CreateRouteType<RouteName, RouteModule> = {
  routeName: RouteName
  routeModule: RouteModule
}

export type ObjectToRouteType<T> = {
  [key in keyof T]: CreateRouteType<key, T[key]>
}[keyof T]

type CallerFactory<
  Query extends string = string,
  Input = unknown,
  Output = unknown
> = (routeName: Query, input: Input) => Output

export interface IOExtractor<T = unknown> {
  routeModule: T
  input: unknown
  output: unknown
}

export function createClient<
  Route extends RouteType = RouteType,
  Extractor extends IOExtractor = IOExtractor
>(callerFactory: CallerFactory): <
  Query extends Route['routeName'],
  RouteModule extends Extract<Route, { routeName: Query }>,
  ExtractedIO extends Any.Compute<Extractor & RouteModule>,
> (
    query: Query,
    input: Any.Compute<ExtractedIO['input']>
  ) => ExtractedIO['output'] {
  return callerFactory as any
}
