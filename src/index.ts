import {
  createCombineObservables,
  createObservable,
  type ObservableGet,
  type ObservableSet,
  type ObservableOpts
} from "./observables"

declare const ExecutorIdBrand: unique symbol
export type ExecutorId = string & { readonly [ExecutorIdBrand]: never }

export class ProviderClass<Provide> {
  constructor(
    public provider: (
      scope: Scope,
      self: Executor<unknown>,
      ref?: Executor<unknown>
    ) => Provide | Promise<Provide>,
  ) { }
}

type Fn<Provide, Input> = (input: Input) => (Provide | Promise<Provide>)

type Provider<Provide, Input = unknown> = (
  input: Input,
) => Provide | Promise<Provide>

type OnResolve = {
  filter: (target: unknown, self: Executor<unknown>, ref?: Executor<unknown>) => boolean,
  cb: <T>(target: T,) => T
}

type Defer = (e?: unknown) => void | Promise<void>

/**
 * Represents a scope in the dependency injection system.
 * A scope acts as a value holder and manages the lifecycle of dependencies.
 * Middleware can be applied at the scope level.
 * While there's a default global scope, multiple scopes can be created as needed.
 */
export class Scope {
  constructor(
    private store = new Map<Executor<unknown>, Promise<unknown> | unknown>(),
    private _resolves: OnResolve[] = [],
    private defers: Defer[] = [],
    private listeners = new Map<Executor<unknown>, Set<(p: unknown) => void>>(),
  ) { }

  /**
   * Checks if an executor has been resolved in this scope.
   * @param {Executor<unknown>} executor - The executor to check.
   * @returns {boolean} True if the executor has been resolved, false otherwise.
   */
  has<P>(executor: Executor<P>, self = true): boolean {
    return this.store.has(executor)
  }

  /**
   * Retrieves the resolved value of an executor.
   * @template T
   * @param {Executor<T>} executor - The executor to retrieve the value for.
   * @returns {Promise<T>} A promise that resolves to the value.
   */
  get<T>(executor: Executor<T>): Promise<T | undefined> {
    return this.store.get(executor) as (Promise<T | undefined>)
  }

  /**
   * Sets the value for an executor in the scope.
   * @template T
   * @param {Executor<T>} executor - The executor to set the value for.
   * @param {T | Promise<T> | Executor<T>} v - The value to set.
   */
  set<T>(executor: Executor<T>, v: T | Promise<T> | Executor<T>) {
    if (this.store.has(executor)) {
      return
    }

    if (isExecutor(v)) {
      this.store.set(executor, this.resolve(v))
      return
    }

    this.store.set(executor, Promise.resolve(v))
  }

  /**
   * Resolves a value for an executor and stores it in the scope.
   * @template T
   * @param {Executor<T>} executor - The executor to resolve the value for.
   * @param {T | Executor<T>} value - The value to resolve.
   */
  resolveValue<T>(executor: Executor<T>, value: T | Executor<T>) {
    if (this.store.has(executor)) {
      return
    }

    if (isExecutor(value)) {
      this.store.set(executor, this.resolve(value))
      return
    }

    this.store.set(executor, Promise.resolve(value))
  }

  /**
   * Resolves an executor or a combination of executors.
   * @template T
   * @param {EODE<T>} executor - The executor or combination to resolve.
   * @returns {Promise<T>} A promise that resolves to the final value.
   */
  resolve<T>(executor: EODE<T>): Promise<T> {
    if (isExecutor(executor)) {
      if (this.has(executor)) {
        return this.get(executor) as Promise<T>
      }

      const self = executor

      const ref = executor.input
        ? isExecutor(executor.input) ? executor.input : combine(executor.input)
        : undefined

      const promise = new Promise<T>((resolve, reject) => {
        Promise.resolve().then(() => {
          return ref ? this.resolve(ref) : undefined
        })
          .then(async (actualized) => {
            if (typeof executor.provider === 'function') {
              if (executor.provider.length > 2 && actualized === undefined) {
                throw new Error(`invalid state, provider ${executor.provider.toString()} requires dependent but not provided`)
              }

              return executor.provider(actualized as T)
            }

            return executor.provider.provider(this, self, ref)
          })
          .then((actualized) => {

            for (const onResolve of this.onResolves) {
              if (onResolve.filter(actualized, executor, ref)) {
                return onResolve.cb(actualized)
              }
            }

            if (actualized === undefined || actualized === null) {
              this.remove(executor)
            }

            return actualized
          })
          .then(actualized => {
            resolve(actualized)
          })
          .catch((e) => {
            reject(e)
          })
      })

      this.set(executor, promise)
      return promise
    }

    const combined = combine(executor)
    return this.resolve(combined)
  }

  /**
   * Safe resolve would resolve the executor and catch any error that might occur
   * This is a safer and more verbose version to handle error. When you use `resolve` and the executor throws an error, it will be thrown as is.
   * that error will be carried when you resolve the executor. This is useful when you want to handle the error in a more controlled way.
   * 
   * @param executor 
   * @returns 
   */
  async safeResolve<T>(executor: EODE<T>): Promise<{ type: 'ok', value: T, error: undefined } | { type: 'error', value: undefined, error: unknown }> {
    return await Promise.resolve(this.resolve(executor))
      .then(value => ({ type: 'ok', value, error: undefined } as const))
      .catch(error => ({ type: 'error', error, value: undefined } as const))
  }

  /**
   * Executes a function using the resolved value of an executor.
   * @param dependency 
   * @param runner 
   * @param inputs 
   * @returns 
   */
  async safeRun<Dependent, Output, Input extends Array<unknown>>(
    dependency: EODE<Dependent>,
    runner: (provide: Dependent, ...inputs: Input) => Output | Promise<Output>,
    ...inputs: Input
  ): Promise<{ type: 'ok', data: Awaited<Output>, error: undefined } | { type: 'error', error: unknown, data: undefined }> {
    return await this.resolve(dependency)
      .catch(e => {
        throw new Error('dependency error', { cause: e })
      })
      .then(async (dependency) => {
        const output = await runner(dependency, ...inputs)
        return { type: 'ok', data: output, error: undefined } as const
      })
      .catch((error) => {
        return { type: 'error', error, data: undefined } as const
      })
  }

  /**
   * Adds a defer callback to the scope. Defer function is executed when scope is disposed.
   * @param {Defer} deferer - The defer callback to add.
   */
  addDefer(deferer: Defer) {
    this.defers.push(deferer)
  }

  /**
   * Adds an onResolve callback to the scope. The resolve callback is executed when the executor is resolved.
   * @param {OnResolve} onResolve - The onResolve callback to add.
   */
  addOnResolves(onResolve: OnResolve) {
    this._resolves.push(onResolve)
  }

  /**
   * Gets the array of onResolve callbacks.
   * @returns {OnResolve[]} The array of onResolve callbacks.
   */
  get onResolves(): OnResolve[] {
    return this._resolves
  }

  /**
   * Disposes of the scope, clearing all stored values and callbacks.
   */
  async dispose() {
    for (const d of this.defers) {
      d();
    }

    this.store.clear()
    this.defers = []
    this._resolves = []
    this.listeners.clear()
  }

  /**
   * Removes an executor from the scope.
   * @param {Executor<unknown>} executor - The executor to remove.
   */
  async remove(executor: Executor<unknown>) {
    this.store.delete(executor)
  }

}

/**
 * Creates and returns a new Scope instance.
 * @function
 * @param {...Scope} scopes - Those scopes will be used as fallbacks.
 * @returns {Scope} A new Scope instance.
 */
export function createScope(...scopes: Scope[]): Scope {
  return new FallbackScope(scopes)
}

class FallbackScope extends Scope {
  constructor(
    private scopes: Scope[]
  ) {
    super()
  }

  has(executor: Executor<unknown>, self = false): boolean {
    if (self) {
      return super.has(executor)
    }

    return this.scopes.some(s => s.has(executor)) || super.has(executor)
  }

  resolve<T>(executor: EODE<T>): Promise<T> {
    const _executor = executor as Executor<unknown>
    if (super.has(_executor)) {
      return super.get(_executor) as Promise<T>
    }

    for (const scope of this.scopes) {
      if (_executor.perferredScope === scope) {
        return scope.resolve(executor)
      }

      if (scope.has(_executor)) {
        return scope.get(_executor) as Promise<T>
      }
    }

    return super.resolve(executor)
  }
}

/**
 * Returns the global scope instance.
 * This function provides access to the singleton global scope,
 * which can be used for dependency injection and management across the application.
 * 
 * @function
 * @returns {Scope} The global scope instance.
 */
export function getScope(): Scope {
  return globalScope
}

const globalScope = createScope()

/**
 * Disposes of the global scope.
 * This function calls the dispose method on the global scope instance,
 * clearing all stored values and callbacks.
 * 
 * @function
 * @returns {void}
 */
export function dispose(): void {
  globalScope.dispose()
}

/**
 * Represents an executor that can resolve a value, reset its state, and substitute itself.
 * @template Value The type of value this executor resolves to.
 */
export interface Executor<Value> {
  readonly id: ExecutorId
  readonly provider: Provider<Value, unknown> | ProviderClass<Value>
  readonly input: EODE<unknown> | undefined
  readonly dependencies: Executor<unknown>[] | undefined
  perferredScope: Scope | undefined
  readonly source: boolean

  /**
   * A symbol property that identifies this object as an Executor.
   */
  readonly [x: symbol]: true
}

const executorSymbol = Symbol.for('$submodule')

export function isExecutor<P>(obj: unknown): obj is Executor<P> {
  return obj?.[executorSymbol]
}

/**
 * Executor or destructed executor
 * 
 * This utility let you a way to combine executors into a completed executor
 * 
 * @example
 * 
 * input requires { a: string, b: number }
 * 
 * type EODE<{ a: string, b: number }> = Executor<{ a: string, b: number }> | { a: Executor<string>, b: Executor<number> }
 */
export type EODE<D> = Executor<D> | { [key in keyof D]: Executor<D[key]> }

let index = 0

export type Option = {
  /** indicate whether the Executor is the original source or not (provide vs combine) */
  source?: boolean
  /** name to be added to the id may help with debugging */
  id?: string
}

/**
 * Creates an Executor for a given provider or provider class, with optional dependencies.
 * 
 * @template P The type of the provided value
 * @template D The type of the dependencies (if unknown)
 * 
 * @param {Provider<P, D> | ProviderClass<P>} provider - A provider function or class
 * @param {EODE<D>} [input] - Optional dependencies required by the provider
 * @returns {Executor<P>} An executor for the provided value
 */
export function create<P, D>(
  provider: Provider<P, D> | ProviderClass<P>,
  input: EODE<D> | undefined,
  dependencies: Executor<unknown>[] | undefined,
  option: Option
): Executor<P> {
  const idString = `submodule-${index++}${option.id ? `-${option.id}` : ''}`
  const id = idString as ExecutorId
  let preferredScope: Scope | undefined = undefined

  const executor = {
    get id() { return id },
    get provider() { return provider },
    get dependencies() { return dependencies },
    get input() { return input },
    get source() { return option.source || false },
    get perferredScope() { return preferredScope },
    set perferredScope(scope) {
      preferredScope = scope
    },
    [Symbol.for('$submodule')]: true,
  } satisfies Executor<P>

  return executor
}

/**
 * Creates an Executor that always resolves to the given value.
 * This is useful for wrapping constant values in the Executor interface.
 * 
 * @template Provide The type of the value to be provided
 * @param {Provide} value The constant value to be wrapped
 * @returns {Executor<Provide>} An Executor that resolves to the given value
 * 
 * @example
 * const constantExecutor = value(42);
 * // constantExecutor will always resolve to 42
 * 
 * @example
 * const configExecutor = value({ apiKey: 'abc123', maxRetries: 3 });
 * // configExecutor will always resolve to the given configuration object
 */
export const value = <Provide>(value: Provide): Executor<Provide> => provide(() => value)

/**
 * Groups similar Executors together.
 * 
 * @template Provide The type of value that the grouped Executors provide
 * @param {...Executor<Provide>[]} values The Executors to group
 * @returns {Executor<Provide[]>} An Executor that resolves to an array of the provided values
 * 
 * @example
 * const executor1 = value(1);
 * const executor2 = value(2);
 * const groupedExecutor = group(executor1, executor2);
 * // groupedExecutor will resolve to [1, 2]
 */
/* v8 ignore start */
export const group = <
  E extends Executor<unknown>[]
>(...values: E): Executor<{ [K in keyof E]: inferProvide<E[K]> }> => map(
  scoper,
  async (scope) => {
    const resolved = await Promise.all(values.map(v => scope.resolve(v)))
    return resolved as { [K in keyof E]: inferProvide<E[K]> }
  }
)
/* v8 ignore stop */

/**
 * Creates an executor that provides the current scope.
 * This can be useful when you need access to the scope within other executors or providers.
 * 
 * There are some usecases where you want to have access to the current scope.
 * For example, conditional resolves, lazy resolves, etc.
 * 
 * @example
 * const myExecutor = create(async (scope) => {
 *   // Now you can use currentScope...
 *   return process.env.PGLITE ? scope.resovle(pgLiteImpl) : scope.resolve(pgImpl);
 * }, scoper);
 */
export const scoper = create(
  new ProviderClass(
    async (scope) => scope
  ),
  undefined,
  undefined,
  { source: false, id: 'scoper' }
)

/**
 * Flattens a nested Executor structure by resolving the outer Executor and then resolving the inner Executor.
 * Useful for creating conditional implementations.
 * 
 * @template T The type of the value provided by the innermost Executor
 * 
 * @example
 * const nestedExecutor = create(() => create(() => 'Hello, World!'));
 * const flattenedExecutor = flat(nestedExecutor);
 * const result = await resolve(flattenedExecutor); // 'Hello, World!'
 */
export const flat = <T>(executor: Executor<Executor<T>>) => map(
  scoper,
  async scoper => {
    const target = await scoper.resolve(executor)
    return scoper.resolve(target)
  },
  { source: false, id: 'flat' }
)

export type inferProvide<T> = T extends Executor<infer S> ? S : never

type CombinedExecutor<
  L extends Record<string, Executor<unknown>>,
  O extends { [key in keyof L]: inferProvide<L[key]> }
> = Executor<O> & {
  separate: () => L
}

/**
 * Combines multiple Executors into a single Executor that resolves to an object.
 * 
 * @template L An object type where values are Executors
 * @param {L} layout An object (or array) where each value is an Executor
 * @returns {Executor<{ [key in keyof L]: inferProvide<L[key]> }>} An Executor that resolves to an object with the same keys as the input, but with resolved values
 * 
 * @example
 * const nameExecutor = create(() => 'John');
 * const ageExecutor = create(() => 30);
 * const combinedExecutor = combine({ name: nameExecutor, age: ageExecutor });
 * const anothercombined = combine([nameExecutor, ageExecutor]);
 * const result = await resolve(combinedExecutor);
 * console.log(result); // { name: 'John', age: 30 }
 */
export function combine<
  L extends Record<string, Executor<unknown>>,
  O extends { [key in keyof L]: inferProvide<L[key]> }
>(
  layout: L,
  pOption?: Option
): CombinedExecutor<L, O> {
  function separate() {
    return layout as L
  }

  const option = pOption ?? { source: false }

  const executor = create(
    async (scope) => {
      if (Array.isArray(layout)) {
        const resolved = await Promise.all(layout.map(e => scope.resolve(e)))

        return resolved as unknown as O & { separate: () => L }
      }

      const layoutPromise = Object.entries(layout).map(
        async ([key, executor]) => [key, await scope.resolve(executor)] as const
      );

      const result = Object.fromEntries(await Promise.all(layoutPromise));
      return result as (O & { separate: () => L });
    },
    scoper,
    Object.values(layout),
    option
  );

  Object.defineProperty(executor, 'separate', { value: separate })

  return executor as unknown as CombinedExecutor<L, O>
}

/**
 * Utitiliy function to normalize an executor
 * 
 * @param valueOrExecutor value to be normalized
 * @returns 
 */
export function normalize<T>(valueOrExecutor: T | Executor<T>): Executor<T> {
  return isExecutor(valueOrExecutor) ? valueOrExecutor : value(valueOrExecutor)
}

/**
 * Function to complete a template. Helpful on creating a library, reusable code block
 * Pair with factoryize to create a complete module
 * 
 * @param provider 
 * @param fulfillment 
 * @returns 
 */
export function produce<P, D>(
  provider: Executor<Fn<P, D>>,
  fulfillment: EODE<D>
) {
  return map(
    {
      provider,
      fulfillment: isExecutor(fulfillment) ? fulfillment : combine(fulfillment)
    },
    ({ provider, fulfillment }) => {
      return provider(fulfillment)
    },)
}

/**
 * Slightly better version of create, with a few more variants
 * @param source 
 * @param mapper 
 * @returns 
 */
export function map<P, D>(
  source: EODE<P>,
  mapper: Fn<D, P> | Executor<Fn<D, P>>,
  pOption?: Option
): Executor<D> {
  const id = `${pOption?.id ? pOption.id : ''}-map`
  const _source = isExecutor(source) ? source : combine(source)

  if (isExecutor(mapper)) {
    return create((
      { _source, mapper }) => {
      return mapper(_source)
    },
      combine({ _source, mapper }),
      [_source],
      { ...pOption, source: pOption?.source || true, id }
    )
  }

  return create(mapper, _source, [_source], { source: pOption?.source || true, id })
}

/* v8 ignore start */
/**
 * Shortcut for flat(map(...))
 */
export function flatMap<P, D>(
  provider: Executor<P>,
  mapper: Fn<Executor<D>, P>,
  option?: Option
): Executor<D> {
  return flat(map(provider, mapper, option))
}

/**
 * Shortcut for flat(provide(...))
 */
export function flatProvide<P>(
  provider: Executor<Executor<P>>
): Executor<P> {
  return flat(provider)
}
/* v8 ignore stop */

/**
 * Equavilant to create, but with a slightly clearer meaning
 * 
 * @param factory function to create the value
 * @returns 
 */
export function provide<P>(
  provider: Fn<P, never>,
  option?: Option
): Executor<P> {
  return create(provider, undefined, undefined, { source: option?.source || false, id: option?.id })
}


export const sortedStringifyKeyBuilder = (key: unknown): string => {
  if (typeof key === 'function') {
    return key.toString()
  }

  if (typeof key !== 'object' || key === null) {
    return JSON.stringify(key)
  }

  if (Array.isArray(key)) {
    return JSON.stringify(key.map(item => typeof item === 'object' && item !== null ? sortObjectKeys(item as Record<string, unknown>) : item))
  }

  if ('id' in key) {
    return String(key.id)
  }

  const sortedObject = sortObjectKeys(key as Record<string, unknown>)
  return JSON.stringify(sortedObject)
}

const sortObjectKeys = (obj: Record<string, unknown>): Record<string, unknown> => {
  const sortedKeys = Object.keys(obj).sort()
  return sortedKeys.reduce((acc, k) => {
    const value = obj[k]
    acc[k] = Array.isArray(value)
      ? value.map(item => typeof item === 'object' && item !== null ? sortObjectKeys(item as Record<string, unknown>) : item)
      : typeof value === 'object' && value !== null
        ? sortObjectKeys(value as Record<string, unknown>)
        : value
    return acc
  }, {} as Record<string, unknown>)
}

type FamilyOptions<K, P> = {
  keyBuilder?: (key: K | Executor<K>) => string | undefined
  poolControl?: (
    pool: Map<string, [K, Executor<P>]>,
    param: { key: string, rawKey: K, executor: Executor<P> }
  ) => void
}

type KeyedExecutor<K, P> = Executor<(key: K) => P> | ((key: K) => P)
type Family<K, P> = ((key: K | Executor<K>) => Executor<P>) & {
  size: () => number
  rawMembers: () => [K, Executor<P>][]
  members: () => Executor<P>[]
  groupedMembers: () => Executor<P[]>
}


/**
 * createFamily is a function that creates a family of executors.
 * The family can then provide a corresponding executor based on the key.
 * 
 * @param executor 
 * @param options 
 * @returns 
 */
export function createFamily<K, P>(
  executor: KeyedExecutor<K, P>,
  options?: FamilyOptions<K, P>
): Family<K, P> {
  const pool = new Map<string, [K, Executor<P>]>()
  const keyBuilder = options?.keyBuilder ?? sortedStringifyKeyBuilder
  const defaultPoolControl = (
    pool: Map<string, [K | Executor<K>, Executor<P>]>,
    { key, rawKey, executor }: { key: string, rawKey: K | Executor<K>, executor: Executor<P> }
  ) => {
    pool.set(key, [rawKey, executor])
  }

  const poolControl = options?.poolControl ?? defaultPoolControl

  const fn = (key: K | Executor<K>) => {
    const keyString = keyBuilder(key)

    if (!keyString) {
      throw new Error(`invalid key: ${key}`)
    }

    const normalizedKey = isExecutor(key) ? key : value(key)
    const normalizedFn = isExecutor(executor) ? executor : value(executor)

    if (!pool.has(keyString)) {
      const exec = map({ fn: normalizedFn, key: normalizedKey }, ({ fn, key }) => fn(key))
      poolControl(pool, { key: keyString, rawKey: key, executor: exec })
    }

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return pool.get(keyString)![1]
  }

  fn.size = () => pool.size
  fn.rawMembers = () => Array.from(pool.values())
  fn.members = () => Array.from(pool.values()).map(([_, executor]) => executor)
  fn.groupedMembers = () => group(...Array.from(pool.values()).map(([_, executor]) => executor))

  return fn as Family<K, P>
}

export type { ObservableSet, ObservableGet }

/**
 * @example
 * const [getter, setter] = provideObservable(0);
 * // Use getter to subscribe to value changes
 * // Use setter to update the value
 */
type ProvideObservableFn = <Value>(initialValue: Value | Executor<Value>, opts?: ObservableOpts<Value>) => [
  Executor<ObservableGet<Value>>,
  Executor<ObservableSet<Value>>
]

/**
 * Provide an observable
 * @param initialValue 
 * @returns 
 */
export const provideObservable: ProvideObservableFn = (initialValue, opts) => {
  const normalizedValue = isExecutor(initialValue) ? initialValue : value(initialValue)

  const observable = map({ scoper, normalizedValue }, ({ scoper, normalizedValue }) => {
    const [read, write] = createObservable(normalizedValue, opts)

    scoper.addDefer(() => read.cleanup())
    return [read, write] as const
  })

  const observableGet = map(observable, ([read]) => read)
  const observableSet = map(observable, ([, write]) => write)

  return [observableGet, observableSet]
}

export function combineObservables<Upstreams extends Record<string, unknown>, Value>(
  upstreams: { [K in keyof Upstreams]: Executor<ObservableGet<Upstreams[K]>> },
  transform: (upstreams: Upstreams, prev: Value) => Value,
  initialValue: Value,
  options?: ObservableOpts<Value>
): Executor<ObservableGet<Value>>

export function combineObservables<Upstreams extends Record<string, unknown>>(
  upstreams: { [K in keyof Upstreams]: Executor<ObservableGet<Upstreams[K]>> },
  options?: ObservableOpts<Upstreams>
): Executor<ObservableGet<Upstreams>>

/**
 * Combine multiple observables into a single observable
 * @param upstreams 
 * @returns 
 */
export function combineObservables<Upstreams extends Record<string, unknown>, Value>(
  upstreams: { [K in keyof Upstreams]: Executor<ObservableGet<Upstreams[K]>> },
  ptransform?: ObservableOpts<Value> | ((upstreams: Upstreams, prev?: Value) => Value),
  initialValue?: Value,
  poptions?: ObservableOpts<Value>
): Executor<ObservableGet<Value>> | Executor<ObservableGet<Upstreams>> {
  return map(
    { upstreams: combine(upstreams), scoper },
    ({ upstreams, scoper }) => {
      const transform = typeof ptransform === 'function'
        ? ptransform
        : undefined
      const options = typeof ptransform === 'function'
        ? poptions
        : ptransform

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const observable = createCombineObservables<Upstreams, Value>(upstreams, transform as any, initialValue as any, options)

      scoper.addDefer(observable.cleanup)
      return observable
    }
  )
}