type Cleanup = () => void

type WithController<V, C> = C extends undefined
  ? V & { controller?: C }
  : V & { controller: C }

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Consumer<Value, Controller> = Prettify<WithController<{
  get(): Value
  onValue(next: (value: Value) => void): Cleanup
  pipe<Downstream>(
    dispatcher: PipeDispatcher<Downstream, Value>,
    onNext: (value: Downstream) => void,
    options?: {
      createSnapshot?: (value: Value) => Value,
      equality?: Equality
    }
  ): Cleanup
  cleanup: Cleanup
}, Controller>>

export type ConsumerN<Value, Controller> = Prettify<WithController<{
  get(): Value | undefined
  onValue(next: (value: Value) => void): Cleanup
  pipe<Downstream>(
    dispatcher: PipeDispatcher<Downstream, Value>,
    onNext: (value: Downstream) => void,
    options?: {
      createSnapshot?: (value: Value) => Value,
      equality?: Equality
    }
  ): Cleanup
  cleanup: Cleanup
}, Controller>>

export type Dispatcher<P> = (next: (P | ((current: P) => P))) => void
export type DispatcherN<P> = (next: (P | ((current?: P) => P))) => void

export type Stream<Value, Controller = undefined> = {
  publishable: WithController<{
    initialValue: Value
    cleanup?: Cleanup
  }, Controller>
  dispatcher: Dispatcher<Value>
  get: () => Value
}

export type StreamN<P, Controller = undefined> = {
  publishable: WithController<{
    initialValue?: undefined
    cleanup?: Cleanup
  }, Controller>
  dispatcher: DispatcherN<P>
  get: () => P | undefined
}

export type Equality = (a: unknown, b: unknown) => boolean

const asIsSnapshot = <P>(value: P): P => value

/**
 * Observable utility without providing initial value
 * 
 * @param source 
 * @param options 
 * @returns 
 */
export function observableN<
  Value,
  Controller = undefined,
  S extends StreamN<Value, Controller> = StreamN<Value, Controller>
>(
  source: (
    dispatcher: S['dispatcher'],
    get: S['get']
  ) => S['publishable'],
  options?: {
    createSnapshot?: (value: Value) => Value,
    equality?: Equality
  }
): ConsumerN<Value, Controller> {
  const createSnapshot = options?.createSnapshot ?? asIsSnapshot
  const equality = options?.equality ?? Object.is

  const listeners = new Set<(value: Value) => void>()

  let initialValue: Value | undefined

  const set: S['dispatcher'] = next => {
    const snapshot = initialValue ? createSnapshot(initialValue) : undefined
    const nextValue = typeof next === 'function'
      ? (next as (current?: Value) => Value)(snapshot)
      : next

    if (equality(initialValue, nextValue)) {
      return
    }

    initialValue = nextValue
    for (const listener of listeners) {
      listener(initialValue)
    }
  }

  const get = () => initialValue

  const publisher = source(set, get)
  const pipeCleanups = new Set<Cleanup>()
  const cleanup = () => {
    for (const pipeCleanup of pipeCleanups) {
      pipeCleanup()
    }

    pipeCleanups.clear()
    publisher.cleanup?.()
    listeners.clear()
  }

  const consumable: Consumable<Value> = {
    onValue(next) {
      listeners.add(next)

      return () => {
        listeners.delete(next)
      }
    },
  }

  return {
    get: () => get(),
    onValue(next) {
      listeners.add(next)

      return () => {
        listeners.delete(next)
      }
    },
    get controller() {
      return publisher.controller
    },
    pipe: <Downstream>(
      dispatcher: PipeDispatcher<Downstream, Value>,
      onNext: (value: Downstream) => void,
      options?: SnapshotOpts<Downstream>
    ): Cleanup => {
      const pipedObservable = pipe(
        consumable,
        dispatcher,
        options
      )

      pipedObservable.onValue(onNext)

      pipeCleanups.add(pipedObservable.cleanup)
      return () => {
        pipeCleanups.delete(pipedObservable.cleanup)
      }
    },
    cleanup
  } as ConsumerN<Value, Controller>
}

type SnapshotOpts<Value> = {
  createSnapshot?: (value: Value) => Value,
  equality?: Equality
}

/**
 * An utility function to transform a publisher to a observable resource
 * 
 * @param source of the publisher. See Publisher type for more information
 * @param options 
 * @returns Consumer. See Consumer type for more information
 */
export function observable<
  Value,
  Controller = undefined,
  S extends Stream<Value, Controller> = Stream<Value, Controller>
>(
  source: (
    dispatcher: S['dispatcher'],
    get: S['get']
  ) => S['publishable'],
  options?: SnapshotOpts<Value>
): Consumer<Value, Controller> {
  const createSnapshot = options?.createSnapshot ?? asIsSnapshot
  const equality = options?.equality ?? Object.is

  const listeners = new Set<(value: Value) => void>()

  let initialValue: Value

  const set: S['dispatcher'] = next => {
    const snapshot = createSnapshot(initialValue)
    const nextValue = typeof next === 'function'
      ? (next as (current: Value) => Value)(snapshot)
      : next

    if (equality(initialValue, nextValue)) {
      return
    }

    initialValue = nextValue
    for (const listener of listeners) {
      listener(initialValue)
    }
  }

  const get = () => initialValue

  const publisher = source(set, get)
  initialValue = publisher.initialValue

  const pipeCleanups = new Set<Cleanup>()
  const cleanup = () => {
    for (const pipeCleanup of pipeCleanups) {
      pipeCleanup()
    }

    pipeCleanups.clear()
    listeners.clear()
  }

  const consumable: Consumable<Value> = {
    onValue(next) {
      listeners.add(next)

      return () => {
        listeners.delete(next)
      }
    },
  }

  return {
    get: () => get(),
    onValue: consumable.onValue,
    pipe: <Downstream>(
      dispatcher: PipeDispatcher<Downstream, Value>,
      onNext: (value: Downstream) => void,
      options?: SnapshotOpts<Downstream>
    ): Cleanup => {
      const pipedObservable = pipe<Downstream, Value>(
        consumable,
        dispatcher,
        options
      )

      pipedObservable.onValue(onNext)

      pipeCleanups.add(pipedObservable.cleanup)
      return () => {
        pipeCleanups.delete(pipedObservable.cleanup)
      }
    },
    get controller() {
      return publisher.controller
    },
    cleanup
  } as Consumer<Value, Controller>
}

export type PipeDispatcher<P, UpstreamValue> = (value: UpstreamValue, dispatcher: DispatcherN<P>) => void


export type Consumable<Value> = {
  onValue(next: (value: Value) => void): Cleanup
}
/**
 * 
 * Derive the incoming stream of value into a new stream of value
 * 
 * @param upstream 
 * @param transform 
 * @param pre 
 * @param post 
 * @returns 
 */
export function pipe<Value, UpstreamValue>(
  upstream: Consumable<UpstreamValue>,
  setter: PipeDispatcher<Value, UpstreamValue>,
  options?: {
    createSnapshot?: (value: Value) => Value,
    equality?: Equality
  }
): ConsumerN<Value, undefined> {
  return observableN<Value, undefined>(dispatcher => {
    let mounted = false
    const _setter = (value: UpstreamValue) => {
      mounted && setter(value, dispatcher)
    }

    const cleanup = upstream.onValue(value => {
      mounted = true
      _setter(value)
    })

    return {
      initialValue: undefined,
      cleanup,
    }
  }, options)
}