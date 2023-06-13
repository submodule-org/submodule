import { create, createInstrument } from "@submodule/core"
import { expect, test } from "vitest"
import { flow, getFlowContext } from "../src"

const logger = (prefix: string) => createInstrument(() => {
  return {
    onExecute({ name }) {
      const context = getFlowContext()
      console.log('%s~%s - Execution starting... %s', prefix, context?.id, name)
    },
    onError({ name }) {
      const context = getFlowContext()
      console.log(name, 'error')
    },
    onResult({ name, result }) {
      const context = getFlowContext()
      console.log('%s~%s - Execution ended... %s, result: %O', prefix, context?.id, name, result)
    }
  }
})

const resultCaching = createInstrument(() => {
  const cache = new Map()

  return {
    onExecute() {
      const context = getFlowContext()
      if (context !== undefined && context['cache'] === undefined) {
        context['cache'] = cache
      } 
    },
    
    onResult({ result }) {
      const context = getFlowContext()
      cache.set(context?.id, result)
    }
  }
})

test("flow should work", async () => {
  const config = create(() => ({ port: 3000 }))
  const server = create((config) => () => config.port, config)

  const result = await flow.use({ plugins: [logger('a'), resultCaching] })
    .execute(async () => {
      const fn = await server.get()
      return fn()
    })

  expect(result.state).toBe('success')
  expect(result['data']).toBe(3000)
  console.log(result.context['cache'])
})