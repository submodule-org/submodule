import { ExtractRouteFn, ExtractInputOutput } from "@submodule/core"

export declare module defaults {
  type RouteModule<CallContext, Input = unknown, Output = unknown> = { 
    default: (callContext: CallContext, input: Input) => Output | Promise<Output> 
  }
  
  interface RouteFnExtractor<
    CallContext, 
    RM extends RouteModule<CallContext> = RouteModule<CallContext>
  > extends ExtractRouteFn<RM> {
    routeFn: this['routeModule']['default']
  }
  
  interface InputOutputExtractor<
    CallContext, 
    RM extends RouteModule<CallContext> = RouteModule<CallContext>
  > extends ExtractInputOutput<RM> {
    input: Parameters<this['routeModule']['default']>[1]
    output: Awaited<ReturnType<this['routeModule']['default']>>
  }
}

export declare module promiseDefaults {
  type RouteModule<CallContext, Input = unknown, Output = unknown> = Promise<{ 
    default: (callContext: CallContext, input: Input) => Output | Promise<Output> 
  }>
  
  interface RouteFnExtractor<
    CallContext, 
    RM extends RouteModule<CallContext> = RouteModule<CallContext>
  > extends ExtractRouteFn<RM> {
    routeFn: Awaited<this['routeModule']>['default']
  }
  
  interface InputOutputExtractor<
    CallContext, 
    RM extends RouteModule<CallContext> = RouteModule<CallContext>
  > extends ExtractInputOutput<RM> {
    input: Parameters<Awaited<this['routeModule']>['default']>[1]
    output: Awaited<ReturnType<Awaited<this['routeModule']>['default']>>
  }
}