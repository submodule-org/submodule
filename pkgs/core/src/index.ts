import { debug, instrument, InstrumentFunction } from "./instrument";
import createDebug from 'debug'

const d = createDebug('submodule.core')

type Provider<Provide, Input = unknown> =
  | (() => Provide | Promise<Provide>)
  | ((input: Input) => Provide | Promise<Provide>)

export type ProviderOption = {
  instrument?: InstrumentFunction
  mode: 'prototype' | 'singleton'
}

export const defaultProviderOptions: ProviderOption = {
  mode: 'singleton'
}

export type Executor<Provide> = {
  execute(): Promise<Provide>
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
      ? await dependentRef.execute()
      : undefined

    const provide = await provider(actualized as Dependent)
    return { provide }
  }

  function init() {
    if (opts.mode === 'prototype') {
      cached = load()
    } else {
      if (cached === undefined) {
        cached = load()
      }
    }

    return cached
  }

  async function execute(): Promise<Provide> {
    const { provide } = await init()
    return provide
  }
  
  const _inject: Hijacked<Dependent> = async (executor) => { dependentRef = executor }
  
  const executor = { execute, _inject }

  instrument(executor, debug)

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
    execute: async (executable: (Dependent: Dependent) => any) => {
      return executable(await executor.execute())
    }
  }
}

export type inferProvide<T> = T extends Executor<infer S> ? S : never

export const combine = function <L extends Record<string, Executor<any>>>(layout: L): Executor<{ [key in keyof L]: inferProvide<L[key]> }> {
  return create(async () => {
    const result = {}
    for (const [key, value] of Object.entries(layout)) {
      result[key] = await value.execute()
    }
    return result as any
  })
}