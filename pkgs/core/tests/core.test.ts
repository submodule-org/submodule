import { vi, expect, test } from "vitest"
import { compose, prepareExecutable } from "../src/core"

test('submodule should work', async () => {
  const a = prepareExecutable(() => 'a' as const)
  expect(await a.get()).toMatch('a')
  
  const b = prepareExecutable(async () => 'b' as const)
  expect(await b.get()).toMatch('b')
})

test('eager must work', async () => {
  const fna = vi.fn().mockReturnValue('a')
  const a = prepareExecutable(fna, { eager: false })

  expect(fna).toBeCalledTimes(0)
  await a.get()
  
  expect(fna).toBeCalledTimes(1)
  await a.get()
  expect(fna).toBeCalledTimes(1)
})

test('eager must load things at max once', () => {
  const fna = vi.fn().mockReturnValue('a')
  const fnb = vi.fn().mockReturnValue(Promise.resolve('b'))

  const a = prepareExecutable(fna, { eager: true })
  const b = prepareExecutable(fnb, { eager: true })

  const c = prepareExecutable(() => {}, { initArgs: [a, b], eager: true })

  expect(fna).toBeCalledTimes(1)
  expect(fnb).toBeCalledTimes(1)
})

test('initArgs can be passed using various forms', async () => {
  const fna = vi.fn().mockReturnValue('a')
  await prepareExecutable(fna, { initArgs: () => '1', eager: true }).get()
  expect(fna.mock.lastCall).toEqual(['1'])
  
  await prepareExecutable(fna, { initArgs: () => Promise.resolve('2'), eager: true }).get()
  expect(fna.mock.lastCall).toEqual(['2'])
  
  await prepareExecutable(fna, { initArgs: '3', eager: true }).get()
  expect(fna.mock.lastCall).toEqual(['3'])
})

test('compose should work', async () => {
  const a = prepareExecutable(() => 'a' as const)
  const b = prepareExecutable(() => 'b' as const)
  const ab = compose({ a, b })

  const value = await ab.get()
  expect(value).toEqual({ a: 'a', b: 'b'})  
})

test('execute should work', async () => {
  const a = prepareExecutable(() => 'a' as const)
  const cb = vi.fn().mockReturnValue('b')

  let result = await a.execute(cb, 'c')
  expect(cb.mock.lastCall).toEqual(['a', 'c'])
  expect(result).toEqual('b')
})

test('execute param can be used in various forms', async () => {
  const a = prepareExecutable(() => 'a' as const)
  const cb = vi.fn().mockReturnValue('b')

  await a.execute(cb, 'c')
  expect(cb.mock.lastCall).toEqual(['a', 'c'])
  
  await a.execute(cb, () => 'c')
  expect(cb.mock.lastCall).toEqual(['a', 'c'])
  
  await a.execute(cb, () => Promise.resolve('c'))
  expect(cb.mock.lastCall).toEqual(['a', 'c'])
})

test('prepare should work', async () => {
  const a = prepareExecutable(() => 'a' as const)
  const cb = vi.fn().mockReturnValue('b')

  let fn = a.prepare(cb)
  let result = await fn('abc')

  expect(cb.mock.lastCall).toEqual(['a', 'abc'])
  expect(result).toEqual('b')
})

test('prepare param can be used in various forms', async () => {
  const a = prepareExecutable(() => 'a' as const)
  const cb = vi.fn().mockReturnValue('b')

  let fn = a.prepare(cb)

  await fn('abc')
  expect(cb.mock.lastCall).toEqual(['a', 'abc'])
  
  await fn(() => 'c')
  expect(cb.mock.lastCall).toEqual(['a', 'c'])

  await fn(() => Promise.resolve('promise'))
  expect(cb.mock.lastCall).toEqual(['a', 'promise'])
})

test('instrument options should work', async () => {
  const cb = vi.fn((name: string, fn: () => unknown) => fn as any)
  const a = prepareExecutable(() => 'a' as const, { instrument: cb })
  await a.get()

  expect(cb).toBeCalledTimes(3)
})