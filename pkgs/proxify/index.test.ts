import { describe, expect, it } from "vitest"
import { proxify } from "."

describe('profxify function', () => {
  it('value should be passedthrough', () => {
    const { value } = proxify({ a: 1 })

    expect(value.a).toBe(1)
  })

  it('value should be updated', () => {
    const { value, update } = proxify({ a: 1 })

    update({ a: 2 })
    expect(value.a).toBe(2)
  })

  it('value can be nested', () => {
    const { value, update } = proxify({ a: { b: 1 } })

    update({ a: { b: 2 } })
    expect(value.a.b).toBe(2)
  })

  it('array should work as well', () => {
    const { value, update } = proxify([1, 2, 3])

    update([4, 5, 6])
    expect(value[0]).toBe(4)
  })

  it('nested array should work as well', () => {
    const { value, update } = proxify([1, [2, 3]])

    update([4, [5, 6]])
    expect(value[1][0]).toBe(5)
  })

  it('nested array and object should work as well', () => {
    const { value, update } = proxify([1, { a: 2 }])

    update([4, { a: 5 }])
    expect(value[1].a).toBe(5)
  })

})