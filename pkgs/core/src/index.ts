import { debug, instrument, InstrumentFunction } from "./instrument";
import createDebug from 'debug'

const d = createDebug('submodule.core')

type Provider<Provide, Input = unknown> =
  | (() => Provide | Promise<Provide>)
  | ((input: Input) => Provide | Promise<Provide>)

export type ProviderOption = {
  instrument?: InstrumentFunction
}

export const defaultProviderOptions: ProviderOption = {}

export type Executor<Provide> = {
  execute(): Promise<Provide>
}

export function create<Provide, Dependent = unknown>(
  provider: Provider<Provide, Dependent>,
  dependent?: Executor<Dependent>,
  options: ProviderOption = defaultProviderOptions,
) {
  const opts = { ...defaultProviderOptions, ...options }

  let cached: Promise<{ provide: Provide }> | undefined = undefined

  async function load() {
    const actualized = dependent
      ? await dependent.execute()
      : undefined

    const provide = await provider(actualized as Dependent)
    return { provide }
  }

  async function execute(): Promise<Provide> {
    if (cached == undefined) {
      d('cache is uninitialized, initializing ...')
      cached = load()
    }
    return (await cached).provide
  }

  const executor = { execute }

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
    provide: <Provide>(provider: Provider<Provide, Dependent>) => create(provider, executor),
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