import type { Any } from "ts-toolbelt"

export type Submodule<
  InitArgs = {},
  Config = {},
  Services = {}
> = Any.Compute<{

  init?: () => InitArgs | Promise<InitArgs>

  createConfig?: (createConfigParams?: {
    initArgs: InitArgs 
  }) => Config | Promise<Config>
  
  createServices?: (createServiceParams: {
    initArgs: InitArgs, 
    config: Config
  }) => Services | Promise<Services>
  
}, 'flat'>

export type ExecutableSubmodule<
  InitArgs = {},
  Config = {},
  Services = {},
  RouteModule = unknown,
  Input = unknown,
  Output = unknown
> = Submodule<InitArgs, Config, Services> & Any.Compute<{
  
  loadRouteModule?: (loadRouteModuleParams: { 
    initArgs: InitArgs,
    config: Config,
    query: string,
  }) => RouteModule | Promise<RouteModule> | undefined

  execute: (executeParams: {
    initArgs: InitArgs,
    config: Config,
    services: Services,
    route: RouteModule,
    query?: string,
    input?: Input
  }) => Promise<Output>

}, 'flat'>

export type RouteLike<Context = unknown, RouteModule = unknown> = {
  handle: (context: Context) => unknown | Promise<unknown>
  routeModule: RouteModule
  routeName: string
}

export type ServerSubmodule<
  InitArgs = {},  
  Config = {},
  Services = {},
  Context = unknown,
  RouteModule = unknown,
  Route extends RouteLike<Context, RouteModule> = RouteLike<Context, RouteModule>,
  Router extends Record<string, Route> = Record<string, Route>
> = Submodule<InitArgs, Config, Services> & Any.Compute<{

  loadRouteModules?: (loadRouteModuleParams: { 
    initArgs: InitArgs,
    config: Config
  }) => Record<string, RouteModule> | Promise<Record<string, RouteModule>>

  createRoute?: (createRouteParams: { 
    initArgs: InitArgs,
    config: Config, 
    services: Services, 
    routeModule: RouteModule, 
    routeName: string 
  }) => Promise<Route | Route[] | undefined> | (Route | Route[] | undefined)

  createRouter?: (createRouterParams: { 
    initArgs: InitArgs,
    config: Config, 
    services: Services, 
    routes: Record<string, Route> 
  }) => Router | Promise<Router>
  
  createInnerClient?: (createInnerClientParams: {
    initArgs: InitArgs,
    config: Config,
    services: Services,
    router: Router,
    startPromise: Promise<any>
  }) => Promise<(query: string, input: unknown) => unknown | Promise<unknown>>

  serve: (input: {
    initArgs: InitArgs,
    config: Config,
    services: Services,
    router: Router,
  }) => Promise<void>
}, 'flat'>

export type GetRouteModules<S extends ServerSubmodule<any, any, any, any, any, any>> = S['loadRouteModules'] extends (...args: any[]) => infer T
  ? Awaited<T>
  : never

export class SubmoduleController {}
export type ControllerSignal = SubmoduleController | Promise<SubmoduleController>

export class TypeBuilder<
  InitArgs = {}, 
  Config = {}, 
  Services = {},
  Context = {},
  RouteModule = unknown,
  Route extends RouteLike<Context, RouteModule> = RouteLike<Context, RouteModule>,
  RouteFnKey extends keyof RouteModule = keyof RouteModule
> {
  init<InitType>(): TypeBuilder<InitType, Config, Services, Context, RouteModule, Route, RouteFnKey> { return this as any }

  config<ConfigType>(): TypeBuilder<InitArgs, ConfigType, Services, Context, RouteModule, Route, RouteFnKey> { return this as any }
  
  services<ServicesType>(): TypeBuilder<InitArgs, Config, ServicesType, Context, RouteModule, Route, RouteFnKey> { return this as any }
  
  context<ContextType>(): TypeBuilder<InitArgs, Config, Services, ContextType, RouteModule, RouteLike<ContextType, RouteModule>, RouteFnKey> { return this as any }
  
  routeModule<RouteModuleType, RouteFnKeyValue extends keyof RouteModuleType>(): TypeBuilder<InitArgs, Config, Services, Context, RouteModuleType, RouteLike<Context, RouteModuleType>, RouteFnKeyValue> { return this as any }

  route<RouteType extends RouteLike<Context, RouteModule>>(): TypeBuilder<InitArgs, Config, Services, Context, RouteModule, RouteType, RouteFnKey> { return this as any }

  declare serverSubmodule: ServerSubmodule<InitArgs, Config, Services, Context, RouteModule, Route, Record<string, Route>>
  declare executableSubmodule: ExecutableSubmodule<InitArgs, Config, Services, RouteModule>
  
  declare types: {
    initArgs: InitArgs
    config: Config
    services: Services
    context: Context
    route: Route
    routeFn: RouteModule[RouteFnKey]
    routeModule: RouteModule
  }

  defineRouteFn<RouteFn extends RouteModule[RouteFnKey]>(routeFn: RouteFn): RouteFn { return routeFn }
}

export const typeBuilder = new TypeBuilder()