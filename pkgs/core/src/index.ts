export type PromiseFn<T = any> = (...args: any[]) => Promise<T> | T

type ExecutableRoute = {
  handle: (...args: any) => any
} | ((...args: any[]) => any)

export type Submodule<Config = any, PreparedContext = any, Context = any, RouteDef extends ExecutableRoute = any> = {
  submodule?: SubmoduleConfig
  configFn?(): Config | Promise<Config>
  preparedContextFn?(input: { config: Config }): Promise<PreparedContext>
  handlerFn?(input: { config: Config, preparedContext: PreparedContext, handlers: Record<string, unknown> }): Promise<Record<string, RouteDef>>
  adaptorFn?(input: { config: Config, preparedContext: PreparedContext, router: Record<string, RouteDef>, execute: (input: () => any) => void}): Promise<void>
}

export type SubmoduleConfig = {
  appName?: string
  appVersion?: string
  buildNumber?: string
  gitCommit?: string

  traceEnabled?: boolean
  otlpUrl?: string
}