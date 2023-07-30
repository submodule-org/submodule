import { beforeEach, describe, expect, test, vi } from "vitest"

describe("Life cycle test", async () => {
  const normalFn = vi.fn(async () => { })

  beforeEach(() => {
    vi.resetModules()
  })

  test("should not affect normal condition", async () => {
    const { boot, create, execute, shutdown } = await import("../src")
    const normal = create(normalFn)
    await boot()
    expect(normalFn).toBeCalledTimes(0)
  })

  test("eager would work", async () => {
    const { boot, create, execute, shutdown } = await import("../src")
    const normal = create(normalFn, { eager: true })
    await boot()
    expect(normalFn).toBeCalledTimes(1)
  })

  test("non actualized should not be called", async () => {
    const { boot, create, execute, shutdown } = await import("../src")
    const shutdownFn = vi.fn()
    const normal = create(normalFn, { onShutdown: shutdownFn })
    await shutdown()
    expect(shutdownFn).toBeCalledTimes(0)
  })

  test("actualized fn should be called", async () => {
    const { boot, create, execute, shutdown } = await import("../src")
    const shutdownFn = vi.fn()
    const normal = create(normalFn)
    const derived = create(() => { }, normal, { onShutdown: shutdownFn })
    await execute(() => { }, derived)

    await shutdown()
    expect(shutdownFn).toBeCalledTimes(1)
  })

  test("borrow value on execute", async () => {
    const { boot, create, execute, shutdown } = await import("../src")

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