export type Cleanup = () => void

export type ObservableOpts<Value> = {
  createSnapshot?: (value: Value) => Value
  equality?: (prev: Value, next: Value) => boolean
  onMount?: (setValue: ObservableSet<Value>, getValue: () => Value) => Cleanup | undefined
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

  const mountedCleanup = opts.onMount?.(setter, () => currentValue)

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

export function createTransformedObservable<Upstream, Downstream>(
  upstream: ObservableGet<Upstream>,
  transform: (upstream: Upstream, prevValue: Downstream) => Downstream,
  initialValue: Downstream,
  options?: ObservableOpts<Downstream>
): ObservableGet<Downstream> {
  const [observable, setObservable] = createObservable(transform(upstream.value, initialValue), options)
  const cleanup = upstream.onValue((next) => {
    setObservable(prev => {
      const transformedValue = transform(next, prev)
      return transformedValue
    })
  })

  return {
    cleanup: () => {
      cleanup()
      observable.cleanup()
    },
    onValue: observable.onValue,
    get value() { return observable.value }
  }
}

export function transformFn<Upstream, Downstream>(
  transform: (upstream: Upstream, prevValue: Downstream) => Downstream,
): (upstream: Upstream, prevValue: Downstream) => Downstream {
  return transform
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

  const initialValues = getValues()

  const transformedInitialValue = transform
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ? transform(initialValues, initialValue as any) : initialValues

  const [observable, setObservable] = createObservable(transformedInitialValue, options)

  const setter = (prev: Value | Upstreams, key: keyof Upstreams, next: Upstreams[typeof key]) => {
    const values = getValues()

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const nextValue = transform ? transform(values, prev as any) : values
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

export function createGroupObservables<Upstreams extends Array<unknown>, Value>(
  upstreams: Array<ObservableGet<Upstreams[number]>>,
  transform: (upstreams: Upstreams, prev: Value) => Value,
  initialValue: Value,
  options?: ObservableOpts<Value>
): ObservableGet<Value>

export function createGroupObservables<Upstreams extends Array<unknown>>(
  upstreams: Array<ObservableGet<Upstreams[number]>>,
  options?: ObservableOpts<Upstreams>
): ObservableGet<Upstreams>

export function createGroupObservables<
  Upstreams extends Array<unknown>,
  Value
>(
  upstreams: Array<ObservableGet<Upstreams[number]>>,
  ptransform?: ((upstreams: Upstreams, prev: Value) => Value) | ObservableOpts<Value>,
  initialValue?: Value,
  poptions?: ObservableOpts<Value>
): ObservableGet<Value> | ObservableGet<Upstreams> {
  const getValues = () => upstreams.map(upstream => upstream.value) as Upstreams

  const transform = typeof ptransform === 'function'
    ? ptransform
    : undefined

  const options = typeof ptransform === 'function'
    ? poptions
    : ptransform

  const initialValues = getValues()

  const transformedInitialValue = transform
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    ? transform(initialValues, initialValue as any) : initialValues

  const [observable, setObservable] = createObservable(transformedInitialValue, options)

  const setter = (prev: Value | Upstreams, key: keyof Upstreams, next: Upstreams[typeof key]) => {
    const values = getValues()

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const nextValue = transform ? transform(values, prev as any) : values
    setObservable(nextValue)
  }

  const cleanups = upstreams.map((upstream, index) => {
    return upstream.onValue((next) => {
      setter(observable.value, index, next)
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
