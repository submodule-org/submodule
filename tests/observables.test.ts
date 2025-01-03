import { test } from "vitest"
import { describe, expect, vi } from "vitest"

import { createObservable, createCombineObservables } from "../src/observables"

describe("createObservable", () => {
  test("should initialize with correct value", () => {
    const [observable] = createObservable(42)
    expect(observable.value).toBe(42)
  })

  test("should notify subscribers when value changes", () => {
    const [observable, setValue] = createObservable('1')
    const callback = vi.fn()

    observable.onValue(callback)
    setValue('2')

    process.nextTick(() => {
      expect(callback).toHaveBeenCalledWith('2')
      expect(callback).toHaveBeenCalledTimes(1)
    })

  })

  test("should not notify when setting same value", () => {
    const [observable, setValue] = createObservable(1)
    const callback = vi.fn()

    observable.onValue(callback)
    setValue(1)

    expect(callback).not.toHaveBeenCalled()
  })

  test("should handle function updates correctly", () => {
    const [observable, setValue] = createObservable(1)
    const callback = vi.fn()
    observable.onValue(callback)

    setValue(prev => prev + 1)

    process.nextTick(() => {
      expect(callback).toHaveBeenCalledWith(2)
    })
  })

  test("should cleanup subscribers properly", () => {
    const [observable, setValue] = createObservable(1)
    const callback = vi.fn()

    const cleanup = observable.onValue(callback)
    cleanup()
    setValue(2)

    expect(callback).not.toHaveBeenCalled()
  })

  test("should use custom snapshot and equality", () => {
    const [observable, setValue] = createObservable({ count: 1 }, {
      createSnapshot: value => ({ ...value }),
      equality: (a, b) => a.count === b.count
    })

    const callback = vi.fn()
    observable.onValue(callback)

    setValue({ count: 1 })
    expect(callback).not.toHaveBeenCalled()

    setValue({ count: 2 })
    process.nextTick(() => {
      expect(callback).toHaveBeenCalledWith({ count: 2 })
    })
  })
})

describe("pipe", () => {
  test("should transform upstream values", () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = createCombineObservables(
      { upstream },
      (upstream) => upstream.upstream.toString(),
      ''
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    setUpstream(42)
    process.nextTick(() => {
      expect(callback).toHaveBeenCalledWith("42")
    })
  })

})
