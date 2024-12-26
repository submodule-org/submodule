import { createScope, map, provideObservable, createPipe, provide, value } from "../src";
import { describe, expect, test, vi } from "vitest"

describe("observable", () => {
  type Op = {
    inc: () => void
  }

  test("simple stream", async () => {
    const [readSeed, writeSeed] = provideObservable(0)
    const controller = map(writeSeed, writeSeed => ({
      inc: () => writeSeed(prev => prev + 1)
    }))

    const scope = createScope()
    const result = await scope.safeRun({ seed: readSeed, controller }, async ({ seed, controller }) => {
      const fn = vi.fn()

      seed.onValue(fn)

      controller.inc()
      controller.inc()
      controller.inc()

      expect(fn).toBeCalledTimes(3)
    })

    if (result.error) throw result.error
  })

  test("simple pipe", async () => {
    const [readSeed, writeSeed] = provideObservable(0)

    const onlyOdd = createPipe(
      readSeed,
      (next, set) => {
        if (next % 2 === 1) {
          set(next)
        }
      },
      Number.NaN)

    const controller = map(writeSeed, writeSeed => ({
      inc: () => writeSeed(prev => prev + 1)
    }))

    const scope = createScope()

    const result = await scope.safeRun({ controller, onlyOdd }, async ({ controller, onlyOdd }) => {
      const fn = vi.fn()

      onlyOdd.onValue(fn)

      controller.inc()
      controller.inc()
      controller.inc()

      expect(fn).toBeCalledTimes(2)
    })

    if (result.error) throw result.error
  })

})
