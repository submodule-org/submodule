import { expect, test, vi } from "vitest"
import { combine, create, execute, prepare, value } from "../src"

test('submodule should work', async () => {
  const a = create(() => 'a' as const)
  expect(await a.get()).toMatch('a')
  
  const b = create(async () => 'b' as const)
  expect(await b.get()).toMatch('b')

  const d = await execute(c => c, b)
  expect(d).toBe('b')
})

test('submodule can be used as dependencies', async () => {
  const a = create(() => 'a')
  const b = create((x) => x, a)

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
  const exB = create(fnB, exA, { mode: 'prototype' })

  await exB.get()
  await exB.get()
  await exB.get()

  expect(fnB).toBeCalledTimes(3)
  expect(fnA).toBeCalledTimes(1)

})

test('can be tested using _inject', async () => {
  const a = value('a')

  const b = create(a => a, a)
  b._inject(value('c'))

  expect(await b.get()).toBe('c')
})

test('magic function', async () => {
  const demand = async (fn: (x: string) => string | Promise<string>): Promise<string> => {
    return await fn('a')
  }

  const b = value('b')
  const c = await demand(prepare((v, i) => {
    return v + i
  }, b))

  expect(c).toEqual('ba')
})

test('magic function 2', async () => {
  const demand = async (fn: (x: string) => string | Promise<string>): Promise<string> => {
    return await fn('a')
  }

  const b = value('b')
  const c = prepare<string, [string], string>((v, i) => v + i, b)

  const d = await demand(c)
  expect(d).toEqual('ba')
})

test('magic function 3', async () => {
  const demand = async (fn: (x: string, y: number) => string | Promise<string>): Promise<string> => {
    return await fn('a', 2)
  }

  const b = value('b')
  const c = await demand(b.prepare(async (v, i1, i2) => {
    return v + i1 + i2
  }))

  expect(c).toEqual('ba2')
})

test('magic function 4', async () => {
  const demand = async (fn: (x: string, y: number) => string | Promise<string>): Promise<string> => {
    return await fn('a', 2)
  }

  const b = value('b')
  const c = b.prepare<[string, number], string>((v, i1, i2) => v + i1 + i2)

  const d = await demand(c)
  expect(d).toEqual('ba2')
})

test('magic function 5', async () => {
  const demand = async (fn: (x: string, y: number) => string | Promise<string>): Promise<string> => {
    return await fn('a', 2)
  }

  const b = value('b')
  const c = b.prepare<[string, number], Promise<string>>(async (v, i1, i2) => Promise.resolve(v + i1 + i2))

  const d = await demand(c)
  expect(d).toEqual('ba2')
})

test('magic function 7', async () => {
  type Fn = (a: string, b: number) => Promise<number>
  const a = value(true)
  const mock = vi.fn()
  const fn = (prepare<boolean, [string, number], any>(mock, a)) satisfies Fn

  await fn('a', 1)

  expect(mock.mock.lastCall).toStrictEqual([true, 'a', 1])
})

test('could set name', async () => {
  const execute = create(() => 'a', undefined, { name: 'test' })
  expect(execute.get.name).toBe('test.get')

  const named = create(function config() {
    return 'a'
  })

  expect(named.get.name).toBe('config.get')
})

test('error should be carried over', async () => {
  const a = create(() => Promise.reject(new Error('test')))

  const b = create((a) => 'b', a)

  await expect(() => b.get()).rejects.toThrowError('test')
})