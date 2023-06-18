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
  execute<Output>(executable: Provider<Output, Provide>): Promise<Output>
  get(): Promise<Provide>
  prepare<Input extends Array<any>, Output>(provider: (provide: Provide, ...input: Input) => Output): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>>
  _inject: (executor: Executor<Dependent>) => void
}

function isExecutor<P>(obj: any): obj is Executor<P> {
  return typeof obj?.['get'] === 'function'
}

export type Hijacked<Dependent> = (executor: Executor<Dependent>) => void

export function create<Provide>(provider: Provider<Provide>, options?: ProviderOption): Executor<Provide>
export function create<Provide, Dependent>(provider: Provider<Provide>, dependent?: Executor<Dependent>, options?: ProviderOption): Executor<Provide>
export function create<Provide, Dependent = unknown>(
  provider: Provider<Provide, Dependent>,
  secondParam?: ProviderOption | Executor<Dependent>,
  thirdParam?: ProviderOption,
): Executor<Provide> {
  const dependent = isExecutor(secondParam)
    ? secondParam
    : undefined

  const options = thirdParam

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

  async function execute<Output>(provider: Provider<Output, Provide>): Promise<Output> {
    return provider(await get())
  }

  async function get(): Promise<Provide> {
    const { provide } = await init()
    return provide
  }

  function prepare<Input extends Array<any>, Output>(provider: (provide: Provide, ...input: Input) => Output): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>> {
    return async function () {
      const that = this
      const args = arguments
      return value(provider).execute(async fn => fn.call(that, await get(), ...args))
    }
  }

  const _inject: Hijacked<Dependent> = async (executor) => { dependentRef = executor }

  const executor = { execute, get, prepare, _inject }

  Object.defineProperty(executor.get, 'name', {
    value: `${name}.get`,
    writable: false
  });

  Object.defineProperty(executor.execute, 'name', {
    value: `${name}.execute`,
    writable: false
  });

  Object.defineProperty(executor.prepare, 'name', {
    value: `${name}.prepare`,
    writable: false
  });

  if (opts.instrument) {
    instrument(executor, opts.instrument)
  }

  return executor
}

export const value = <Provide>(value: Provide) => create(() => value)

export const prepare = <Dependent, Input, Output>(provider: (provide: Dependent, input: Input) => Output, dep: Executor<Dependent>): (input: Input) => Promise<Awaited<ReturnType<typeof provider>>> => dep.prepare(provider)

export async function execute<Output>(executable: Provider<Output>): Promise<Output>
export async function execute<Output, Dependent>(executable: Provider<Output, Dependent>, dependent: Executor<Dependent>): Promise<Output>
export async function execute<Dependent, Output>(executable: Provider<Output, Dependent>, dependent?: Executor<Dependent>): Promise<Output> {
  return dependent
    ? dependent.execute(executable)
    : create(executable).get()
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
