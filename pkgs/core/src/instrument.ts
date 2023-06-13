export function isPromise(value: any) {
  return value === Promise.resolve(value)
}

type Fn = {
  name: string
  fn: (...args: any) => any
}

type CallContext = {
  that: unknown
  args: IArguments
}

type ExecuteState = { state: 'execute' }
type ErrorState = { state: 'error', error: unknown } 
type NormalState = { state: 'result', result: unknown }

export type CallResult = ExecuteState
  | ErrorState
  | NormalState

export type InstrumentHandler = {
  name?: string
  onExecute?: (context: Fn & CallContext & ExecuteState) => void | Partial<CallContext & Fn & ExecuteState>
  onError?: (context: Fn & CallContext & ErrorState & { isPromise: boolean }) => void | ErrorState | NormalState
  onResult?: (context: Fn & CallContext & NormalState & { isPromise: boolean }) => void | ErrorState | NormalState
}

export type CreateInstrumentHandler = InstrumentHandler | (() => InstrumentHandler)

export const createInstrument = (opts: CreateInstrumentHandler): InstrumentHandler => {
  return typeof opts === 'function'
    ? opts()
    : opts
}

export function createInstrumentor(opts: CreateInstrumentHandler): InstrumentFunction {
  return function (fn, fnName) {
    let name = opts?.name || fn.name || fnName || 'anonymous'
    
    const handler = typeof opts === 'function'
      ? opts()
      : opts

    const f = function () {
      let that = this
      let args = arguments
      let func = fn

      try {
        const executeState = handler.onExecute?.({ name, fn, that, args, state: 'execute' })
        if (executeState !== undefined) {
          that = executeState.that || that
          args = executeState.args || args
          func = executeState.fn || func as any
          name = executeState.name || name   
        }
        
        let result = func.apply(that, args)
        
        if (isPromise(result)) {
          return result
            .then((next: unknown) => {
              const promiseResultState = handler.onResult?.({ name, fn: func, that, args, state: 'result', result: next, isPromise: true })
              
              if (promiseResultState?.state === 'result') {
                return promiseResultState.result
              } 
              
              if (promiseResultState?.state === 'error') {
                throw promiseResultState.error
              }

              return next
            })
            .catch((error: unknown) => {
              const errorState = handler.onError?.({ name, fn: func, that, args, error, state: 'error', isPromise: true })

              if (errorState?.state === 'error') {
                throw errorState.error
              }

              if (errorState?.state === 'result') {
                return errorState.result
              }

              throw error
            })
        } else {
          const resultState = handler.onResult?.({ name, fn: func, that, args, state: 'result', result: undefined, isPromise: false })
          
          if (resultState?.state === 'error') {
            throw resultState.error
          }  
          
          if (resultState?.state === 'result') {
            return resultState.result
          }

          return result
        }
      } catch (error) {
        const errorState = handler.onError?.({ name, fn: func, that, args, error, state: 'error', isPromise: false })

        if (errorState?.state === 'error') {
          throw errorState.error
        }

        if (errorState?.state === 'result') {
          return errorState.result
        }

        throw error
      }
    } as typeof fn

    Object.defineProperty(f, 'name', {
      value: name,
      writable: false
    });

    return f
  }
}

export type InstrumentFunction = <X extends Fn['fn']>(fn: X, name?: string) => X

export function instrument<T>(container: T, instrumentFn: InstrumentFunction, maxLevel = 1, currentLevel = 0): T {
  if (container === null || container === undefined) return container
  if (currentLevel > maxLevel) return container

  if ( // there can be more
    typeof container !== 'object' ||
    Array.isArray(container)
  ) {
    return container
  }

  Object.keys(container).forEach(key => {
    const instance = container[key]
    if (typeof instance === 'function') {
      container[key] = instrumentFn(instance, key)
    } else {
      container[key] = instrument(container[key], instrumentFn, maxLevel, currentLevel + 1)
    }
  })

  return container
}

export function nextInstrument(prev: InstrumentFunction | undefined, inst: CreateInstrumentHandler) {
  const next = createInstrumentor(createInstrument(inst))

  const mixin: InstrumentFunction = (fn, name) => {
    const instrumented = prev?.(fn, name) || fn
    return next(instrumented, name)
  }

  return mixin
}

export function composeInstrument(...ins: CreateInstrumentHandler[]) {
  return ins.reduceRight((prev, next) => {
    return nextInstrument(prev, next)
  }, undefined as InstrumentFunction | undefined)
}