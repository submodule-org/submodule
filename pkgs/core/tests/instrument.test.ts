import { expect, test, vi } from "vitest"
import { create, execute, setInstrument, value } from "../src"

test('basic instrumentation', async () => {

  const fn = vi.fn(function () { })
  setInstrument({
    onResult: fn
  })

  const a = create(() => 'a') // 1
  const b = create((a) => a + 'b', a) // 2

  await execute((a) => { }, a) // 3
  await a.get() // 4
  await b.get() // 5

  expect(fn).toBeCalledTimes(5)
})

test('instrument can change data', async () => {
  setInstrument({
    onResult() {
      return {
        state: 'result',
        result: 1
      }
    }
  })

  const a = value('a')

  expect(await a.get()).equals(1)
})

test('instrument can recover error', async () => {
  setInstrument({
    onError() {
      return {
        state: 'result',
        result: 1
      }
    }
  })

  const a = create(() => { throw new Error() })
  expect(await a.get()).equals(1)
})

test('instrument can change executing function', async () => {
  setInstrument({
    onExecute() {
      return {
        state: 'execute',
        fn: () => Promise.resolve(1)
      }
    }
  })

  const a = create(async () => 'a')
  expect(await a.get()).equals(1)
})

test('instrument can be mixed', async () => {
  const fn = vi.fn()

  setInstrument({
    onExecute: fn
  })

  setInstrument({
    onExecute: fn
  })

  const a = value('a')
  await a.get()
  expect(fn).toBeCalledTimes(2)
})