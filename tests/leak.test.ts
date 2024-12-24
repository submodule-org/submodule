import { expect, test, vi } from "vitest"
import { createScope, provideObservable, map, provide, scoper, type Scope, flatMap, combine } from "../src";
import { createObservable, pipe } from "../src/observables";
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

  const stream = provideObservable(0)
  const controller = map(stream, (stream) => ({
    plus: () => stream.setValue(prev => prev + 1)
  }))

  const derivedStream = map(
    combine({ stream, numberValue }),
    ({ stream, numberValue }) => {

      return pipe(
        stream,
        (next, set) => {
          set(next + numberValue)
        },
        0
      )
    })

  const result = await scope.safeRun(
    { stringValue, controller, numberValue, middleware, stream, derivedStream },
    async ({ stringValue, controller, numberValue, stream, derivedStream }) => {
      stream.onValue(fn)

      controller.plus()
    })

  if (result.error) throw result.error

  await scope.dispose()
  expect(fn).toBeCalledTimes(2)

  scope = undefined

  expect(await detector.isLeaking()).toBe(false)
})