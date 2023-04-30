import createDebug from "debug";
import type { Any } from "ts-toolbelt";
import { withControllerUnit } from "./controller";
import { debug, instrument, trace } from "./instrument";

export interface IOExtractor<T = unknown> {
  routeModule: T;
  input: unknown;
  output: unknown;
}

export type Submodule<InitArgs = {}, Config = {}, Services = {}> = Any.Compute<
  {
    createConfig?: (createConfigParams?: {
      initArgs: InitArgs;
    }) => Config | Promise<Config>;

    createServices?: (createServiceParams: {
      initArgs: InitArgs;
      config: Config;
    }) => Services | Promise<Services>;
  },
  "flat"
>;

export type ExecutableSubmodule<
  InitArgs = {},
  Config = {},
  Services = {},
  RouteModule = unknown,
  Input = unknown,
  Output = unknown
> = Submodule<InitArgs, Config, Services> &
  Any.Compute<
    {
      loadRouteModule?: (loadRouteModuleParams: {
        initArgs: InitArgs;
        config: Config;
        query: string;
        preloadedRoutes?: any;
      }) => RouteModule | Promise<RouteModule> | undefined | Promise<undefined>;

      execute: (executeParams: {
        initArgs: InitArgs;
        config: Config;
        services: Services;
        route: RouteModule;
        query?: string;
        input?: Input;
      }) => Promise<Output>;
    },
    "flat"
  >;

export type RouteLike<Context = unknown, RouteModule = unknown> = {
  handle: (context: Context) => unknown | Promise<unknown>;
  routeModule: RouteModule;
  routeName: string;
};

export type ServerSubmodule<
  InitArgs = {},
  Config = {},
  Services = {},
  Context = unknown,
  RouteModule = unknown,
  Route extends RouteLike<Context, RouteModule> = RouteLike<
    Context,
    RouteModule
  >,
  Router extends Record<string, Route> = Record<string, Route>
> = Submodule<InitArgs, Config, Services> &
  Any.Compute<
    {
      loadRouteModules?: (loadRouteModuleParams: {
        initArgs: InitArgs;
        config: Config;
      }) => Record<string, RouteModule> | Promise<Record<string, RouteModule>>;

      createRoute: (createRouteParams: {
        initArgs: InitArgs;
        config: Config;
        services: Services;
        routeModule: RouteModule;
        routeName: string;
      }) =>
        | Promise<Route | Route[] | undefined>
        | (Route | Route[] | undefined);

      createRouter?: (createRouterParams: {
        initArgs: InitArgs;
        config: Config;
        services: Services;
        routes: Record<string, Route>;
      }) => Router | Promise<Router>;

      createInnerClient?: (createInnerClientParams: {
        initArgs: InitArgs;
        config: Config;
        services: Services;
        router: Router;
        startPromise: Promise<any>;
      }) => Promise<
        (query: string, input: unknown) => unknown | Promise<unknown>
      >;

      serve: (input: {
        initArgs: InitArgs;
        config: Config;
        services: Services;
        router: Router;
      }) => Promise<void>;
    },
    "flat"
  >;

export class SubmoduleController {}
export type ControllerSignal =
  | SubmoduleController
  | Promise<SubmoduleController>;

// #region executable

export const createExecutable = function <
  Extractor extends IOExtractor,
  Routes = unknown
>(
  submoduleDef: ExecutableSubmodule<any, any, any, any>,
  initArgs: any
): <
  Query extends keyof Routes,
  IO extends Extractor & { routeModule: Routes[Query] } = Extractor & {
    routeModule: Routes[Query];
  }
>(
  query: Query | Omit<string, Query>,
  input: IO["input"]
) => Promise<IO["output"]> {
  let cached: { config: any; services: any } | undefined = undefined;
  const routeModules = new Map();

  const submodule = { ...defaultSubmodule, ...submoduleDef };
  instrument(submodule, debug);
  instrument(submodule, trace);

  async function load() {
    if (!cached) {
      const config = await submodule.createConfig({ initArgs });
      const services = await submodule.createServices({ config, initArgs });
      cached = { config, services };
    }

    return cached;
  }

  return withControllerUnit(async (query, input) => {
    const queryString = query.toString();

    const { config, services } = await load();

    const routeModule = routeModules.has(queryString)
      ? routeModules.get(query)
      : await submodule.loadRouteModule({
          initArgs,
          config,
          query: queryString,
        });

    return await submodule.execute({
      initArgs,
      config,
      services,
      query: queryString,
      input,
      route: routeModule,
    });
  });
};

export interface ExtractRouteFn<RouteModule = unknown> {
  routeModule: RouteModule;
  routeFn: unknown;
}

// #endregion

// #region server

export const serve = withControllerUnit(
  async (
    nonValidatedSubmodule: ServerSubmodule<any, any, any, any, any, any, any>,
    initArgs: any
  ) => {
    const _debug = createDebug("submodule.createSubmoduleInstance");

    const submodule = { ...defaultSubmodule, ...nonValidatedSubmodule };
    instrument(submodule, debug);
    instrument(submodule, trace);
    instrument(submodule, (name, fn) => withControllerUnit(fn));

    const config = await submodule.createConfig({ initArgs });
    const routeModules = await submodule.loadRouteModules({ config, initArgs });

    const services = await submodule.createServices({ config, initArgs });

    const routes = {};
    for (const [routeName, routeModule] of Object.entries(routeModules)) {
      const maybeRoute = await submodule.createRoute({
        initArgs,
        config,
        services,
        routeModule,
        routeName,
      });

      instrument(maybeRoute, debug, 2);
      instrument(maybeRoute, trace, 2);

      if (maybeRoute === undefined) continue;
      if (Array.isArray(maybeRoute)) {
        maybeRoute.forEach((route) => (routes[route["routeName"]] = route));
      } else {
        routes[maybeRoute["routeName"]] = maybeRoute;
      }
    }

    const router = await submodule.createRouter({
      initArgs,
      config,
      services,
      routes,
    });

    const startPromise = submodule.serve({
      initArgs,
      config,
      services,
      router,
    });

    const client = await submodule.createInnerClient({
      initArgs,
      config,
      services,
      router,
      startPromise,
    });

    return { submodule, config, services, router, startPromise, client };
  }
);

// #endregion

export type DefaultRouteModule<CallContext, Output = unknown> = {
  default: (callContext: CallContext) => Output | Promise<Output>;
};

export interface DefaultRouteFnExtractor<CallContext>
  extends ExtractRouteFn<DefaultRouteModule<CallContext>> {
  routeFn: this["routeModule"]["default"];
}

export interface DefaultInputOutputExtractor<
  RouteModule extends DefaultRouteModule<any>
> extends IOExtractor<RouteModule> {
  input: Parameters<this["routeModule"]["default"]>[0] extends {
    input: infer Input;
  }
    ? Input
    : unknown;
  output: ReturnType<this["routeModule"]["default"]> extends Promise<
    infer Result
  >
    ? Result
    : ReturnType<this["routeModule"]["default"]>;
}

class SubmoduleBuilder<
  InitArgs = {},
  Config = {},
  Services = {},
  Context = {},
  RouteModule = unknown,
  Route extends RouteLike<Context, RouteModule> = RouteLike<
    Context,
    RouteModule
  >,
  RouteFn = unknown,
  Routes = unknown,
  InputOutputExtractor extends IOExtractor = IOExtractor
> {
  routes<Routes>(): SubmoduleBuilder<
    InitArgs,
    Config,
    Services,
    Context,
    RouteModule,
    Route,
    RouteFn,
    Routes,
    InputOutputExtractor
  > {
    return this as any;
  }

  init<InitType>(): SubmoduleBuilder<
    InitType,
    Config,
    Services,
    Context,
    RouteModule,
    Route,
    RouteFn,
    Routes,
    InputOutputExtractor
  > {
    return this as any;
  }

  config<ConfigType>(): SubmoduleBuilder<
    InitArgs,
    ConfigType,
    Services,
    Context,
    RouteModule,
    Route,
    RouteFn,
    Routes,
    InputOutputExtractor
  > {
    return this as any;
  }

  services<ServicesType>(): SubmoduleBuilder<
    InitArgs,
    Config,
    ServicesType,
    Context,
    RouteModule,
    Route,
    RouteFn,
    Routes,
    InputOutputExtractor
  > {
    return this as any;
  }

  context<ContextType>(): SubmoduleBuilder<
    InitArgs,
    Config,
    Services,
    ContextType,
    RouteModule,
    RouteLike<ContextType, RouteModule>,
    RouteFn,
    Routes,
    InputOutputExtractor
  > {
    return this as any;
  }

  routeModule<
    RouteModuleType,
    Extractor extends ExtractRouteFn,
    ExtractInputOut extends IOExtractor<RouteModuleType>
  >(): SubmoduleBuilder<
    InitArgs,
    Config,
    Services,
    Context,
    RouteModuleType,
    RouteLike<Context, RouteModuleType>,
    (Extractor & { routeModule: RouteModuleType })["routeFn"],
    Routes,
    ExtractInputOut
  >;

  routeModule() {
    return this as any;
  }

  route<RouteType extends RouteLike<Context, RouteModule>>(): SubmoduleBuilder<
    InitArgs,
    Config,
    Services,
    Context,
    RouteModule,
    RouteType,
    RouteFn,
    Routes,
    InputOutputExtractor
  > {
    return this as any;
  }

  declare serverSubmodule: ServerSubmodule<
    InitArgs,
    Config,
    Services,
    Context,
    RouteModule,
    Route,
    Record<string, Route>
  >;
  declare executableSubmodule: ExecutableSubmodule<
    InitArgs,
    Config,
    Services,
    RouteModule
  >;

  declare types: {
    initArgs: InitArgs;
    config: Config;
    services: Services;
    context: Context;
    route: Route;
    routeFn: RouteFn;
    routeModule: RouteModule;
    queries: keyof Routes;
  };

  defineRouteFn<RouteFnType extends Any.Compute<this["types"]["routeFn"]>>(
    routeFn: RouteFnType
  ): RouteFnType {
    return routeFn;
  }

  // #region executable
  defineExecutable(
    submoduleDef: ExecutableSubmodule<InitArgs, Config, Services, RouteModule>
  ) {
    return submoduleDef;
  }

  createExecutable<Extractor extends IOExtractor>(
    submoduleDef: this["executableSubmodule"],
    initArgs?: InitArgs
  ) {
    return createExecutable<Extractor, Routes>(submoduleDef, initArgs);
  }
  // #endregion

  // #region server
  defineServer(submoduleDef: this["serverSubmodule"]) {
    return submoduleDef;
  }

  serve(submoduleDef: this["serverSubmodule"], initArgs?: InitArgs) {
    return serve(submoduleDef, initArgs);
  }
  // #endregion
}

export const builder = () => new SubmoduleBuilder();

const defaultSubmoduleDef = builder();

type DefaultServerSubmodule = typeof defaultSubmoduleDef.serverSubmodule;
type DefaultExecutableSubmodule =
  typeof defaultSubmoduleDef.executableSubmodule;

const defaultSubmodule = {
  async createConfig() {
    return {};
  },

  async createServices() {
    return {};
  },

  async loadRouteModule() {
    return undefined;
  },

  async loadRouteModules() {
    return {};
  },

  async createRoute() {
    throw new Error("not yet implemented");
  },

  async createRouter({ routes }) {
    return routes;
  },

  async execute() {
    throw new Error("not yet implemented");
  },

  async serve() {
    throw new Error("not yet implemented");
  },

  async createInnerClient({ startPromise }) {
    await startPromise;
    return () => {
      throw new Error("not yet implemented");
    };
  },
} satisfies DefaultServerSubmodule & DefaultExecutableSubmodule;
