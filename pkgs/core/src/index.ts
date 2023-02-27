import type { A } from "ts-toolbelt"

export type RouteLike<AdaptorContext = unknown> = {
  handle: (context: AdaptorContext) => unknown | Promise<unknown>
}

export type SubmoduleArgs = {
  cwd: string,
  config: string,
  routeDir: string,
  dev: boolean
}

export type Submodule<
  Config = unknown,
  Services = unknown,
  Context = unknown,
  RouteModule = unknown,
  Route extends RouteLike<Context> = RouteLike<Context>,
  Router extends Record<string, Route> = Record<string, Route>> = A.Compute<{
    submodule?: {
      appName?: string
      appVersion?: string
      buildNumber?: string
      gitCommit?: string

      traceEnabled?: boolean
      otlpUrl?: string
    }
    loaders?: {
      moduleLoader?: (input: { config: Config, submoduleArg: SubmoduleArgs }) => Promise<Record<string, RouteModule>>
    }
    createConfig?(): A.Compute<Config> | Promise<A.Compute<Config>>
    createServices?(input: { config: A.Compute<Config> }): A.Compute<Services> | Promise<A.Compute<Services>>
    createRoute?(input: { config: Config, services: Services, routeModule: RouteModule, routeName: string }): Promise<Route> | Route
    createRouter?(input: { config: A.Compute<Config>, services: A.Compute<Services>, routeModules: Record<string, Route> }): Router | Promise<Router>
    createCommands?(input: { config: Config, services: A.Compute<Services>, router: Router, commandArgs: string[] }): void | Promise<void>
  }>