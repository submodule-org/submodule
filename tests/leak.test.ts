import { expect, test, vi } from "vitest"
import { $registry, createScope, from, map, observe, provide, publisher, scoper, type Scope } from "../src";
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

  const p = publisher<number>((set, initialValue = 0) => {
    let value = initialValue
    const timeout = setTimeout(() => {
      set(value++)
    }, 100)

    return {
      initialValue,
      cleanup: () => {
        fn()
        clearTimeout(timeout)
      }
    }
  })

  const stream = observe(p)

  const derivedStream = from({ stream, numberValue })
    .toPublisher<number>(({ stream, numberValue }, set, initialValue = 10) => {
      stream.onValue((next) => {
        set(next)
      })

      return {
        initialValue: initialValue + stream.get() + numberValue
      }
    })

  const observeDerivedStream = observe(derivedStream)

  await scope.safeRun({ stringValue, numberValue, middleware, stream, observeDerivedStream }, async ({ stringValue, numberValue, stream, observeDerivedStream }) => {
    expect(stream.get()).toBe(0)
    expect(observeDerivedStream.get()).toBe(11)
    expect(numberValue).toBe(1)
    expect(stringValue).toBe("1")

    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(stream.get()).toBe(1)
    expect(observeDerivedStream.get()).toBe(12)
  })

  await scope.dispose()
  expect(fn).toBeCalledTimes(2)

  scope = undefined

  expect(await detector.isLeaking()).toBe(false)
  console.log($registry)
})