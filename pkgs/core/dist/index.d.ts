type PromiseFn<T = any> = (...args: any[]) => Promise<T> | T;
type Submodule<Config = any, PreparedContext = any, Context = any, RouteDef = any> = {
    configFn?(): Config | Promise<Config>;
    preparedContextFn?(input: {
        config: Config;
    }): PreparedContext | Promise<PreparedContext>;
    handlerFn?(input: {
        config: Config;
        preparedContext: PreparedContext;
        handlers: Record<string, unknown>;
    }): Record<string, RouteDef> | Promise<Record<string, RouteDef>>;
    adaptorFn?(input: {
        config: Config;
        preparedContext: PreparedContext;
        router: Record<string, RouteDef>;
    }): Promise<void>;
};

export { PromiseFn, Submodule };
