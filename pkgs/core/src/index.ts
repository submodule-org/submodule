import { composeInstrument, createInstrument, createInstrumentor, instrument, nextInstrument, type CreateInstrumentHandler, type InstrumentFunction, type InstrumentHandler } from "./instrument";

type Provider<Provide, Input = unknown> =
  | (() => Provide | Promise<Provide>)
  | ((input: Input) => Provide | Promise<Provide>)

export type ProviderOption<Provide> = {
  name?: string
  instrument?: InstrumentFunction
  mode?: 'prototype' | 'singleton'
  onExecute?: <V>(provide: Provide, execution: Provider<V, Provide>) => V | Promise<V>
}

export const defaultProviderOptions: ProviderOption<any> = {
  mode: 'singleton',
  instrument: createInstrumentor({}),
}

export function setInstrument(inst: CreateInstrumentHandler) {
  defaultProviderOptions.instrument = nextInstrument(defaultProviderOptions.instrument, inst)
}

export type Executor<Value, Dependent> = {
  get(deps?: Executor<Dependent, any>): Promise<Value>
  execute<Output>(execution: Provider<Output, Value>): Promise<Output>
}

function isExecutor<P, D>(obj: any): obj is Executor<P, D> {
  return typeof obj?.['get'] === 'function'
    && typeof obj?.['execute'] === 'function'
}

function extract<Dependent, Output>(
  executable: Provider<Output>,
  secondParam?: ProviderOption<Output> | Executor<Dependent, unknown>,
  thirdParam?: ProviderOption<Output>
) {
  return isExecutor(secondParam)
    ? { provider: executable, dependent: secondParam, options: thirdParam }
    : { provider: executable as (() => Output | Promise<Output>), dependent: undefined, options: secondParam || thirdParam }
}

function set(target: any, name: string, value: any) {
  Object.defineProperty(target, name, { value: value, writable: false });
}

type AnyFn = (...input: any[]) => any

export const internals = {
  internalCache: new Map<AnyFn, Promise<any>>(),
}

export function create<Provide>(provider: Provider<Provide>, options?: ProviderOption<Provide>): Executor<Provide, void>
export function create<Provide, Dependent>(provider: Provider<Provide, Dependent>, dependent?: Executor<Dependent, unknown>, options?: ProviderOption<Provide>): Executor<Provide, Dependent>
export function create<Provide, Dependent = unknown>(
  providerParam: Provider<Provide, Dependent>,
  secondParam?: ProviderOption<Provide> | Executor<Dependent, unknown>,
  thirdParam?: ProviderOption<Provide>,
): Executor<Provide, Dependent> {
  const { provider, dependent, options } = extract(providerParam, secondParam, thirdParam)
  const opts = { ...defaultProviderOptions, ...options }

  const name = opts?.name || provider.name || 'anonymous'

  async function load(dep?: Executor<Dependent, any>) {
    const actualized = dep ? await dep.get() : await dependent?.get()

    if (provider.length > 0 && actualized === undefined) {
      throw new Error(`invalid state, provider ${provider.toString()} requires dependent but not provided`)
    }

    return await provider(actualized)
  }

  async function get(dep?: Executor<Dependent, any>) {
    if (opts?.mode === 'singleton') {
      if (!internals.internalCache.has(provider)) {
        internals.internalCache.set(provider, load(dep))
      }

      return await internals.internalCache.get(provider)
    }
    return await load(dep)
  }

  async function execute<V>(execution: Provider<V, Provide>): Promise<V> {
    const value = await get()
    return opts?.onExecute
      ? await opts.onExecute(value, execution)
      : execution(value)
  }

  const executor: Executor<Provide, Dependent> = {
    get,
    execute,
  }

  set(executor.get, 'name', `${name}.get`)

  if (opts.instrument) {
    instrument(executor, opts.instrument)
  }

  return executor
}

export const value = <Provide>(value: Provide, options?: Omit<ProviderOption<Provide>, 'mode'>) => create(() => value, options)

export const template = <Dependent>(dependent: Executor<Dependent, unknown>, options?: ProviderOption<Dependent>) =>
  <Fn extends (...input: any[]) => any, Input extends any[] = Parameters<Fn>>(factory: (dependent: Dependent, ...params: Input) => ReturnType<Fn>) => {
    return (...params: Input) => execute(v => factory(v, ...params), dependent, options)
  }

export const prepare = <Dependent, Input extends Array<any>, Output>(
  provider: (provide: Dependent, ...input: Input) => Output,
  dep: Executor<Dependent, unknown>,
  options?: ProviderOption<Output>
): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>> => {
  return async function () {
    const that = this
    const args = arguments
    return execute(async () => provider.call(that, await dep.get(), ...args), options)
  }
}

export async function execute<Output>(executable: Provider<Output>, options?: ProviderOption<Output>): Promise<Awaited<Output>>
export async function execute<Output, Dependent>(executable: Provider<Output, Dependent>, dependent: Executor<Dependent, unknown>, options?: ProviderOption<Output>): Promise<Awaited<Output>>
export async function execute<Dependent, Output>(executable: Provider<Output, Dependent>, secondParam?: Executor<Dependent, unknown> | ProviderOption<Output>, thirdParam?: ProviderOption<Output>): Promise<Awaited<Output>> {
  const { provider, dependent, options } = extract(executable, secondParam, thirdParam)

  if (dependent) {
    return await dependent.execute(provider)
  } else {
    return await create(() => provider(), options).get()
  }
}

export type inferProvide<T> = T extends Executor<infer S, any> ? S : never

export const combine = function <L extends Record<string, Executor<any, any>>>(layout: L): Executor<{ [key in keyof L]: inferProvide<L[key]> }, unknown> {
  return create(async () => {
    const layoutPromise = Object.entries(layout).map(([key, executor]) => executor.get().then(value => [key, value] as const))
    const result = Object.fromEntries(await Promise.all(layoutPromise))
    return result as any
  })
}

export { CreateInstrumentHandler, InstrumentFunction, InstrumentHandler, composeInstrument, createInstrument };
