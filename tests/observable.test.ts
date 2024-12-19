import { createScope, map, observable, provide, value } from "../src";
import { describe, expect, test, vi } from "vitest"

describe("observable", () => {

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

  // test("observable should only trigger on change", async () => {
  //   type obj = {
  //     a: string
  //     b: number
  //     c: boolean
  //   }

  //   type API = {
  //     changeA: (value: string) => void
  //     changeB: (value: number) => void
  //     changeC: (value: boolean) => void
  //   }

  //   const stream = provide(() => observable<obj, API>((set, get) => ({
  //     initialValue: { a: "a", b: 1, c: false },
  //     controller: {
  //       changeA: (value) => set(prev => ({ ...prev, a: value })),
  //       changeB: (value) => set((prev) => {
  //         prev.b = value
  //         return prev
  //       }),
  //       changeC: (value) => set((prev) => {
  //         prev.c = value
  //         return prev
  //       })
  //     }
  //   }), {
  //     createSnapshot: structuredClone,
  //     equality: (a, b) => JSON.stringify(a) === JSON.stringify(b)
  //   }))

  //   const str = map(stream, stream => pipe(
  //     stream,
  //     { slice: (value: obj) => ops.include(value.a) },
  //     'a'
  //   ))

  //   const onlyOddNumber = map(stream, stream => pipe(stream, {
  //     slice: (value: obj) => value.b % 2 === 0 ? ops.exclude() : ops.include(value.b),
  //   }, 1))

  //   const onlyTruthy = map(stream, stream => pipe(stream, {
  //     slice: (value: obj) => value.c ? ops.include(value.c) : ops.exclude(),
  //   }, false))

  //   const scope = createScope()
  //   const result = await scope.safeRun({ stream, onlyString: str, onlyOddNumber, onlyTruthy }, async ({ stream, onlyString, onlyOddNumber, onlyTruthy }) => {
  //     expect(stream.get()).toEqual({ a: "a", b: 1, c: false })
  //     expect(onlyString.get()).toBe("a")
  //     expect(onlyOddNumber.get()).toBe(1)
  //     expect(onlyTruthy.get()).toBe(false)

  //     stream.controller.changeA("b")
  //     expect(onlyString.get()).toBe("b")
  //     expect(onlyOddNumber.get()).toBe(1)
  //     expect(onlyTruthy.get()).toBe(false)

  //     stream.controller.changeB(2)
  //     expect(onlyString.get()).toBe("b")
  //     expect(onlyOddNumber.get()).toBe(1)
  //     expect(onlyTruthy.get()).toBe(false)

  //     stream.controller.changeC(true)
  //     expect(onlyString.get()).toBe("b")
  //     expect(onlyOddNumber.get()).toBe(1)
  //     expect(onlyTruthy.get()).toBe(true)
  //   })

  //   if (result.error) throw result.error
  // })

})
