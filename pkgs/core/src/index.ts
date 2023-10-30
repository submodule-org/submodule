import { composeInstrument, createInstrument, createInstrumentor, instrument, nextInstrument, type CreateInstrumentHandler, type InstrumentFunction, type InstrumentHandler } from "./instrument";

type Provider<Provide, Input = unknown> =
  | (() => Provide | Promise<Provide>)
  | ((input: Input) => Provide | Promise<Provide>)

export type ProviderOption<Provide> = {
  name?: string
  instrument?: InstrumentFunction
  mode?: 'prototype' | 'singleton'
  onExecute?: <V>(provide: Provide, execution: Provider<V, Provide>) => V | Promise<V>,
  onError?: (error: unknown, value?: Provide) => (void | Promise<void>)
}

export const defaultProviderOptions: ProviderOption<any> = {
  mode: 'singleton',
  instrument: createInstrumentor({}),
}

export function setInstrument(inst: CreateInstrumentHandler) {
  defaultProviderOptions.instrument = nextInstrument(defaultProviderOptions.instrument, inst)
}

export type Executor<Value, Dependent> = {
  set(value: Value): void
  get(deps?: Executor<Dependent, any>): Promise<Value>
  execute<Output>(execution: Provider<Output, Value>): Promise<Output>
}

const executorSymbol = Symbol.for('$submodule')

function isExecutor<P, D>(obj: any): obj is Executor<P, D> {
  return obj?.[executorSymbol]
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

function forceObjectProp(target: any, name: string, value: any) {
  Object.defineProperty(target, name, { value: value, writable: false });
}

export function create<Provide, Dependent = never>(provider: Provider<Provide>, options?: ProviderOption<Provide>): Executor<Provide, void>
export function create<Provide, Dependent>(provider: Provider<Provide, Dependent>, dependent: Executor<Dependent, unknown>, options?: ProviderOption<Provide>): Executor<Provide, Dependent>
export function create<Provide, Dependent = never>(
  providerParam: Provider<Provide, Dependent>,
  secondParam?: ProviderOption<Provide> | Executor<Dependent, unknown>,
  thirdParam?: ProviderOption<Provide>,
): Executor<Provide, Dependent> {
  const { provider, dependent, options } = extract(providerParam, secondParam, thirdParam)
  const opts = { ...defaultProviderOptions, ...options }

  let depExecutor: Executor<Dependent, any> | undefined = dependent
  let loader: Promise<Provide> | undefined = undefined

  const name = opts?.name || provider.name || 'anonymous'

  async function load(inject?: Executor<Dependent, any>) {
    try {
      const actualized = inject ? await inject.get() : await depExecutor?.get()

      if (provider.length > 0 && actualized === undefined) {
        throw new Error(`invalid state, provider ${provider.toString()} requires dependent but not provided`)
      }

      return await provider(actualized)
    } catch (e) {
      await opts.onError?.(e)
      throw e
    }
  }

  async function get(dep?: Executor<Dependent, any>) {
    if (opts?.mode === 'singleton') {
      if (loader === undefined) {
        loader = load(dep)
      }

      return await loader
    }
    return await load(dep)
  }

  async function execute<V>(execution: Provider<V, Provide>): Promise<V> {
    let value: Provide | undefined = undefined

    try {
      const value = await get()
      return opts.onExecute
        ? await opts.onExecute(value, execution)
        : execution(value)
    } catch (e) {
      await opts.onError?.(e, value)
      throw e
    }
  }

  function set(value: Provide) {
    if (loader === undefined) {
      loader = Promise.resolve(value)
    }
  }

  const executor: Executor<Provide, Dependent> = { get, set, execute, [Symbol.for('$submodule')]: true }

  forceObjectProp(executor.get, 'name', `${name}.get`)
  forceObjectProp(executor.set, 'name', `${name}.set`)
  forceObjectProp(executor.execute, 'name', `${name}.execute`)

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
