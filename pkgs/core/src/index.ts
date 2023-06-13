import { instrument, InstrumentFunction, createInstrumentor, CreateInstrumentHandler, InstrumentHandler } from "./instrument";

type Provider<Provide, Input = unknown> =
  | (() => Provide | Promise<Provide>)
  | ((input: Input) => Provide | Promise<Provide>)

export type ProviderOption = {
  instrument?: InstrumentFunction
  mode: 'prototype' | 'singleton'
}

export const defaultProviderOptions: ProviderOption = {
  mode: 'singleton',
  instrument: createInstrumentor({})
}

export function setInstrument(inst: CreateInstrumentHandler) {
  const prev = defaultProviderOptions.instrument
  const mixin: InstrumentFunction = (fn, name) => {
    const instrumented = prev?.(fn, name) || fn
    const next = typeof inst === 'function'
      ? inst()
      : inst
    return createInstrumentor(next)(instrumented, name)
  } 

  defaultProviderOptions.instrument = mixin
}

export type Executor<Provide> = {
  execute<Output>(executable: Provider<Output, Provide>): Promise<Output>
  get(): Promise<Provide>
  prepare<Input extends Array<any>, Output>(provider: (provide: Provide, ...input: Input) => Output): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>>
}

export type Hijacked<Dependent> = (executor: Executor<Dependent>) => void

export function create<Provide, Dependent = unknown>(
  provider: Provider<Provide, Dependent>,
  dependent?: Executor<Dependent>,
  options: ProviderOption = defaultProviderOptions,
) {
  const opts = { ...defaultProviderOptions, ...options }

  let cached: Promise<{ provide: Provide }> | undefined = undefined
  let dependentRef: Executor<Dependent> | undefined = dependent

  async function load() {
    const actualized = dependentRef
      ? await dependentRef.get()
      : undefined

    const provide = await provider(actualized as Dependent)
    return { provide }
  }

  async function init() {
    if (opts.mode === 'prototype') {
      cached = load()
    } else {
      if (cached === undefined) {
        cached = load()
      }
    }

    return cached
  }

  async function execute<Output>(provider: Provider<Output, Provide>): Promise<Output> {
    const { provide } = await init()
    return provider(provide)
  }

  async function get(): Promise<Provide> {
    const { provide } = await init()
    return provide
  }

  function prepare<Input extends Array<any>, Output>(provider: (provide: Provide, ...input: Input) => Output): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>> {
    return async function () {
      const { provide } = await init()
      return provider.call(this, provide, ...arguments)
    }
  }

  const _inject: Hijacked<Dependent> = async (executor) => { dependentRef = executor }

  const executor = { execute, get, prepare, _inject }

  if (opts.instrument) {
    instrument(executor, opts.instrument)
  }

  return executor
}

export const createProvider = <Output, Input>(provider: Provider<Output, Input>) => provider
export const value = <Provide>(value: Provide) => create(() => value)

export const from = <Dependent>(executor: Executor<Dependent>) => {
  return {
    provide: <Provide>(provider: Provider<Provide, Dependent>, opts: ProviderOption = defaultProviderOptions) => create(provider, executor, opts),
    execute: async <Output>(executable: Provider<Output, Dependent>): Promise<Output> => executor.execute(executable),
    prepare: <Input, Output>(provider: (provide: Dependent, input: Input) => Output): (input: Input) => Promise<Awaited<ReturnType<typeof provider>>> => executor.prepare(provider)
  }
}

export type inferProvide<T> = T extends Executor<infer S> ? S : never

export const combine = function <L extends Record<string, Executor<any>>>(layout: L): Executor<{ [key in keyof L]: inferProvide<L[key]> }> {
  return create(async () => {
    const result = {}
    for (const [key, value] of Object.entries(layout)) {
      result[key] = await value.get()
    }
    return result as any
  })
}

export { createInstrumentor, CreateInstrumentHandler, InstrumentHandler }