import { test } from "vitest"
import { describe, expect, vi } from "vitest"

import { createObservable, pipe } from "../src/observables"

describe("createObservable", () => {
  test("should initialize with correct value", () => {
    const [observable] = createObservable(42)
    expect(observable.value).toBe(42)
  })

  test("should notify subscribers when value changes", () => {
    const [observable, setValue] = createObservable(1)
    const callback = vi.fn()

    observable.onValue(callback)
    setValue(2)

    expect(callback).toHaveBeenCalledWith(2)
    expect(callback).toHaveBeenCalledTimes(1)
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

    expect(callback).toHaveBeenCalledWith(2)
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
    expect(callback).toHaveBeenCalledWith({ count: 2 })
  })
})

describe("pipe", () => {
  test("should transform upstream values", () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = pipe(
      upstream,
      (value, dispatch) => dispatch(value.toString()),
      "initial"
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    setUpstream(42)
    expect(callback).toHaveBeenCalledWith("42")
  })

  test("should handle async transformations", async () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = pipe(
      upstream,
      async (value, dispatch) => {
        await Promise.resolve()
        dispatch(`async${value}`)
      },
      "initial"
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    setUpstream(42)
    await Promise.resolve()

    expect(callback).toHaveBeenCalledWith("async42")
  })
})

describe("createObservable cleanup", () => {
  test("cleanup should remove all subscribers", () => {
    const [observable, setValue] = createObservable(1)
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    observable.onValue(callback1)
    observable.onValue(callback2)

    observable.cleanup()
    setValue(2)

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).not.toHaveBeenCalled()
  })

  test("should handle multiple subscriber cleanups independently", () => {
    const [observable, setValue] = createObservable(1)
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const cleanup1 = observable.onValue(callback1)
    observable.onValue(callback2)

    cleanup1()
    setValue(2)

    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith(2)
  })
})

describe("pipe cleanup", () => {
  test("upstream cleanup should stop downstream notifications", () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = pipe(
      upstream,
      (value, dispatch) => dispatch(value.toString()),
      "initial"
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    upstream.cleanup()
    setUpstream(42)

    expect(callback).not.toHaveBeenCalled()
  })

  test("downstream cleanup should stop notifications", () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = pipe(
      upstream,
      (value, dispatch) => dispatch(value.toString()),
      "initial"
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    downstream.cleanup()
    setUpstream(42)

    expect(callback).not.toHaveBeenCalled()
  })

  test("should cleanup chained pipes correctly", () => {
    const [upstream, setUpstream] = createObservable(1)
    const intermediate = pipe(
      upstream,
      (value, dispatch) => dispatch(value.toString()),
      "initial"
    )
    const final = pipe(
      intermediate,
      (value, dispatch) => dispatch(Number.parseInt(value)),
      0
    )

    const callback = vi.fn()
    final.onValue(callback)

    intermediate.cleanup()
    setUpstream(42)

    expect(callback).not.toHaveBeenCalled()
  })
})

describe("pipe conditional dispatching", () => {
  test("should handle conditional dispatch", () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = pipe(
      upstream,
      (value, dispatch) => {
        if (value > 5) {
          dispatch("large")
        } else {
          dispatch("small")
        }
      },
      "initial"
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    setUpstream(3)
    expect(callback).toHaveBeenCalledWith("small")

    setUpstream(10)
    expect(callback).toHaveBeenCalledWith("large")
  })

  test("should handle no dispatch case", () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = pipe(
      upstream,
      (value, dispatch) => {
        if (value % 2 === 0) {
          dispatch(value.toString())
        }
        // odd numbers are filtered out by not dispatching
      },
      "initial"
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    setUpstream(3) // odd number, should not trigger dispatch
    setUpstream(4) // even number, should trigger dispatch

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith("4")
  })

  test("should handle multiple dispatches from single upstream value", () => {
    const [upstream, setUpstream] = createObservable(1)
    const downstream = pipe(
      upstream,
      (value, dispatch) => {
        dispatch(`${value}-first`)
        dispatch(`${value}-second`)
      },
      "initial"
    )

    const callback = vi.fn()
    downstream.onValue(callback)

    setUpstream(42)

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(1, "42-first")
    expect(callback).toHaveBeenNthCalledWith(2, "42-second")
  })

})

