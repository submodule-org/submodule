import { expect, test, vi } from "vitest"
import { createScope, map, provide, scoper, type Scope } from "../src";
import { observable } from "../src/observables";
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

  const stream = provide(() => observable<number, Math>((set) => ({
    initialValue: 0,
    controller: {
      plus: () => set((prev) => prev + 1)
    },
    cleanup: () => {
      fn()
    },
  })))

  const derivedStream = map(
    { stream, numberValue },
    ({ stream, numberValue }) => {

      return observable<number>(set => {
        stream.onValue((next) => {
          set(current => next + current + numberValue)
        })

        return {
          initialValue: 0 + stream.get() + numberValue,
        }
      })
    })

  const result = await scope.safeRun(
    { stringValue, numberValue, middleware, stream, derivedStream },
    async ({ stringValue, numberValue, stream, derivedStream }) => {
      stream.controller.plus()
    })

  if (result.error) throw result.error

  await scope.dispose()
  expect(fn).toBeCalledTimes(1)

  scope = undefined

  expect(await detector.isLeaking()).toBe(false)
})