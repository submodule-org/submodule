export class ProviderClass<Provide> {
  constructor(
    public provider: (scope: Scope, self: Executor<Provide>) => Provide | Promise<Provide>,
  ) { }
}

type Provider<Provide, Input = unknown> = (input: Input) => Provide | Promise<Provide>

type OnResolve = {
  filter: (target: unknown) => boolean,
  cb: <T>(target: T) => T
}

type Defer = (e?: unknown) => void | Promise<void>

/**
 * Represents a scope in the dependency injection system.
 * A scope acts as a value holder and manages the lifecycle of dependencies.
 * Middleware can be applied at the scope level.
 * While there's a default global scope, multiple scopes can be created as needed.
 */
export class Scope {
  private aliases: Map<unknown, Executor<unknown>>

  constructor(
    private store = new Map<Executor<unknown>, Promise<unknown>>(),
    private _resolves: OnResolve[] = [],
    private defers: Defer[] = []
  ) { }

  /**
   * Checks if an executor has been resolved in this scope.
   * @param {Executor<unknown>} executor - The executor to check.
   * @returns {boolean} True if the executor has been resolved, false otherwise.
   */
  has(executor: Executor<unknown>): boolean {
    return this.store.has(executor)
  }

  /**
   * Retrieves the resolved value of an executor.
   * @template T
   * @param {Executor<T>} executor - The executor to retrieve the value for.
   * @returns {Promise<T>} A promise that resolves to the value.
   */
  async get<T>(executor: Executor<T>): Promise<T | undefined> {
    return this.store.get(executor) as (T | undefined)
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
      this.store.set(executor, v.resolve(this, executor))
      return
    }

    this.store.set(executor, Promise.resolve(v))
  }

  setAlias<T>(alias: unknown, executor: Executor<T>) {
    this.aliases.set(alias, executor)
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
      this.store.set(executor, value.resolve(this, value))
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
  async resolve<T>(executor: EODE<T>): Promise<T> {
    if (isExecutor(executor)) {
      return executor.resolve(this, executor)
    }

    const combined = combine(executor)
    return combined.resolve(this, combined)
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

  async resolveAlias<T>(alias: unknown): Promise<T | undefined> {
    const executor = this.aliases.get(alias)
    if (!executor) {
      return
    }

    return await this.resolve(executor) as T
  }

  /**
   * Executes a provider with its dependencies.
   * @deprecated use run instead
   * @template Dependent
   * @template Output
   * @param {Provider<Output, Dependent>} executable - The provider to execute.
   * @param {EODE<Dependent>} dependency - The dependencies for the provider.
   * @returns {Promise<Awaited<Output>>} A promise that resolves to the output of the provider.
   */
  async execute<Dependent, Output>(
    executable: Provider<Output, Dependent>,
    dependency: EODE<Dependent>
  ): Promise<Awaited<Output>> {
    const value = await this.resolve(dependency)
    return await executable(value)
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
   * Prepares a provider for execution with its dependencies. 
   * @template Dependent
   * @template Input
   * @template Output
   * @param {(provide: Dependent, ...input: Input) => Output} provider - The provider function.
   * @param {EODE<Dependent>} dependency - The dependencies for the provider.
   * @returns {(...input: Input) => Promise<Awaited<ReturnType<typeof provider>>>} A function that executes the provider with its dependencies.
   */
  prepare<Dependent, Input extends Array<unknown>, Output>(
    provider: (provide: Dependent, ...input: Input) => Output,
    dependency: EODE<Dependent>,
  ): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>> {
    const scope = this
    return async function (...args: unknown[]) {
      return execute(async (d) => provider.call(this, d, ...args), dependency, scope)
    }
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

  has(executor: Executor<unknown>): boolean {
    return this.scopes.some(s => s.has(executor)) || super.has(executor)
  }

  async resolve<T>(executor: EODE<T>): Promise<T> {
    const _executor = executor as Executor<unknown>
    if (super.has(_executor)) {
      return super.get(_executor) as Promise<T>
    }

    for (const scope of this.scopes) {
      if (scope.has(_executor)) {
        return scope.resolve(_executor) as Promise<T>
      }
    }

    return await super.resolve(executor)
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
  id: symbol

  /**
   * Resolves the value within the given scope.
   * @param scope The scope in which to resolve the value.
   * @returns A promise that resolves to the value.
   */
  resolve(scope: Scope, ref: Executor<Value>): Promise<Value>

  /**
   * Resets the executor to its initial state.
   */
  reset(): void

  /**
   * Substitutes this executor with another executor of the same type.
   * If scope that the Executor is being resolved in has already resolved this executor,
   * it will keep the resolved value and not resolve the new executor until reset.  
   * 
   * @param executor The executor to substitute this one with.
   */
  subs(executor: Executor<Value>): void

  /**
   * A symbol property that identifies this object as an Executor.
   */
  readonly [x: symbol]: true
}

const executorSymbol = Symbol.for('$submodule')

export function isExecutor<P, D>(obj: unknown): obj is Executor<P> {
  return obj?.[executorSymbol]
}

export class Execution<Input extends Array<unknown>, Output, Dependency> {
  constructor(
    private executor: (dependency: Dependency, ...input: Input) => Output | Promise<Output>,
    private dependency: EODE<Dependency>
  ) { }

  async executeIn(scope: Scope, ...input: Input): Promise<Awaited<Output>> {
    const dependency = await scope.resolve(this.dependency)
    return await this.executor(dependency, ...input)
  }

  async execute(...input: Input): Promise<Awaited<Output>> {
    return await this.executeIn(getScope(), ...input)
  }

  resolve(scope: Scope = getScope()): (...input: Input) => Promise<Awaited<Output>> {
    return this.executeIn.bind(this, scope)
  }

}

export function createExecution<Dependency, Input extends Array<unknown>, Output>(
  executor: (dependency: Dependency, ...input: Input) => Output | Promise<Output>,
  dependency: Executor<Dependency>
): Execution<Input, Output, Dependency> {
  return new Execution(executor, dependency)
}

export type EODE<D> = Executor<D> | { [key in keyof D]: Executor<D[key]> }

/**
 * Creates an Executor for a given provider or provider class.
 * 
 * @template P The type of the provided value
 * 
 * @param {ProviderClass<P>} providerClass - A provider class without dependencies
 * @returns {Executor<P>} An executor for the provided value
 * @deprecated use provide instead
 */
export function create<P>(providerClass: ProviderClass<P>): Executor<P>

/**
 * Creates an Executor for a given provider function without dependencies.
 * 
 * @template P The type of the provided value
 * 
 * @param {Provider<P>} provider - A provider function without dependencies
 * @returns {Executor<P>} An executor for the provided value
 * @deprecated use provide instead
 */
export function create<P>(provider: Provider<P>): Executor<P>

/**
 * Creates an Executor for a given provider function with dependencies.
 * 
 * @template P The type of the provided value
 * @template D The type of the dependencies
 * 
 * @param {Provider<P, NoInfer<D>>} provider - A provider function with dependencies
 * @param {EODE<D>} dependencies - The dependencies required by the provider function
 * @returns {Executor<P>} An executor for the provided value
 * @deprecated use map instead
 */
export function create<P, D>(provider: Provider<P, NoInfer<D>>, dependencies: EODE<D>): Executor<P>

/**
 * Creates an Executor for a given provider or provider class, with optional dependencies.
 * 
 * @template P The type of the provided value
 * @template D The type of the dependencies (if unknown)
 * 
 * @param {Provider<P, D> | ProviderClass<P, D>} provider - A provider function or class
 * @param {EODE<D>} [dependencies] - Optional dependencies required by the provider
 * @returns {Executor<P>} An executor for the provided value
 */
export function create<P, D>(provider: Provider<P, D> | ProviderClass<P>, dependencies?: EODE<D>): Executor<P> {
  let substitution: Executor<P> | undefined

  const modifiableDependency = dependencies
    ? isExecutor(dependencies) ? dependencies : combine(dependencies)
    : undefined

  async function resolve(scope: Scope, ref: Executor<P>): Promise<P> {
    if (scope.has(executor)) {
      return await scope.get(executor) as Promise<P>
    }

    if (substitution) {
      return await scope.resolve(substitution)
    }

    const promise = Promise.resolve()
      .then(() => modifiableDependency?.resolve(scope, modifiableDependency))
      .then(async (actualized) => {
        if (provider instanceof ProviderClass) {
          return provider.provider(scope, ref)
        }

        if (provider.length > 0 && actualized === undefined) {
          throw new Error(`invalid state, provider ${provider.toString()} requires dependent but not provided`)
        }

        return provider(actualized as D)
      })
      .then((actualized) => {
        for (const onResolve of scope.onResolves) {
          if (onResolve.filter(actualized)) {
            return onResolve.cb(actualized)
          }
        }

        if (actualized === undefined || actualized === null) {
          scope.remove(ref)
        }

        return actualized
      })
      .catch((e) => {
        throw e
      })

    scope.set(executor, promise)
    return await promise
  }


  function subs(executor: Executor<P>) {
    substitution = executor
  }

  function reset() {
    substitution = undefined
  }

  const executor: Executor<P> = { id: Symbol(), subs, reset, resolve, [Symbol.for('$submodule')]: true }

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
export const value = <Provide>(value: Provide): Executor<Provide> => create(() => value)

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
>(...values: E): Executor<{ [K in keyof E]: inferProvide<E[K]> }> => create(
  new ProviderClass(
    async (scope) => {
      const resolved = await Promise.all(values.map(v => scope.resolve(v)))
      return resolved as { [K in keyof E]: inferProvide<E[K]> }
    }
  )
)
/* v8 ignore stop */

/**
 * Creates a unimplemented executor that throws an error when resolved.
 * This can be used as a placeholder for dependencies that will be implemented later.
 * 
 * @template Provide The type of value that this executor will eventually provide
 * @returns {Executor<Provide>} An executor that throws an error when resolved
 * 
 * @example
 * const willBeResolved = unImplemented<string>();
 * // Later, implement the dependency:
 * willBeResolved.subs(value('actual value'));
 */
export const unImplemented = <Provide>(): Executor<Provide> => {
  return create<Provide>(() => {
    throw new Error('not implemented')
  })
}

/**
 * Create a function to shape an expected output type.
 * Useful for creating a desired series of output types, for example, a route, a cmd.
 * 
 * @template Provide The type of value that the Executor will provide
 * @returns A function that takes an Executor and returns it unchanged
 * 
 * @example
 * const routeFactory = factory<Hono>();
 * const loginroute = routeFactory(create() {
 *   return Hono...
 * })
 */
export const factory = <Provide>() => (impl: Executor<Provide>): Executor<Provide> => {
  return impl
}

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
export const scoper = create(new ProviderClass(async (scope) => scope))

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
export const flat = <T>(executor: Executor<Executor<T>>) => create(async scoper => {
  const target = await scoper.resolve(executor)
  return scoper.resolve(target)
}, scoper)

/**
 * @deprecated
 */
export function prepare<Dependent, Input extends Array<unknown>, Output>(
  provider: ((provide: Dependent, ...input: Input) => Output),
  dependency: EODE<Dependent>,
  scope: Scope = getScope()
): (...input: Input) => Promise<Awaited<Output>> {
  const execution = new Execution(provider, dependency)
  return execution.resolve(scope)
}

/**
 * @deprecated
 */
export async function execute<Dependent, Output>(
  executable: Provider<Output, Dependent>,
  dependency: EODE<Dependent>,
  scope: Scope = getScope()
): Promise<Awaited<Output>> {
  const execution = new Execution(executable, dependency)
  return execution.executeIn(scope)
}

export type inferProvide<T> = T extends Executor<infer S> ? S : never

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
  L extends Record<string, Executor<unknown>>
>(layout: L): Executor<{ [key in keyof L]: inferProvide<L[key]> }> & { separate: () => L } {
  function separate() {
    return layout as L
  }

  const executor = create(new ProviderClass(async (scope) => {

    if (Array.isArray(layout)) {
      const resolved = await Promise.all(layout.map(e => scope.resolve(e)))


      return resolved as unknown as ({ [key in keyof L]: inferProvide<L[key]> } & { separate: () => L })
    }

    const layoutPromise = Object.entries(layout).map(
      async ([key, executor]) => [key, await scope.resolve(executor)] as const
    );

    const result = Object.fromEntries(await Promise.all(layoutPromise));
    return result as ({ [key in keyof L]: inferProvide<L[key]> } & { separate: () => L });
  }));

  Object.defineProperty(executor, 'separate', { value: separate })

  return executor as unknown as Executor<{ [key in keyof L]: inferProvide<L[key]> }> & { separate: () => L }
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
 * Utility function to turn a Provider into a template. Helpful on creating a library, reusable code block
 * Pair with produce to create a complete module
 * 
 * @param provider 
 * @returns 
 */
export function factorize<P, D>(
  provider: Executor<Provider<P, D>> | Provider<P, D>
): (key: D | Executor<D>) => Executor<P> {
  return (key: D | Executor<D>) => create(async ({ provider, dependency }) => {
    return provider(dependency)
  }, { provider: normalize(provider), dependency: normalize(key) })
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
  provider: Executor<Provider<P, D>>,
  fulfillment: EODE<D>
) {
  return create(({ provider, fulfillment }) => {
    return provider(fulfillment)
  }, {
    provider,
    fulfillment: isExecutor(fulfillment) ? fulfillment : combine(fulfillment)
  })
}

/**
 * Slightly better version of create, with a few more variants
 * @param source 
 * @param mapper 
 * @returns 
 */
export function map<P, D>(
  source: EODE<P>,
  mapper: Provider<D, P> | Executor<Provider<D, P>>
): Executor<D> {
  const _source = isExecutor(source) ? source : combine(source)

  if (isExecutor(mapper)) {
    return create(({ _source, mapper }) => {
      return mapper(_source)
    }, combine({ _source, mapper }))
  }

  return create(mapper, _source)
}

/* v8 ignore start */
export function flatMap<P, D>(
  provider: Executor<P>,
  mapper: Provider<Executor<D>, P>
): Executor<D> {
  return flat(map(provider, mapper))
}
/* v8 ignore stop */

/**
 * Equavilant to create, but with a slightly clearer meaning
 * 
 * @param factory function to create the value
 * @returns 
 */
export function provide<P>(
  provider: Provider<P>
): Executor<P> {
  return create(provider)
}


const sortedStringifyKeyBuilder = (key: unknown): string => {
  if (typeof key !== 'object' || key === null) {
    return JSON.stringify(key)
  }

  if ('id' in key) {
    return String(key.id)
  }

  const sortedKeys = Object.keys(key).sort()
  const sortedObject = sortedKeys.reduce((acc, k) => {
    const value = (key as Record<string, unknown>)[k]
    acc[k] = typeof value === 'object' && value !== null ? sortedStringifyKeyBuilder(value) : value
    return acc
  }, {} as Record<string, unknown>)
  return JSON.stringify(sortedObject)
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