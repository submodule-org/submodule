import { expect, test, vi } from "vitest"
import { createScope, from, map, observe, provide, publisher, scoper, type Scope } from "../src";
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

  const p = publisher<number, Math>((set, initialValue = 0) => {
    let value = initialValue

    return {
      initialValue,
      controller: {
        plus: () => {
          value++
          set(value)
        }
      },
      cleanup: () => {
        fn()
      },
    }
  })

  const stream = observe(p)

  const derivedStream = from({ stream, numberValue })
    .toPublisher<number>(({ stream, numberValue }, set, initialValue = 10) => {
      stream.onValue((next) => {
        set(next + stream.get() + numberValue)
      })

      return {
        initialValue: initialValue + stream.get() + numberValue,
        controller: undefined
      }
    })

  const observeDerivedStream = observe(derivedStream)

  const result = await scope.safeRun(
    { stringValue, numberValue, middleware, p, stream, observeDerivedStream },
    async ({ stringValue, numberValue, stream, observeDerivedStream }) => {
      expect(stream.get()).toBe(0)
      expect(observeDerivedStream.get()).toBe(11)
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