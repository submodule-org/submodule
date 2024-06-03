class ProviderClass<Provide, Input = unknown> {
  constructor(
    private provider: (scope: Scope, input: Input) => Provide | Promise<Provide>,
    private dependencies?: Executor<Input, unknown>
  ) {}

  async run(scope: Scope): Promise<Provide> {
    const input = this.dependencies ? scope.resolve(this.dependencies) : undefined
    return this.provider(scope, input as Input)
  }
}

type Provider<Provide, Input = unknown> = (input: Input) => Provide | Promise<Provide>

export class Scope {
  constructor(private store = new Map<Executor<any, any>, Promise<any>>()) {}

  has(executor: Executor<any, any>) {
    return this.store.has(executor)
  }

  async get<T>(executor: Executor<T, any>): Promise<T> {
    return this.store.get(executor)
  }

  async set(executor: Executor<any, any>, value: any) {
    this.store.set(executor, value)
  }

  resolveValue<T>(executor: Executor<T, any>, value: T | Executor<T, any>) {
    if (this.store.has(executor)) {
      return
    }

    if (isExecutor(value)) {
      this.store.set(executor, value.resolve(this))
      return
    }

    this.store.set(executor, Promise.resolve(value))
  }

  async resolve<T>(executor: Executor<T, any>): Promise<T> {
    return executor.resolve(this)
  }

  async execute<Dependent, Output>(
    executable: Provider<Output, Dependent>, 
    dependency: Executor<Dependent, unknown>
  ): Promise<Awaited<Output>> {
    const value = await this.resolve(dependency)
    return await executable(value)
  }

  prepare<Dependent, Input extends Array<any>, Output>(
    provider: (provide: Dependent, ...input: Input) => Output,
    dependency: Executor<Dependent, unknown>,
  ): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>>  {
    return async function () {
      const that = this
      const args = arguments
      return execute(async (d) => provider.call(that, d, ...args), dependency)
    }
  }
}

export function createScope() {
  return new Scope()
}

export function getScope() {
  return globalScope
}

const globalScope = createScope()

export type Executor<Value, Dependent> = {
  resolve(scope: Scope): Promise<Value>
  readonly [x: symbol]: true
}

const executorSymbol = Symbol.for('$submodule')

function isExecutor<P, D>(obj: any): obj is Executor<P, D> {
  return obj?.[executorSymbol]
}

export function create<P, D>(providerClass: ProviderClass<P, D>): Executor<P, D>
export function create<P>(provider: Provider<P>): Executor<P, unknown>
export function create<P, D>(provider: Provider<P, D>, dependencies: Executor<D, unknown>): Executor<P, D>
export function create<P, D>(provider: Provider<P, D> | ProviderClass<P, D>, dependencies?: Executor<D, unknown>): Executor<P, D> {
  async function resolve(scope: Scope): Promise<P> {
    if (provider instanceof ProviderClass) {
      return await provider.run(scope)
    }

    if (scope.has(executor)) {
      return await scope.get(executor)
    }

    const promise = Promise.resolve()
      .then(() => dependencies?.resolve(scope))
      .then(async (actualized) => {
        if (provider.length > 0 && actualized === undefined) {
          throw new Error(`invalid state, provider ${provider.toString()} requires dependent but not provided`)
        }

        return provider(actualized as D)
      })
      .catch((e) => {
        throw e
      })
      
    scope.set(executor, promise)
    return await promise
  }

  const executor: Executor<P, D> = { resolve, [Symbol.for('$submodule')]: true }

  return executor
}

export const value = <Provide>(value: Provide) => create(() => value)

export const prepare = <Dependent, Input extends Array<any>, Output>(
  provider: (provide: Dependent, ...input: Input) => Output,
  dependency: Executor<Dependent, unknown>,
  scope: Scope = getScope()
): (...input: Input) => Promise<Awaited<ReturnType<typeof provider>>> => {
  return scope.prepare(provider, dependency)
}

export async function execute<Dependent, Output>(
  executable: Provider<Output, Dependent>, 
  dependency: Executor<Dependent, unknown>,
  scope: Scope = getScope()
): Promise<Awaited<Output>> {
  return await scope.execute(executable, dependency)
}

export async function resolve<T>(executor: Executor<T, any>, scope: Scope = getScope()): Promise<T> {
  return await scope.resolve(executor)
}

export function resolveValue<T>(
  executor: Executor<T, any>, 
  value: T | Executor<T, any>,
  scope: Scope = getScope()
) {
  scope.resolveValue(executor, value)
}

export type inferProvide<T> = T extends Executor<infer S, any> ? S : never

export const combine = function <L extends Record<string, Executor<any, any>>>(layout: L): Executor<{ [key in keyof L]: inferProvide<L[key]> }, unknown> {
  return create(new ProviderClass(async (scope) => {
    const layoutPromise = Object.entries(layout).map(([key, executor]) => executor.resolve(scope).then(value => [key, value] as const))
    const result = Object.fromEntries(await Promise.all(layoutPromise))
    return result as any
  }))
}

