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

export class Builder<
  Config = unknown,
  PreparedContext = unknown,
  Context = unknown,
  Router extends RouterLike<Context> = RouterLike<Context>
> {
  protected submodule?: SubmoduleConfig
  protected configFn?: Submodule['configFn']
  protected preparedContextFn?: Submodule['preparedContextFn']
  protected handlerFn?: Submodule['handlerFn']
  protected adaptorFn?: Submodule['adaptorFn']

  static new(config?: SubmoduleConfig) {
    const s = new Builder()
    s.submodule = config
    return s
  }

  setConfigFn<ConfigShape>(configFn: Submodule<ConfigShape>['configFn']): Omit<Builder<ConfigShape>, "setConfigFn"> {
    this.configFn = configFn
    return this as any
  }

  setPreparedContextFn<PreparedContextShape>(preparedContextFn: Submodule<Config, PreparedContextShape>['preparedContextFn']): Omit<Builder<Config, PreparedContextShape>, "setConfigFn" | "setPreparedContextFn"> {
    this.preparedContextFn = preparedContextFn
    return this as any
  }

  setHandlerFn<ContextShape, RouterShape extends RouterLike<ContextShape>>(handlerFn: Submodule<Config, PreparedContext, ContextShape, RouterShape>['handlerFn']): Omit<Builder<Config, PreparedContext, ContextShape, RouterShape>, "setConfigFn" | "setPreparedContextFn" | "setHandlerFn"> {
    this.handlerFn = handlerFn
    return this as any
  }

  setAdaptorFn<RouterShape extends RouterLike<Context>>(adaptorFn: Submodule<Config, PreparedContext, Context, RouterShape>['adaptorFn']): Omit<Builder<Config, PreparedContext, Context, RouterShape>, "setConfigFn" | "setPreparedContextFn" | "setHandlerFn" | "setAdaptorFn"> {
    this.adaptorFn = adaptorFn
    return this as any
  }

  build(): Submodule<Config, PreparedContext, Context, Router> {
    return {
      submodule: this.submodule,
      configFn: this.configFn,
      preparedContextFn: this.preparedContextFn,
      handlerFn: this.handlerFn,
      adaptorFn: this.adaptorFn,
    } as any
  }
}