import type { Submodule, DefaultRouteModule, RouteLike, ArgShape, OptShape } from "@submodule/cli";

export declare namespace CliApp {
  type Config = { demoName: string, demoPort: number }
  type Services = {}
  type Context = { args: string[], opts: Record<string, string> }

  type RouteModule<Input = unknown, Output = unknown> = DefaultRouteModule<Input, Output, Config, Services, Context> & { args?: ArgShape[], options?: OptShape[], description?: string }
  type Route = RouteLike<Context> & { args?: ArgShape[], options?: OptShape[], description?: string }

  type RouteFn = RouteModule['default']

  type CliSubmodule = Submodule<Config, Services, Context, RouteModule, Route>
}