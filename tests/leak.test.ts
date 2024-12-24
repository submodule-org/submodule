import { expect, test, vi } from "vitest"
import { createScope, provideObservable, map, provide, scoper, type Scope } from "../src";
import { createObservable } from "../src/observables";
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

  const stream = provideObservable<number, Math>((set) => {
    let initialValue = 0

    return ({
      controller: {
        plus: () => set(initialValue++)
      },
      cleanup: () => {
        fn();
      },
    });
  })

  const derivedStream = map(
    { stream, numberValue },
    ({ stream, numberValue }) => {

      return createObservable<number>(set => {
        let defaultValue = 0

        stream.onValue((next) => {
          defaultValue = next + numberValue + defaultValue
          set(defaultValue)
        })

        return {}
      })
    })

  const result = await scope.safeRun(
    { stringValue, numberValue, middleware, stream, derivedStream },
    async ({ stringValue, numberValue, stream, derivedStream }) => {
      stream.controller.plus()
    })

  if (result.error) throw result.error

  await scope.dispose()
  expect(fn).toBeCalledTimes(2)

  scope = undefined

  expect(await detector.isLeaking()).toBe(false)
})