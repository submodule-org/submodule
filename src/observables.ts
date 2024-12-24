type Cleanup = () => void

type Snapshot = {
  createSnapshot: (value: unknown) => void
  equality: (prev: unknown, next: unknown) => boolean
}

export type Observable<Value> = {
  readonly value: Value
  readonly cleanup: Cleanup
  onValue: (callback: (value: Value) => void, opts?: Partial<Snapshot>) => Cleanup
  setValue: (next: Value | ((prev: Value) => Value)) => void
}

export function createObservable<Value>(
  initialValue: Value,
  opts: Snapshot = {
    createSnapshot: structuredClone,
    equality: Object.is
  }
): Observable<Value> {
  const listeners = new Map<
    (value: Value) => void,
    {
      snapshot: unknown,
      createSnapshot?: (value: unknown) => void,
      equality?: (prev: unknown, next: unknown) => boolean
    }
  >()

  let currentValue = initialValue

  const setter = (
    next: Value | ((prev: Value) => Value),
  ) => {
    const defaultCreateSnapshot = opts.createSnapshot
    const defaultEquality = opts.equality

    const nextValue = typeof next === 'function' ? (next as (prev: Value) => Value)(currentValue) : next

    if (Object.is(currentValue, nextValue)) {
      return
    }

    currentValue = nextValue
    for (const [listener, snapshotkit] of listeners) {
      const { snapshot,
        createSnapshot = defaultCreateSnapshot,
        equality = defaultEquality
      } = snapshotkit

      const nextSnapshot = createSnapshot(nextValue)
      if (!equality(snapshot, nextSnapshot)) {
        listener(nextValue)
      }
    }
  }

  const _cleanup = () => {
    listeners.clear()
  }

  return {
    get value() {
      return currentValue
    },
    setValue(next) {
      setter(next)
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
  }
}

export type PipeDispatcher<Value, UpstreamValue> = (
  value: UpstreamValue,
  dispatcher: (next: Value | ((prev: Value) => Value), done?: boolean) => void
) => void

export function pipe<UpstreamValue, Value>(
  upstream: Observable<UpstreamValue>,
  dispatcher: PipeDispatcher<Value, UpstreamValue>,
  initialValue: Value
): Observable<Value> {
  const downstream = createObservable(initialValue)

  upstream.onValue(value => {
    dispatcher(value, downstream.setValue)
  })

  return downstream
}
