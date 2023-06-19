import { CreateInstrumentHandler, InstrumentFunction, InstrumentHandler, composeInstrument, createInstrument, createInstrumentor, instrument, nextInstrument } from "./instrument";

type Provider<Provide, Input = unknown> =
  | (() => Provide | Promise<Provide>)
  | ((input: Input) => Provide | Promise<Provide>)

export type ProviderOption = {
  name?: string
  instrument?: InstrumentFunction
  mode?: 'prototype' | 'singleton'
}

export const defaultProviderOptions: ProviderOption = {
  mode: 'singleton',
  instrument: createInstrumentor({})
}

export function setInstrument(inst: CreateInstrumentHandler) {
  defaultProviderOptions.instrument = nextInstrument(defaultProviderOptions.instrument, inst)
}

export type Executor<Provide, Dependent = unknown> = {
  execute<Output>(executable: Provider<Output, Provide>, options?: ProviderOption): Promise<Output>
  get(): Promise<Provide>
  prepare<Input extends Array<any>, Output>(
    provider: (provide: Provide, ...input: Input) => Output,
    options?: ProviderOption
  ): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>>
  _inject: (executor: Executor<Dependent>) => void
}

function isExecutor<P>(obj: any): obj is Executor<P> {
  return typeof obj?.['get'] === 'function'
}

function extract<Dependent>(
  secondParam?: ProviderOption | Executor<Dependent>,
  thirdParam?: ProviderOption
) {
  return isExecutor(secondParam)
    ? { dependent: secondParam, options: thirdParam }
    : { dependent: undefined, options: secondParam }
}

function set(target: any, name: string, value: any) {
  Object.defineProperty(target, name, {value: value, writable: false});
}

export function create<Provide>(provider: Provider<Provide>, options?: ProviderOption): Executor<Provide>
export function create<Provide, Dependent>(provider: Provider<Provide, Dependent>, dependent?: Executor<Dependent>, options?: ProviderOption): Executor<Provide>
export function create<Provide, Dependent = unknown>(
  provider: Provider<Provide, Dependent>,
  secondParam?: ProviderOption | Executor<Dependent>,
  thirdParam?: ProviderOption,
): Executor<Provide, Dependent> {
  const { dependent, options } = extract(secondParam, thirdParam)
  const opts = { ...defaultProviderOptions, ...options }

  const name = opts?.name || provider.name || 'anonymous'

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

  const executor: Executor<Provide, Dependent> = { 
    execute: async (provider, options) => create(async () => provider(await executor.get()), options || { name: `${name}.execute` }).get(),
    get: async() => (await init()).provide,
    prepare(provider, options) {
      return async function () {
        const that = this
        const args = arguments
        return execute(async () => provider.call(that, await executor.get(), ...args), options)
      }
    },
    _inject: async (executor) => { dependentRef = executor }
  }

  set(executor.get, 'name', `${name}.get`)
  set(executor.execute, 'name', `${name}.execute`)
  set(executor.prepare, 'name', `${name}.prepare`)

  if (opts.instrument) {
    instrument(executor, opts.instrument)
  }

  return executor
}

export const value = <Provide>(value: Provide, options?: Omit<ProviderOption, 'mode'>) => create(() => value, options)

export const prepare = <Dependent, Input, Output>(provider: (provide: Dependent, input: Input) => Output, dep: Executor<Dependent>): (input: Input) => Promise<Awaited<ReturnType<typeof provider>>> => dep.prepare(provider)

export async function execute<Output>(executable: Provider<Output>, options?: ProviderOption): Promise<Output>
export async function execute<Output, Dependent>(executable: Provider<Output, Dependent>, dependent: Executor<Dependent>, options?: ProviderOption): Promise<Output>
export async function execute<Dependent, Output>(executable: Provider<Output, Dependent>, secondParam?: Executor<Dependent> | ProviderOption, thirdParam?: ProviderOption): Promise<Output> {
  const { dependent, options } = extract(secondParam, thirdParam)
  return dependent
    ? dependent.execute(executable, options)
    : create(executable, options).get()
}

export type inferProvide<T> = T extends Executor<infer S> ? S : never

export const combine = function <L extends Record<string, Executor<any>>>(layout: L): Executor<{ [key in keyof L]: inferProvide<L[key]> }> {
  return create(async () => {
    const layoutPromise = Object.entries(layout).map(([key, executor]) => executor.get().then(value => [key, value] as const))
    const result = Object.fromEntries(await Promise.all(layoutPromise))
    return result as any
  })
}

export { CreateInstrumentHandler, InstrumentHandler, composeInstrument, createInstrument };
