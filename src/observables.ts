type Cleanup = () => void

export type ValueProvider<Value, Controller = undefined> = (
  setter: (next: Value | ((prev?: Value) => Value), done?: boolean) => void
) => {
  cleanup?: Cleanup
} & (
    Controller extends undefined ? { controller?: undefined } : { controller: Controller }
  )

export type Observable<Value, Controller> = {
  readonly nextValue: Promise<Value>
  readonly hasNext: boolean
  controller: Controller;
  cleanup: Cleanup
  onValue: (callback: (value: Value) => void) => Cleanup
  onDone: (callback: Cleanup) => Cleanup
}

export function createObservable<Value, Controller = undefined>(
  provider: ValueProvider<Value, Controller>
): Observable<Value, Controller> {
  function prepareNextValue() {
    let resolve: (value: Value) => void
    const nextValue = new Promise<Value>((_resolve, _reject) => {
      resolve = _resolve
    })
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    return { nextValue, resolve: resolve! }
  }

  const nextCallbacks = new Set<(value: Value) => void>()
  const doneCallbacks = new Set<(value: Value) => void>()

  let hasNext = true
  let nextValue: Promise<Value>
  let resolve: (value: Value) => void

  const nextValueContainer = prepareNextValue()
  nextValue = nextValueContainer.nextValue
  resolve = nextValueContainer.resolve

  const setter = (next: Value, done: boolean) => {
    resolve(next)

    if (!hasNext) {
      return
    }

    if (done) {
      hasNext = false
    } else {
      const nextValueContainer = prepareNextValue()
      nextValue = nextValueContainer.nextValue
      resolve = nextValueContainer.resolve
    }

    for (const listener of nextCallbacks) {
      listener(next)
    }
  }

  const { controller, cleanup } = provider(setter)
  const _cleanup = () => {
    cleanup?.()
    nextCallbacks.clear()
  }

  return {
    get nextValue() {
      return nextValue
    },
    get hasNext() {
      return hasNext
    },
    controller: controller as Controller,
    cleanup: _cleanup,
    onValue(callback) {
      nextCallbacks.add(callback)
      return () => {
        nextCallbacks.delete(callback)
      }
    },
    onDone(callback) {
      doneCallbacks.add(callback)
      return () => {
        doneCallbacks.delete(callback)
      }
    }
  }
}

export type PipeDispatcher<Value, UpstreamValue> = (
  value: UpstreamValue,
  dispatcher: (next: Value | ((prev?: Value) => Value), done?: boolean) => void
) => void

export function pipe<UpstreamValue, Value>(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  source: Observable<UpstreamValue, any>,
  dispatcher: PipeDispatcher<Value, UpstreamValue>,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
): Observable<Value, any> {
  // biome-ignore lint/suspicious/noExplicitAny: we don't care about the controller type
  return createObservable<Value, any>(setter => {

    const cleanup = source.onValue(next => {
      dispatcher(next, setter)
    })

    return {
      cleanup: () => {
        cleanup
      }
    }
  })
}
