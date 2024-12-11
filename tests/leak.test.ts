import { expect, test, vi } from "vitest"
import { combine, createScope, map, observe, provide, scoper, type Scope } from "../src";
import LeakDetector from "jest-leak-detector"

test("leak test protection", async () => {
  let scope: Scope | undefined = createScope();
  const detector = new LeakDetector(scope)

  const fn = vi.fn()
  expect(await detector.isLeaking()).toBe(true)

  const stringValue = provide(() => "1");
  const numberValue = map(stringValue, (str) => Number(str))
  const middleware = map(scoper, (scoper) => {
    scoper.addDefer(fn)
  })

  type Math = { plus: () => void }

  const stream = observe<number, Math>((set) => ({
    initialValue: 0,
    controller: {
      plus: () => set((prev) => prev + 1)
    },
    cleanup: () => {
      fn()
    },
  }))

  const derivedStream = combine({ stream, numberValue })
    .publisher<number>(({ stream, numberValue }, set) => {
      const cleanup = stream.onValue((next) => {
        set(current => next + current + numberValue)
      })

      return {
        initialValue: 0 + stream.get() + numberValue,
        controller: undefined,
        cleanup
      }
    })

  const observeDerivedStream = observe(derivedStream)

  const result = await scope.safeRun(
    { stringValue, numberValue, middleware, stream, observeDerivedStream },
    async ({ stringValue, numberValue, stream, observeDerivedStream }) => {
      expect(stream.get()).toBe(0)
      expect(observeDerivedStream.get()).toBe(1)
      expect(numberValue).toBe(1)
      expect(stringValue).toBe("1")

      stream.controller.plus()

      expect(stream.get()).toBe(1)
      expect(observeDerivedStream.get()).toBe(3)
    })

  if (result.error) throw result.error

  await scope.dispose()
  expect(fn).toBeCalledTimes(2)

  scope = undefined

  expect(await detector.isLeaking()).toBe(false)
})