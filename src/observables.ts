export type Cleanup = () => void

export type ObservableOpts<Value> = {
  createSnapshot?: (value: Value) => Value
  equality?: (prev: Value, next: Value) => boolean
  onMount?: (setValue: ObservableSet<Value>) => Cleanup | undefined
}

export type ObservableGet<Value> = {
  readonly cleanup: Cleanup
  readonly value: Value
  onValue: (callback: (value: Value) => void, opts?: Partial<ObservableOpts<Value>>) => Cleanup
}

export function observableGet<Value>(
  observable: ObservableGet<Value>
): ObservableGet<Value> {
  return observable
}

export type ObservableSet<Value> =
  (next: Value | ((prev: Value) => Value)) => void

const defaultObservableOpts: ObservableOpts<unknown> = {
  createSnapshot: (value) => structuredClone(value),
  equality: Object.is
}

export function createObservable<Value>(
  initialValue: Value,
  popts?: ObservableOpts<Value>
): [ObservableGet<Value>, ObservableSet<Value>] {
  const listeners = new Set<(value: Value) => void>()

  const opts = { ...popts } as ObservableOpts<Value>
  type RO = Required<ObservableOpts<Value>>

  const defaultCreateSnapshot = opts.createSnapshot || defaultObservableOpts.createSnapshot as RO['createSnapshot']
  const defaultEquality = opts.equality || defaultObservableOpts.equality as RO['equality']

  let currentValue = defaultCreateSnapshot(initialValue)

  const setter: ObservableSet<Value> = (next) => {
    const nextValue = typeof next === 'function' ? (next as (prev: Value) => Value)(currentValue) : next
    const nextSnapshot = defaultCreateSnapshot(nextValue)

    if (defaultEquality(currentValue, nextSnapshot)) {
      return
    }

    currentValue = nextSnapshot

    for (const listener of listeners) {
      queueMicrotask(() => listener(currentValue))
    }
  }

  const mountedCleanup = opts.onMount?.(setter)

  const _cleanup = () => {
    listeners.clear()
    mountedCleanup?.()
  }

  return [{
    get value() {
      return currentValue
    },
    get cleanup() {
      return _cleanup
    },
    onValue: (callback) => {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    }
  }, setter]
}

export function createCombineObservables<Upstreams extends Record<string, unknown>, Value>(
  upstreams: { [K in keyof Upstreams]: ObservableGet<Upstreams[K]> },
  transform: (upstreams: Upstreams, prev: Value) => Value,
  initialValue: Value,
  options?: ObservableOpts<Value>
): ObservableGet<Value>

export function createCombineObservables<Upstreams extends Record<string, unknown>>(
  upstreams: { [K in keyof Upstreams]: ObservableGet<Upstreams[K]> },
  options?: ObservableOpts<Upstreams>
): ObservableGet<Upstreams>

export function createCombineObservables<
  Upstreams extends Record<string, unknown>,
  Value
>(
  upstreams: { [K in keyof Upstreams]: ObservableGet<Upstreams[K]> },
  ptransform?: ((upstreams: Upstreams, prev: Value) => Value) | ObservableOpts<Value>,
  initialValue?: Value,
  poptions?: ObservableOpts<Value>
): ObservableGet<Value> | ObservableGet<Upstreams> {
  const upstreamKeys = Object.keys(upstreams) as Array<keyof Upstreams>
  const getValues = () => Object.fromEntries(
    upstreamKeys.map(key => [key, upstreams[key].value])
  ) as Upstreams

  const transform = typeof ptransform === 'function'
    ? ptransform
    : undefined

  const options = typeof ptransform === 'function'
    ? poptions
    : ptransform

  const transformedInitialValue = transform
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ? transform(getValues(), initialValue as any) : getValues()

  const [observable, setObservable] = createObservable(transformedInitialValue, options)

  const setter = (prev: Value | Upstreams, key: keyof Upstreams, next: Upstreams[typeof key]) => {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const nextValue = transform ? transform(getValues(), prev as any) : getValues()
    setObservable(nextValue)
  }

  const cleanups = upstreamKeys.map(key => {
    return upstreams[key].onValue((next) => {
      setter(observable.value, key, next)
    })
  })

  return {
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
      observable.cleanup()

    },
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    onValue: observable.onValue as any,
    get value() { return observable.value },
  } as ObservableGet<Value> | ObservableGet<Upstreams>
}
