import { setInstrument, CreateInstrumentHandler, composeInstrument } from "@submodule/core"
import { InstrumentFunction } from "@submodule/core/src/instrument"
import { AsyncLocalStorage } from "async_hooks"

const store = new AsyncLocalStorage<FlowContext>()

export function getFlowContext(): FlowContext | undefined {
  return store.getStore()
}

// scoped plugin
setInstrument({
  onExecute({ fn, name }) {
    const ctx = store.getStore()
    if (!ctx?.instrument) return

    return {
      fn: ctx.instrument(fn, name)
    }
  }
})

type FlowOptions = {
  id?: string
  plugins?: CreateInstrumentHandler[]
}

type FlowContext = {
  id: string
  instrument?: InstrumentFunction
}

let globalId = 0

type FlowResult<Data> = {
  state: 'success'
  data: Data
  context: FlowContext
} | {
  state: 'error'
  error: unknown
  context: FlowContext
}

type AnyFn = (...args: any[]) => any

export async function execute(
  script: AnyFn, ctx?: FlowOptions
): Promise<Pick<FlowContext, 'id'> & FlowResult<Promise<Awaited<ReturnType<typeof script>>>>> {
  const instrument = composeInstrument(...ctx?.plugins || [])

  const context: FlowContext = {
    id: ctx?.id || String(++globalId),
    instrument
  }

  try {
    const result = await store.run(context, () => {
      return script()
    })
    return {
      id: context.id,
      state: 'success',
      data: result,
      context
    }
  } catch (error) {
    return {
      id: context.id,
      state: 'error',
      error,
      context
    }
  }
}

export const use = (ctx: FlowOptions) => ({
  execute(script: AnyFn) {
    return execute(script, ctx)
  }
})

export const flow = {
  use, execute
}