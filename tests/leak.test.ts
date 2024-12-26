import { expect, test, vi } from "vitest"
import { createScope, provideObservable, map, provide, scoper, type Scope, flatMap, combine } from "../src";
import { pipe } from "../src/observables";
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

  const [readStream, writeStream] = provideObservable(0)
  const controller = map(writeStream, (stream) => ({
    plus: () => stream(prev => prev + 1)
  }))

  const derivedStream = map(
    combine({ readStream, numberValue }),
    ({ readStream, numberValue }) => {

      return pipe(
        readStream,
        (next, set) => {
          set(next + numberValue)
        },
        0
      )
    })

  const result = await scope.safeRun(
    { stringValue, controller, numberValue, middleware, readStream, derivedStream },
    async ({ stringValue, controller, numberValue, readStream, derivedStream }) => {
      readStream.onValue(fn)

      controller.plus()
    })

  if (result.error) throw result.error

  await scope.dispose()
  expect(fn).toBeCalledTimes(2)

  scope = undefined

  expect(await detector.isLeaking()).toBe(false)
})