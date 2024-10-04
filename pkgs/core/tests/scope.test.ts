import { describe, expect, test } from "vitest"
import { createScope, value, create, combine } from "../src"

describe('scope', () => {
  const seed = value(5)

  const sourceMod = create((seed: number) => {
    let _seed = seed
    return {
      plus: () => _seed = _seed + 1,
      get i() {
        return _seed
      }
    }
  }, seed)

  const combineSourceMod = create((v) => v, combine({ seed, sourceMod }))

  test('scopes are isolated', async () => {
    const scope1 = createScope()
    const scope2 = createScope()

    const source1 = await sourceMod.resolve(scope1)
    expect(source1.i).toBe(5)

    source1.plus()
    expect(source1.i).toBe(6)

    const source2 = await sourceMod.resolve(scope2)
    expect(source2.i).toBe(5)

    source2.plus()
    expect(source2.i).toBe(6)
    expect(source1.i).toBe(6)
  })

  test('scope can be reset', async () => {
    const scope = createScope()
    let source = await sourceMod.resolve(scope)
    source.plus()
    expect(source.i).toBe(6)

    scope.dispose()
    source = await sourceMod.resolve(scope)
    expect(source.i).toBe(5)
  })

  test('scope can be hijacked', async () => {
    const scope = createScope()

    scope.set(seed, value(5))
    const source = await sourceMod.resolve(scope)
    expect(source.i).toBe(5)

    source.plus()
    expect(source.i).toBe(6)
  })

})