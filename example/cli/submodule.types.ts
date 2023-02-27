import type { Submodule, DefaultRouteModule, RouteLike } from "@submodule/cli";
import { Argument, Command, Option } from "commander";

export declare namespace CliApp {
  type Config = { demoName: string, demoPort: number }
  type Services = {}
  type Context = { args: string[], options: Record<string, string> }

  type RouteModule<Input = unknown, Output = unknown> = DefaultRouteModule<Input, Output, Config, Services, Context> & { args?: Argument[], options?: Option[] }
  type Route = RouteLike<Context> & { args?: Argument[], options?: Option[] }

  type RouteFn = RouteModule['default']

  type CliSubmodule = Submodule<Config, Services, Context, RouteModule, Route>
}