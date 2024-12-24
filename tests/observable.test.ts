import { createScope, map, provideObservable, createPipe, provide, value } from "../src";
import { describe, expect, test, vi } from "vitest"

describe("observable", () => {
  type Op = {
    inc: () => void
  }

  test("simple stream", async () => {
    const seed = provideObservable<number, {
      inc: () => void
      end: () => void
    }>((set) => {
      let seed = 0

      return ({
        controller: {
          inc: () => set(seed++),
          end: () => set(seed, true)
        }
      });
    })

    const scope = createScope()
    const result = await scope.safeRun({ seed }, async ({ seed }) => {
      const fn = vi.fn()

      seed.onValue(fn)

      seed.controller.inc()
      seed.controller.inc()
      seed.controller.inc()

      expect(fn).toBeCalledTimes(3)
      seed.controller.end()
      expect(fn).toBeCalledTimes(4)
      seed.controller.inc()
      seed.controller.inc()
      seed.controller.inc()

      expect(fn).toBeCalledTimes(4)
    })

    if (result.error) throw result.error
  })

  test("simple pipe", async () => {
    const seed = provideObservable<number, () => void>(set => {
      let seed = 0

      return ({
        controller: () => set(seed++)
      })
    })

    const onlyOdd = createPipe<number, number>(
      seed,
      (next, set) => {
        if (next % 2 === 1) {
          set(next)
        }
      })

    const scope = createScope()

    const result = await scope.safeRun({ seed, onlyOdd }, async ({ seed, onlyOdd }) => {
      const fn = vi.fn()

      onlyOdd.onValue(fn)

      seed.controller()
      seed.controller()
      seed.controller()

      expect(fn).toBeCalledTimes(1)
    })
  })

  test("await for the next value", async () => {
    const seed = provideObservable<number, Op>(set => {
      let seed = 0

      return ({
        controller: {
          inc: () => set(++seed)
        }
      })
    })

    const scope = createScope()
    const result = await scope.safeRun({ seed }, async ({ seed }) => {
      const fn = vi.fn()

      seed.onValue(fn)

      const nextValue = seed.nextValue

      seed.controller.inc()
      expect(nextValue).resolves.toBe(1)

    })

    if (result.error) throw result.error
  })

})
