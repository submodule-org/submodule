import { createScope, map, observable, pipe, provide } from "../src";
import { describe, expect, test, vi } from "vitest"

describe("observable", () => {

  test("simple stream", async () => {
    const seed = provide(() => observable<number, { inc: () => void }>((set) => ({
      initialValue: 0,
      controller: {
        inc: () => set((prev) => prev + 1)
      }
    })))

    const nextId = map(seed, seed => {
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
    const stream = provide(() => observable<number, { inc: () => void }>((set) => ({
      initialValue: 0,
      controller: {
        inc: () => set((prev) => prev + 1)
      }
    })))

    const pipedStream = map(stream,
      stream => pipe(stream, { slice: (value: number) => value + 1 }))

    const scope = createScope()
    const result = await scope.safeRun({ stream, pipedStream }, async ({ stream, pipedStream }) => {
      expect(stream.get()).toBe(0)
      expect(pipedStream.get()).toBe(1)

      let nextValue = 0
      pipedStream.onValue(next => {
        nextValue = next
      })

      stream.controller.inc()

      expect(stream.get()).toBe(1)
      expect(nextValue).toBe(2)
    })

    if (result.error) throw result.error
  })

  test("observable should only trigger on change", async () => {
    type obj = {
      a: string
      b: number
      c: boolean
    }

    type API = {
      changeA: (value: string) => void
      changeB: (value: number) => void
      changeC: (value: boolean) => void
    }

    const stream = provide(() => observable<obj, API>((set, get) => ({
      initialValue: { a: "a", b: 1, c: false },
      controller: {
        changeA: (value) => set(prev => ({ ...prev, a: value })),
        changeB: (value) => set((prev) => {
          prev.b = value
          return prev
        }),
        changeC: (value) => set((prev) => {
          prev.c = value
          return prev
        })
      }
    }), {
      createSnapshot: structuredClone,
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    }))

    const str = map(stream, stream => pipe(stream, { slice: (value: obj) => value.a }))
    const onlyOddNumber = map(stream, stream => pipe(stream, {
      slice: (value: obj) => value.b,
      exclude: (value) => value % 2 === 0
    }))
    const onlyTruthy = map(stream, stream => pipe(stream, {
      slice: (value: obj) => value.c,
      exclude: (value) => !value
    }))

    const scope = createScope()
    const result = await scope.safeRun({ stream, onlyString: str, onlyOddNumber, onlyTruthy }, async ({ stream, onlyString, onlyOddNumber, onlyTruthy }) => {
      expect(stream.get()).toEqual({ a: "a", b: 1, c: false })
      expect(onlyString.get()).toBe("a")
      expect(onlyOddNumber.get()).toBe(1)
      expect(onlyTruthy.get()).toBe(false)

      stream.controller.changeA("b")
      expect(onlyString.get()).toBe("b")
      expect(onlyOddNumber.get()).toBe(1)
      expect(onlyTruthy.get()).toBe(false)

      stream.controller.changeB(2)
      expect(onlyString.get()).toBe("b")
      expect(onlyOddNumber.get()).toBe(1)
      expect(onlyTruthy.get()).toBe(false)

      stream.controller.changeC(true)
      expect(onlyString.get()).toBe("b")
      expect(onlyOddNumber.get()).toBe(1)
      expect(onlyTruthy.get()).toBe(true)
    })

    if (result.error) throw result.error
  })

})
