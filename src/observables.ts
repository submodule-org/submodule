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

export type ObservableSet<Value> = (next: Value | ((prev: Value) => Value)) => void

export function createObservable<Value>(
  initialValue: Value,
  opts: Snapshot<Value> = {
    createSnapshot: structuredClone,
    equality: Object.is
  }
): [ObservableGet<Value>, ObservableSet<Value>] {
  const listeners = new Map<
    (value: Value) => void,
    {
      snapshot: unknown,
      createSnapshot?: (value: unknown) => void,
      equality?: (prev: unknown, next: unknown) => boolean
    }
  >()

  let currentValue = initialValue

  const setter: ObservableSet<Value> = (next) => {
    const defaultCreateSnapshot = opts.createSnapshot
    const defaultEquality = opts.equality

    const nextValue = typeof next === 'function' ? (next as (prev: Value) => Value)(currentValue) : next

    if (Object.is(currentValue, nextValue)) {
      return
    }

    currentValue = nextValue
    for (const [listener, snapshotkit] of listeners) {
      const {
        snapshot,
        createSnapshot = defaultCreateSnapshot,
        equality = defaultEquality
      } = snapshotkit

      const nextSnapshot = createSnapshot(nextValue)
      if (!equality(snapshot as Value, nextSnapshot as Value)) {
        listener(nextValue)
      }
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
    onValue: (callback, opts) => {
      const snapshot = opts?.createSnapshot?.(currentValue) || currentValue
      listeners.set(callback, {
        snapshot,
        ...opts
      })

      return () => listeners.delete(callback)
    }
  }, setter]
}

export type PipeDispatcher<Value, UpstreamValue> = (
  value: UpstreamValue,
  dispatcher: (next: Value | ((prev: Value) => Value)) => void
) => void

export function pipe<UpstreamValue, Value>(
  upstream: ObservableGet<UpstreamValue>,
  dispatcher: PipeDispatcher<Value, UpstreamValue>,
  initialValue: Value
): ObservableGet<Value> {
  const [downstream, setDownstream] = createObservable(initialValue)

  upstream.onValue(value => {
    dispatcher(value, setDownstream)
  })

  return downstream
}
