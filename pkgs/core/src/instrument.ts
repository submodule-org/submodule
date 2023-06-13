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
type PromiseNormalState = { state: 'promiseResult', result: unknown }
type PromiseErrorState = { state: 'promiseError', error: unknown }

export type CallResult = ExecuteState
  | ErrorState
  | NormalState
  | PromiseNormalState
  | PromiseErrorState

export type InstrumentHandler = {
  name?: string
  onExecute?: (context: Fn & CallContext & ExecuteState) => void | Partial<CallContext & Fn & ExecuteState>
  onError?: (context: Fn & CallContext & ErrorState) => void | ErrorState | NormalState
  onResult?: (context: Fn & CallContext & NormalState) => void | ErrorState | NormalState
  onPromiseResult?: (context: Fn & CallContext & PromiseNormalState) => void | PromiseErrorState | PromiseNormalState
  onPromiseError?: (context: Fn & CallContext & PromiseErrorState) => void | PromiseErrorState | PromiseNormalState
}

export type CreateInstrumentHandler = InstrumentHandler | (() => InstrumentHandler)

export function createInstrumentor(opts: CreateInstrumentHandler): InstrumentFunction {
  return function (fn, fnName) {
    let name = opts?.name || fnName || fn.name
    
    const handler = typeof opts === 'function'
      ? opts()
      : opts

    return function () {
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
        if (result === undefined) {
          const resultState = handler.onResult?.({ name, fn: func, that, args, state: 'result', result: undefined })
          
          if (resultState?.state === 'error') {
            throw resultState.error
          }  
          
          if (resultState?.state === 'result') {
            return resultState.result
          }

          return
        } else if (isPromise(result)) {
          return result
            .then((next: unknown) => {
              const promiseResultState = handler.onPromiseResult?.({ name, fn: func, that, args, state: 'promiseResult', result: next })
              
              if (promiseResultState?.state === 'promiseResult') {
                return promiseResultState.result
              } 
              
              if (promiseResultState?.state === 'promiseError') {
                throw promiseResultState.error
              }

              return next
            })
            .catch((error: unknown) => {
              const promiseErrorState = handler.onPromiseError?.({ name, fn: func, that, args, state: 'promiseError', error })

              if (promiseErrorState?.state === 'promiseError') {
                throw promiseErrorState.error
              }

              if (promiseErrorState?.state === 'promiseResult') {
                return promiseErrorState.result
              }

              throw error
            })
        } else {
          const resultState = handler.onResult?.({ name, fn: func, that, args, state: 'result', result: result })
          
          if (resultState?.state === 'error') {
            throw resultState.error
          }  
          
          if (resultState?.state === 'result') {
            return resultState.result
          }

          return result
        }
      } catch (error) {
        const errorState = handler.onError?.({ name, fn: func, that, args, error, state: 'error' })

        if (errorState?.state === 'error') {
          throw errorState.error
        }

        if (errorState?.state === 'result') {
          return errorState.result
        }

        throw error
      }
    } as typeof fn
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