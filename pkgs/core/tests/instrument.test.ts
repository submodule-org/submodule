import { vi, test, expect } from "vitest"
import { create, setInstrument } from "../src"

test('basic instrumentation', async () => {

  const fn = vi.fn(function () { })
  setInstrument({
    onResult: fn,
    onExecute: fn,
    onPromiseResult: fn
  })

  const a = create(() => 'a')
  const b = create((a) => a + 'b', a)

  await a.execute((a) => console.log(a))
  await a.get()

  console.log(fn.mock.calls)
})