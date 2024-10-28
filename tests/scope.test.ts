import { describe, expect, test } from "vitest"
import { createScope, value, create, provide, map } from "../src"

describe('scope', () => {
  const seed = value(5)

  const sourceMod = create((seed: number) => {
    let _seed = seed
    return {
      plus: () => { _seed = _seed + 1 },
      get i() {
        return _seed
      }
    }
  }, seed)

  const combineSourceMod = map({ seed, sourceMod }, (v) => v)

  test('scopes are isolated', async () => {
    const scope1 = createScope()
    const scope2 = createScope()

    const source1 = await scope1.resolve(sourceMod)
    expect(source1.i).toBe(5)

    source1.plus()
    expect(source1.i).toBe(6)

    const source2 = await scope2.resolve(sourceMod)
    expect(source2.i).toBe(5)

    source2.plus()
    expect(source2.i).toBe(6)
    expect(source1.i).toBe(6)
  })

  test('scope can be reset', async () => {
    const scope = createScope()
    let source = await scope.resolve(sourceMod)
    source.plus()
    expect(source.i).toBe(6)

    scope.dispose()
    source = await scope.resolve(sourceMod)
    expect(source.i).toBe(5)
  })

  test('scope can be hijacked', async () => {
    const scope = createScope()

    scope.set(seed, value(5))

    const source = await scope.resolve(sourceMod)
    expect(source.i).toBe(5)

    source.plus()
    expect(source.i).toBe(6)
  })

  test('scope can be combined', async () => {
    const parentScope = createScope()
    const childScope = createScope()

    let seed = 0
    const plus = provide(() => { seed = seed + 1; return seed })

    await parentScope.resolve(plus)
    expect(seed).toBe(1)

    const combinedScope = createScope(parentScope, childScope)
    await combinedScope.resolve(plus)

    expect(seed).toBe(1)
    expect(combinedScope.has(plus)).toBe(true)

    const reversedCombinedScope = createScope(childScope, parentScope)
    await reversedCombinedScope.resolve(plus)
    expect(seed).toBe(1)

    expect(childScope.has(plus)).toBe(false)

    await combinedScope.dispose()
    expect(combinedScope.has(plus)).toBe(true)
  })

})