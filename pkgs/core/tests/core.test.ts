import { vi, expect, test } from "vitest"
import { from, combine, create, value } from "../src"

test('submodule should work', async () => {
  const a = create(() => 'a' as const)
  expect(await a.get()).toMatch('a')
  
  const b = create(async () => 'b' as const)
  expect(await b.get()).toMatch('b')

  const d = await from(b).execute(c => c)
  expect(d).toBe('b')
})

test('submodule can be used as dependencies', async () => {
  const a = create(() => 'a')
  const b = from(a).provide((x) => x)

  const result = await b.get()
  expect(result).eq('a')
})

test('create should not be eager', async () => {
  const fn = vi.fn(() => 'a')
  
  const a = create(fn)
  process.nextTick(async () => {
    expect(fn).toBeCalledTimes(0)
    await a.get()
    expect(fn).toBeCalledTimes(1)
  })
})

test('combine should work', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })
  const result = await ab.get()
  expect(result).toEqual({ a: 'a', b: 'b'})
})

test('should only executed one even in combine', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })

  await ab.get()

  expect(fnA).toBeCalledTimes(1)
  expect(fnB).toBeCalledTimes(1)
})

test('submodule can be chained', async () => {
  type Req = { a: string }

  const transform = create(() => {
    return (req: Req) => ({ b: req.a })
  })

  const fn = await transform.get()

  const result = fn({ a: 'x' })

  expect(result).toEqual({ b: 'x'})

})

test('submodule can be executed in prototype mode', async () => {
  const fnA = vi.fn(() => 'a')
  const exA = create(fnA, undefined, { mode: 'prototype' })

  expect(fnA).toBeCalledTimes(0)
  await exA.get()
  expect(fnA).toBeCalledTimes(1)
  await exA.get()
  expect(fnA).toBeCalledTimes(2)
})

test('mode can be mixed', async () => {
  const fnA = vi.fn(() => 'a')
  const exA = create(fnA, undefined, { mode: 'singleton' })

  const fnB = vi.fn(() => 'b')
  const exB = from(exA).provide(fnB, { mode: 'prototype' })

  await exB.get()
  await exB.get()
  await exB.get()

  expect(fnB).toBeCalledTimes(3)
  expect(fnA).toBeCalledTimes(1)

})

test('can be tested using _inject', async () => {
  const a = value('a')

  const b = from(a).provide(a => a)
  b._inject(value('c'))

  expect(await b.get()).toBe('c')
})
