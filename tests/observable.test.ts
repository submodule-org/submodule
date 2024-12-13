import { combine, createScope, map, observable, provide } from "../src";
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
      stream => observable<number>((set) => {
        stream.onValue(next => {
          set(() => next + 1)
        })

        return {
          initialValue: 0
        }
      }))

    const scope = createScope()
    const result = await scope.safeRun({ stream, pipedStream }, async ({ stream, pipedStream }) => {
      expect(stream.get()).toBe(0)
      expect(pipedStream.get()).toBe(0)

      let nextValue = 0
      pipedStream.onValue(next => { nextValue = next })

      stream.controller.inc()

      expect(stream.get()).toBe(1)
      expect(nextValue).toBe(2)
    })

    if (result.error) throw result.error
  })

})
