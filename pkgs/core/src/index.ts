export class ProviderClass<Provide, Input = unknown> {
  constructor(
    public provider: (scope: Scope, input: Input) => Provide | Promise<Provide>,
  ) { }
}

type Provider<Provide, Input = unknown> = (input: Input) => Provide | Promise<Provide>

type OnResolve = {
  filter: (target: unknown) => boolean,
  cb: <T>(target: T) => T
}

type Defer = (e?: unknown) => void | Promise<void>

export class Scope {
  constructor(
    private store = new Map<Executor<any>, Promise<any>>(),
    private resolves: OnResolve[] = [],
    private defers: Defer[] = []
  ) { }

  has(executor: Executor<any>) {
    return this.store.has(executor)
  }

  async get<T>(executor: Executor<T>): Promise<T> {
    return this.store.get(executor)
  }

  set<T>(executor: Executor<T>, v: T | Promise<T> | Executor<T>) {
    if (this.store.has(executor)) {
      return
    }

    if (isExecutor(v)) {
      this.store.set(executor, v.resolve(this))
      return
    }

    this.store.set(executor, Promise.resolve(v))
  }

  resolveValue<T>(executor: Executor<T>, value: T | Executor<T>) {
    if (this.store.has(executor)) {
      return
    }

    if (isExecutor(value)) {
      this.store.set(executor, value.resolve(this))
      return
    }

    this.store.set(executor, Promise.resolve(value))
  }

  async resolve<T>(executor: EODE<T>): Promise<T> {
    return isExecutor(executor)
      ? executor.resolve(this)
      : combine(executor).resolve(this)
  }

  async execute<Dependent, Output>(
    executable: Provider<Output, Dependent>,
    dependency: EODE<Dependent>
  ): Promise<Awaited<Output>> {
    const value = await this.resolve(dependency)
    return await executable(value)
  }

  prepare<Dependent, Input extends Array<any>, Output>(
    provider: (provide: Dependent, ...input: Input) => Output,
    dependency: EODE<Dependent>,
  ): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>> {
    const scope = this
    return async function () {
      const that = this
      const args = arguments
      return execute(async (d) => provider.call(that, d, ...args), dependency, scope)
    }
  }

  addDefer(deferer: Defer) {
    this.defers.push(deferer)
  }

  addOnResolves(onResolve: OnResolve) {
    this.resolves.push(onResolve)
  }

  get onResolves() {
    return this.resolves
  }

  async dispose() {
    this.defers.forEach(d => d())

    this.store.clear()
    this.defers = []
    this.resolves = []
  }
}

export function createScope() {
  return new Scope()
}

export function getScope() {
  return globalScope
}

const globalScope = createScope()

export function dispose() {
  globalScope.dispose()
}

export interface Executor<Value> {
  resolve(scope: Scope): Promise<Value>
  reset(): void
  subs(executor: Executor<Value>): void
  readonly [x: symbol]: true
}

const executorSymbol = Symbol.for('$submodule')

export function isExecutor<P, D>(obj: any): obj is Executor<P> {
  return obj?.[executorSymbol]
}

export class Execution<Input extends Array<any>, Output, Dependency> {
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

export function createExecution<Dependency, Input extends Array<any>, Output>(
  executor: (dependency: Dependency, ...input: Input) => Output | Promise<Output>,
  dependency: Executor<Dependency>
): Execution<Input, Output, Dependency> {
  return new Execution(executor, dependency)
}

type EODE<D> = Executor<D> | { [key in keyof D]: Executor<D[key]> }

export function create<P>(providerClass: ProviderClass<P>): Executor<P>
export function create<P, D>(providerClass: ProviderClass<P, D>, dependencies: EODE<D>): Executor<P>
export function create<P>(provider: Provider<P>): Executor<P>
export function create<P, D>(provider: Provider<P, D>, dependencies: EODE<D>): Executor<P>
export function create<P, D>(provider: Provider<P, D> | ProviderClass<P, D>, dependencies?: EODE<D>): Executor<P> {
  let substitution: Executor<P> | undefined

  let modifiableDependency = dependencies
    ? isExecutor(dependencies) ? dependencies : combine(dependencies)
    : undefined

  async function resolve(scope: Scope): Promise<P> {
    if (scope.has(executor)) {
      return await scope.get(executor)
    }

    if (substitution) {
      return await scope.resolve(substitution)
    }

    const promise = Promise.resolve()
      .then(() => modifiableDependency?.resolve(scope))
      .then(async (actualized) => {
        if (provider instanceof ProviderClass) {
          return provider.provider(scope, actualized as D)
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

  const executor: Executor<P> = { subs, reset, resolve, [Symbol.for('$submodule')]: true }

  return executor
}

export const value = <Provide>(value: Provide) => create(() => value)
export const group = <Provide>(...values: Executor<Provide>[]) => create(
  new ProviderClass(
    async (scope) => Promise.all(values.map(v => scope.resolve(v))),
  )
)

export const scoper = create(new ProviderClass(async (scope) => scope))

export function prepare<Dependent, Input extends Array<any>, Output>(
  provider: ((provide: Dependent, ...input: Input) => Output),
  dependency: EODE<Dependent>,
  scope: Scope = getScope()
): (...input: Input) => Promise<Awaited<Output>> {
  const execution = new Execution(provider, dependency)
  return execution.resolve(scope)
}

export async function execute<Dependent, Output>(
  executable: Provider<Output, Dependent>,
  dependency: EODE<Dependent>,
  scope: Scope = getScope()
): Promise<Awaited<Output>> {
  const execution = new Execution(executable, dependency)
  return execution.executeIn(scope)
}

export async function resolve<T>(executor: Executor<T>, scope: Scope = getScope()): Promise<T> {
  return await scope.resolve(executor)
}

export function resolveValue<T>(
  executor: Executor<T>,
  value: T | Executor<T>,
  scope: Scope = getScope()
) {
  scope.resolveValue(executor, value)
}

export type inferProvide<T> = T extends Executor<infer S> ? S : never

export function combine<
  L extends Record<string, Executor<any>>
>(layout: L): Executor<{ [key in keyof L]: inferProvide<L[key]> }> {
  return create(new ProviderClass(async (scope) => {
    const layoutPromise = Object.entries(layout).map(([key, executor]) => executor.resolve(scope).then(value => [key, value] as const))
    const result = Object.fromEntries(await Promise.all(layoutPromise))
    return result as any
  }))
}

