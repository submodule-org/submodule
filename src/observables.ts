type Cleanup = () => void

type Snapshot<Value> = {
  createSnapshot: (value: Value) => Value
  equality: (prev: Value, next: Value) => boolean
}

export type ObservableGet<Value> = {
  readonly cleanup: Cleanup
  readonly value: Value
  onValue: (callback: (value: Value) => void, opts?: Partial<Snapshot<Value>>) => Cleanup
}

export type ObservableSet<Value> =
  (next: Value | ((prev: Value) => Value)) => void

export function createObservable<Value>(
  initialValue: Value,
  opts: Snapshot<Value> = {
    createSnapshot: structuredClone,
    equality: Object.is
  }
): [ObservableGet<Value>, ObservableSet<Value>] {
  const listeners = new Set<(value: Value) => void>()

  const defaultCreateSnapshot = opts.createSnapshot
  const defaultEquality = opts.equality

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

  const _cleanup = () => {
    listeners.clear()
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
      return () => listeners.delete(callback)
    }
  }, setter]
}

export function createCombineObservables<Upstreams extends Record<string, unknown>, Value>(
  upstreams: { [K in keyof Upstreams]: ObservableGet<Upstreams[K]> },
  transform: (upstreams: Upstreams, prev?: Value) => Value,
  initialValue: Value
): ObservableGet<Value>

export function createCombineObservables<Upstreams extends Record<string, unknown>>(
  upstreams: { [K in keyof Upstreams]: ObservableGet<Upstreams[K]> },
): ObservableGet<Upstreams>

export function createCombineObservables<
  Upstreams extends Record<string, unknown>,
  Value
>(
  upstreams: { [K in keyof Upstreams]: ObservableGet<Upstreams[K]> },
  transform?: (upstreams: Upstreams, prev: Value) => Value,
  initialValue?: Value
): ObservableGet<Value> | ObservableGet<Upstreams> {
  const upstreamKeys = Object.keys(upstreams) as Array<keyof Upstreams>
  const getValues = () => Object.fromEntries(
    upstreamKeys.map(key => [key, upstreams[key].value])
  ) as Upstreams

  const transformedInitialValue = transform
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ? transform(getValues(), initialValue as any) : getValues()

  const [observable, setObservable] = createObservable(transformedInitialValue)

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
