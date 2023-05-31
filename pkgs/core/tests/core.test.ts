import { vi, expect, test } from "vitest"
import { from, combine, createProvider, create } from "../src"

test('submodule should work', async () => {
  const a = create(() => 'a' as const)
  expect(await a.execute()).toMatch('a')
  
  const b = create(async () => 'b' as const)
  expect(await b.execute()).toMatch('b')
})

test('submodule can be used as dependencies', async () => {
  const a = create(() => 'a')
  const b = from(a).provide((x) => x)

  const result = await b.execute()
  expect(result).eq('a')
})

test('create should not be eager', async () => {
  const fn = vi.fn(() => 'a')
  
  const a = create(fn)
  process.nextTick(async () => {
    expect(fn).toBeCalledTimes(0)
    await a.execute()
    expect(fn).toBeCalledTimes(1)
  })
})

test('combine should work', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })
  const result = await ab.execute()
  expect(result).toEqual({ a: 'a', b: 'b'})
})

test('should only executed one even in combine', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })

  await ab.execute()

  expect(fnA).toBeCalledTimes(1)
  expect(fnB).toBeCalledTimes(1)
})

test('submodule can be chained', async () => {
  type Req = { a: string }

  const transform = create(() => {
    return (req: Req) => ({ b: req.a })
  })

  const fn = await transform.execute()

  const result = fn({ a: 'x' })

  expect(result).toEqual({ b: 'x'})

})