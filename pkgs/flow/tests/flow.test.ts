import { combine, create, createInstrument, execute } from "@submodule/core"
import { expect, test } from "vitest"
import { flow, getFlowContext } from "../src"
import { d } from "vitest/dist/types-2b1c412e"

const logger = (prefix: string) => createInstrument(() => {
  return {
    onExecute({ name }) {
      const context = getFlowContext()
      // console.log('%s~%s - Execution starting... %s', prefix, context?.id, name)
    },
    onError({ name }) {
      const context = getFlowContext()
      console.log(name, 'error')
    },
    onResult({ name, result }) {
      const context = getFlowContext()
      console.log('%s~%s - Execution ended... %s, result: %s', prefix, context?.id, name, result)
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

      cache.set(context?.id, new Array())
    },
    
    onResult({ result }) {
      const context = getFlowContext()

      const results = cache.get(context?.id) as Array<any>
      results.push([result])
    }
  }
})

test("flow should work", async () => {
  const result = await flow.use({ plugins: [logger('a'), resultCaching] })
    .execute(async () => {
      const config = create(() => ({ port: 3000 }), { name: 'config'})
      const server = create((config) => () => config.port, config, { name: 'server' })

      const fn = await server.get()
      const a = create(() => 'a', { name: 'a'})
      const b = await execute((a) => a + 'b', a, { name: 'b'})
      
      const d = a.prepare((x, y: string) => y, { name: 'd'})
      await d('abc')


      return fn()
    })

  expect(result.state).toBe('success')
  expect(result['data']).toBe(3000)
  console.log(result.context['cache'])
})