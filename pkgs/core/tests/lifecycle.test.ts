import { describe, expect, test, vi } from "vitest"
import { create, execute } from "../src"

describe("Life cycle test", async () => {
  const normalFn = vi.fn(async () => { })

  test("borrow value on execute", async () => {
    const beforeFn = vi.fn(() => { })
    const afterFn = vi.fn(() => { })
    const executionFn = vi.fn(() => { })

    const normal = create(normalFn, {
      onExecute: async (_, execution) => {
        beforeFn()
        const v = await execution(_)
        afterFn()
        return v
      }
    })

    const promise = execute(executionFn, normal)

    await promise
    expect(beforeFn).toBeCalledTimes(1)
    expect(afterFn).toBeCalledTimes(1)
  })

})