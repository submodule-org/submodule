import { test } from "vitest"
import { describe, expect, vi } from "vitest"

import { createObservable, createCombineObservables, createTransformedObservable } from "../src/observables"
import { value } from "../src"

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

  test("onMount options of observable", async () => {
    const fn = vi.fn()
    const [value] = createObservable(1, {
      onMount: (setter) => {
        setter(2)
        fn()
        return () => fn()
      }
    })

    await nextTickPromise()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(value.value).toBe(2)

    value.cleanup()
    await nextTickPromise()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

const nextTickPromise = () => new Promise(resolve => process.nextTick(resolve))

describe("transform and combine", () => {
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

  test("combine multiple stream would stop when downstream is stopped", async () => {
    const [upstream, setUpstream] = createObservable(1)
    const [upstream2, setUpstream2] = createObservable(2)

    const downstream = createCombineObservables(
      { upstream, upstream2 },
      (upstreams) => upstreams.upstream + upstreams.upstream2,
      0
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    setUpstream(2)
    setUpstream2(3)

    await nextTickPromise()
    expect(callback).toHaveBeenCalledWith(5)

    setUpstream2(5)
    setUpstream(4)
    expect(callback).toHaveBeenCalledWith(5)

    downstream.cleanup()
    await nextTickPromise()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  test("can derive a stream", async () => {
    const [upstream, setUpstream] = createObservable(1)
    const onlyTakeOdd = createTransformedObservable(
      upstream,
      (next, prev) => next % 2 === 1 ? next : prev,
      1
    )

    const callback = vi.fn()
    onlyTakeOdd.onValue(callback)

    setUpstream(2)
    await nextTickPromise()
    expect(callback).not.toHaveBeenCalled()

    setUpstream(3)
    await nextTickPromise()
    expect(callback).toHaveBeenCalledWith(3)
  })
})
