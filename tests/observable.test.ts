import { createScope, map, provideObservable, combineObservables } from "../src";
import { describe, expect, test, vi } from "vitest"

describe("observable", () => {
  type Op = {
    inc: () => void
  }

  test("simple stream", async () => {
    const [readSeed, writeSeed] = provideObservable(0)
    const controller = map(writeSeed, writeSeed => ({
      inc: () => writeSeed(prev => prev + 1)
    }))

    const scope = createScope()
    const result = await scope.safeRun({ seed: readSeed, controller }, async ({ seed, controller }) => {
      const fn = vi.fn()

      seed.onValue(fn)

      controller.inc()
      controller.inc()
      controller.inc()

      process.nextTick(
        () => expect(fn).toBeCalledTimes(3)
      )
    })

    if (result.error) throw result.error
  })

  test("simple combine", async () => {
    const [list, setList] = provideObservable([{ id: 1 }, { id: 2 }, { id: 3 }])
    const [id, setId] = provideObservable(undefined as number | undefined)

    const selectedItem = combineObservables(
      { list, id },
      ({ list, id }) => list.find(item => item.id === id), undefined as { id: number } | undefined
    )

    const scope = createScope()

    const result = await scope.safeRun({ selectedItem, setList, setId }, async ({ selectedItem, setList, setId }) => {
      const fn = vi.fn()

      selectedItem.onValue(fn)

      setId(2)
      setId(3)
      process.nextTick(() => {
        expect(selectedItem.value).toEqual({ id: 3 })
        expect(fn).toBeCalledTimes(2)
      })
    })

    if (result.error) throw result.error
  })

})
