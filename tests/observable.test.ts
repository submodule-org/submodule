import { createScope, map, observable, pipe, provide, value } from "../src";
import { describe, expect, test, vi } from "vitest"

describe("observable", () => {
  type Op = {
    inc: () => void
  }

  test("simple stream", async () => {
    const seed = observable<number, { inc: () => void }>((set, get) => ({
      initialValue: 0,
      controller: {
        inc: () => set(prev => prev + 1)
      }
    }))

    const nextId = map(seed, async seed => {
      let counter = 0
      let currentSeed = seed.get()

      seed.onValue(next => {
        currentSeed = next
        counter = 0
      })

      return {
        nextId: () => `${currentSeed}:${counter++}`
      }
    })

    const scope = createScope()
    const result = await scope.safeRun({ seed, nextId }, async ({ seed, nextId }) => {
      const fn = vi.fn()

      seed.onValue(fn)

      expect(seed.get()).toBe(0)
      expect(nextId.nextId()).toBe("0:0")
      expect(nextId.nextId()).toBe("0:1")

      seed.controller.inc()
      expect(seed.get()).toBe(1)
      expect(nextId.nextId()).toBe("1:0")

      expect(fn).toBeCalledTimes(1)
    })

    if (result.error) throw result.error
  })

  test("pipe stream", async () => {

    const intProvider = observable<number, Op>(set => {
      const controller = {
        inc: () => set(prev => prev + 1)
      }
      return { initialValue: 0, controller }
    })

    const plus1Stream = pipe<number, number>(intProvider, (next, set) => {
      set(next + 1)
    })

    const scope = createScope()

    const result = await scope.safeRun({ intProvider, plus1Stream }, async ({ intProvider, plus1Stream }) => {
      expect(intProvider.get()).toBe(0)
      expect(plus1Stream.get()).toBe(undefined)

      intProvider.controller.inc()
      expect(intProvider.get()).toBe(1)
      expect(plus1Stream.get()).toBe(2)
    })

    if (result.error) throw result.error
  })

  test("conditional pipe", async () => {
    const intProvider = observable<number, Op>(set => {
      const controller = {
        inc: () => set(prev => prev + 1)
      }
      return { initialValue: 0, controller }
    })

    const onlyOdd = pipe<number, number>(intProvider, (next, set) => {
      if (next % 2 === 1) {
        set(next)
      }
    })

    const scope = createScope()

    const result = await scope.safeRun({ intProvider, onlyOdd }, async ({ intProvider, onlyOdd }) => {
      expect(intProvider.get()).toBe(0)
      expect(onlyOdd.get()).toBe(undefined)

      intProvider.controller.inc()
      expect(intProvider.get()).toBe(1)
      expect(onlyOdd.get()).toBe(1)

      intProvider.controller.inc()
      expect(intProvider.get()).toBe(2)
      expect(onlyOdd.get()).toBe(1)
    })

    if (result.error) throw result.error
  })

  test('cannot subscribe to a stream after it has been cleaned up', async () => {
    const stream = observable<number, Op>(set => {
      const controller = {
        inc: () => set(prev => prev + 1)
      }
      return { initialValue: 0, controller }
    })

    const onlyOdd = pipe<number, number>(stream, (next, set) => {
      if (next % 2 === 1) {
        set(next)
      }
    })

    const scope = createScope()

    const result = await scope.safeRun({ stream, onlyOdd }, async ({ stream, onlyOdd }) => {
      const fn = vi.fn()

      stream.onValue(fn)
      onlyOdd.onValue(fn)

      stream.controller.inc()

      expect(fn).toBeCalledTimes(2)
      stream.cleanup()

      stream.controller.inc()
      expect(fn).toBeCalledTimes(2)

    })

    if (result.error) throw result.error
  })

})
