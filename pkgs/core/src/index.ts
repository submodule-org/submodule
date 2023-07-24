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

export type Unstaged<Provide, Dependent> = (dependent: Executor<Dependent, unknown>, options?: ProviderOption) => Executor<Provide, Dependent>

export type Executor<Provide, Dependent> = {
  get(): Promise<Provide>
  unstage: () => Unstaged<Provide, Dependent>
}

function isExecutor<P, D>(obj: any): obj is Executor<P, D> {
  return typeof obj?.['get'] === 'function'
}

function extract<Dependent, Output>(
  executable: Provider<Output>,
  secondParam?: ProviderOption | Executor<Dependent, unknown>,
  thirdParam?: ProviderOption
) {
  return isExecutor(secondParam)
    ? { provider: executable, dependent: secondParam, options: thirdParam }
    : { provider: executable as (() => Output | Promise<Output>), dependent: undefined, options: secondParam || thirdParam }
}

function set(target: any, name: string, value: any) {
  Object.defineProperty(target, name, { value: value, writable: false });
}

export function create<Provide>(provider: Provider<Provide>, options?: ProviderOption): Executor<Provide, void>
export function create<Provide, Dependent>(provider: Provider<Provide, Dependent>, dependent?: Executor<Dependent, unknown>, options?: ProviderOption): Executor<Provide, Dependent>
export function create<Provide, Dependent = unknown>(
  providerParam: Provider<Provide, Dependent>,
  secondParam?: ProviderOption | Executor<Dependent, unknown>,
  thirdParam?: ProviderOption,
): Executor<Provide, Dependent> {
  const { provider, dependent, options } = extract(providerParam, secondParam, thirdParam)
  const opts = { ...defaultProviderOptions, ...options }

  const name = opts?.name || provider.name || 'anonymous'

  let cached: Promise<{ provide: Provide }> | undefined = undefined
  let dependentRef: Executor<Dependent, unknown> | undefined = dependent

  async function load() {
    const actualized = dependentRef
      ? await dependentRef.get()
      : undefined

    const provide = await provider(actualized as Dependent)
    return { provide }
  }

  async function init() {
    if (opts.mode === 'prototype') {
      return load()
    } else {
      if (cached === undefined) {
        cached = load()
      }
    }

    return cached
  }

  const executor: Executor<Provide, Dependent> = {
    get: async () => (await init()).provide,
    unstage: () => (dependent, options) => create(provider, dependent, options || opts)
  }

  set(executor.get, 'name', `${name}.get`)

  if (opts.instrument) {
    instrument(executor, opts.instrument)
  }

  return executor
}

export const value = <Provide>(value: Provide, options?: Omit<ProviderOption, 'mode'>) => create(() => value, options)

export const prestaged = <Dependent, Output>(factory: Provider<Output, Dependent>, options?: ProviderOption): Unstaged<Output, Dependent> => 
(de: Executor<Dependent, unknown>): Executor<Output, Dependent> => {
  return create(factory, de, options)
}

export const stage = <Dependent, Provide>(unstaged: Unstaged<Provide, Dependent>, dependent: Executor<Dependent, unknown>, options?: ProviderOption) => {
  return unstaged(dependent, options)
}

export const template = <Dependent>(dependent: Executor<Dependent, unknown>, options?: ProviderOption) =>
  <Fn extends (...input: any[]) => any, Input extends any[] = Parameters<Fn>>(factory: (dependent: Dependent, ...params: Input) => ReturnType<Fn>) => {
    return (...params: Input) => execute(v => factory(v, ...params), dependent, options)
  }

export async function execute<Output>(executable: Provider<Output>, options?: ProviderOption): Promise<Awaited<Output>>
export async function execute<Output, Dependent>(executable: Provider<Output, Dependent>, dependent: Executor<Dependent, unknown>, options?: ProviderOption): Promise<Awaited<Output>>
export async function execute<Dependent, Output>(executable: Provider<Output, Dependent>, secondParam?: Executor<Dependent, unknown> | ProviderOption, thirdParam?: ProviderOption): Promise<Awaited<Output>> {
  const { provider, dependent, options } = extract(executable, secondParam, thirdParam)

  if (dependent) {
    const value = await dependent.get()
    return await create(() => provider(value), options).get()
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

