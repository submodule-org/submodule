export type RouteLike<AdaptorContext = unknown> = {
  handle: (context: AdaptorContext) => unknown | Promise<unknown>
}

export type RouterLike<
  AdaptorContext = unknown, 
  Route extends RouteLike<AdaptorContext> = RouteLike<AdaptorContext>
> = Record<string, Route>

export type Submodule<
  Config = unknown,
  PreparedContext = unknown,
  Context = unknown,
  Router extends RouterLike<Context> = RouterLike<Context>> = {
  submodule?: SubmoduleConfig
  configFn?(): Config | Promise<Config>
  preparedContextFn?(input: { config: Config }): PreparedContext | Promise<PreparedContext>
  handlerFn?(input: { config: Config, preparedContext: PreparedContext, handlers: Record<string, unknown> }): Router | Promise<Router>
  adaptorFn?(input: { config: Config, preparedContext: PreparedContext, router: Router }): Promise<void>
}

export type SubmoduleConfig = {
  appName?: string
  appVersion?: string
  buildNumber?: string
  gitCommit?: string

  traceEnabled?: boolean
  otlpUrl?: string
}