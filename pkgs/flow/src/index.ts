import { defaultProviderOptions } from "@submodule/core"
import utils from "util"

import { AsyncLocalStorage } from "async_hooks"

const asyncStore = new AsyncLocalStorage<ShellContext>()

type Fn = {
  name: string
  fn: (...args: any) => any
}

type CallContext = {
  that: unknown
  args: IArguments
}

type CallResult = { state: 'execute' }
  | { state: 'error', error: unknown }
  | { state: 'result', result: unknown }
  | { state: 'promiseResult', result: unknown }
  | { state: 'promiseError', error: unknown }

type InstrumentHandler = {
  onExecute?: (context: Fn & CallContext & Extract<CallResult, { state: 'execute' }>) => void
  onError?: (context: Fn & CallContext & Extract<CallResult, { state: 'error' }>) => void
  onResult?: (context: Fn & CallContext & Extract<CallResult, { state: 'result' }>) => void
  onPromiseResult?: (context: Fn & CallContext & Extract<CallResult, { state: 'promiseResult' }>) => void
  onPromiseError?: (context: Fn & CallContext & Extract<CallResult, { state: 'promiseError' }>) => void
}

function wrap<F extends  Fn['fn']>(name: string, fn: F, opts: InstrumentHandler | (() => InstrumentHandler)): F {
  const handler = typeof opts === 'function'
    ? opts()
    : opts
  
  return function () {
    const that = this
    const args = arguments
    try {
      handler.onExecute?.({ name, fn, that, args, state: 'execute' })
      const result = fn.apply(that, args)
      if (result === undefined) {
        handler.onResult?.({ name, fn, that, args, state: 'result', result: undefined })
        return
      } else if (utils.types.isPromise(result)) {
        return result
          .then(next => {
            handler.onPromiseResult?.({ name, fn, that, args, state: 'promiseResult', result: next })
            return next
          })
          .catch(error => {
            handler.onPromiseError?.({ name, fn, that, args, state: 'promiseError', error })
            throw error
          })
      } else {
        handler.onResult?.({ name, fn, that, args, state: 'result', result: result })
        return result
      }
    } catch (error) {
      handler.onError?.({ name, fn, that, args, error, state: 'error' })
      throw error
    }
  } as typeof fn
}

defaultProviderOptions.instrument = (name, fn) => wrap(name, fn, () => {
  return {}
})

type ShellContext = {
  id: string
}

let globalId = 0

type ShellSetting = {
  id?: string
  instrument?: InstrumentHandler 
}

export async function shell(executor: () => any, shellSetting?: ShellSetting): Promise<ShellContext & { data: Awaited<ReturnType<typeof executor>> }> {
  const id = globalId++
  const context = { id: shellSetting?.id || String(id) }
  const data = await asyncStore.run(context, executor)

  return { ...context, data }
}