import type { A } from "ts-toolbelt"
import type { WatchOptions } from "chokidar"

export type RouteLike<AdaptorContext = unknown> = {
  handle: (context: AdaptorContext) => unknown | Promise<unknown>
}

export type SubmoduleArgs = {
  cwd: string,
  config: string,
  routeDir: string,
  dev: boolean,
  nowatch?: string
}

export type DefaultRouteModule<
  Input = unknown,
  Output = unknown,
  Config = unknown,
  Services = unknown,
  Context = unknown
>  = {
  default: (input: A.Compute<{ config: Config, services: Services, context: Context, input: Input }>) => Output | Promise<Output>
}

export type ArgShape = {
  name: string
  description?: string
  required?: boolean
  defaultValue?: string
  value?: string
}

export type OptShape = {
  name: string
  shortName?: string
  required?: boolean
  defaultValue?: string
  value?: string
}

export type Action = (input: { subCommand: string, args: string[], opts: Record<string, string> }) => void | Promise<void>

export type CommandShape = {
  description?: string
  args?: A.Compute<Omit<ArgShape, 'value'>>[]
  opts?: A.Compute<Omit<OptShape, 'value'>>[]
  action: Action
}

export type Commands = Record<string, CommandShape | Action>

export type Submodule<
  Config = unknown,
  Services = unknown,
  Context = unknown,
  RouteModule = DefaultRouteModule<unknown, unknown, Config, Services, Context>,
  Route extends RouteLike<Context> = RouteLike<Context>,
  Router extends Record<string, Route> = Record<string, Route>> = A.Compute<{
    submodule?: {
      appName?: string
      appVersion?: string
      buildNumber?: string
      gitCommit?: string

      chokidarOptions?: WatchOptions
      traceEnabled?: boolean
      otlpUrl?: string
    }
    loaders?: {
      moduleLoader?: (input: { config: Config, submoduleArg: SubmoduleArgs }) => Promise<Record<string, RouteModule>>
    }
    createConfig?: () => A.Compute<Config> | Promise<A.Compute<Config>>
    createServices?: (input: { config: A.Compute<Config> }) => A.Compute<Services> | Promise<A.Compute<Services>>
    createRoute?: (input: { config:  A.Compute<Config>, services: Services, routeModule:  A.Compute<RouteModule>, routeName: string }) => Promise<Route> | Route
    createRouter?: (input: { config: A.Compute<Config>, services: A.Compute<Services>, routeModules: Record<string, Route> }) => Router | Promise<Router>
    createCommands?: (input: { config:  A.Compute<Config>, services: Services, router:  A.Compute<Router>, subCommand?: string, commandArgs: string[], submoduleArgs: A.Compute<SubmoduleArgs> }) => (void | Commands) | Promise<void | Commands>
  }>