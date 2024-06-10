import { expect, test, vi } from "vitest"
import { resolve, combine, create, execute, prepare, value, resolveValue } from "../src"

test('submodule should work', async () => {
  const a = create(() => 'a' as const)
  expect(await resolve(a)).toMatch('a')

  const b = create(async () => 'b' as const)
  expect(await resolve(b)).toMatch('b')

  const d = await execute(c => c, b)
  expect(d).toBe('b')
})

test('submodule can be used as dependencies', async () => {
  const a = create(() => 'a')
  const b = create((x) => x, a)

  const result = await resolve(b)
  expect(result).eq('a')
})

test('create should not be eager', async () => {
  const fn = vi.fn(() => 'a')

  const a = create(fn)
  process.nextTick(async () => {
    expect(fn).toBeCalledTimes(0)
    await resolve(a)
    expect(fn).toBeCalledTimes(1)
  })
})

test('combine should work', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })
  const result = await resolve(ab)
  expect(result).toEqual({ a: 'a', b: 'b' })
})

test('should only executed one even in combine', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })

  await resolve(ab)

  expect(fnA).toBeCalledTimes(1)
  expect(fnB).toBeCalledTimes(1)
})

test('submodule can be chained', async () => {
  type Req = { a: string }

  const transform = create(() => {
    return (req: Req) => ({ b: req.a })
  })

  const fn = await resolve(transform)

  const result = fn({ a: 'x' })

  expect(result).toEqual({ b: 'x' })

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
  const c = prepare((v, i) => v + i, b)

  const d = await demand(c)
  expect(d).toEqual('ba')
})

test('magic function 3', async () => {
  const demand = async (fn: (x: string, y: number) => string | Promise<string>): Promise<string> => {
    return await fn('a', 2)
  }

  const b = value('b')
  const c = await demand(prepare(async (v, i1, i2) => {
    return v + i1 + i2
  }, b))

  expect(c).toEqual('ba2')
})

test('error should be carried over', async () => {
  const a = create(() => Promise.reject(new Error('test')))

  const b = create((a) => 'b', a)

  await expect(() => resolve(b)).rejects.toThrowError('test')
})

test('can mock easily', async () => {
  const config = value({ port: 3000 })
  const service = create((config) => {
    // will be a server
    return config.port
  }, config)

  const testConfig = { port: 4000 }
  resolveValue(config, testConfig)
  const result = await resolve(service)
  expect(result).toBe(4000)
})

test('can set value by early access to the root dependency', async () => {
  const port = create((port: number) => port, value(0))

  const service = create((port) => {
    // will be a server
    return port
  }, port)

  resolveValue(port, value(4000))
  resolveValue(port, value(3000))

  const result = await resolve(service)
  expect(result).toBe(4000)
})

test('provider with dependency cannot be initialized without dependency', async () => {
  const port = create((port: number) => port, undefined as any)

  expect(async () => await resolve(port)).rejects.toThrowError()
})

test('expect error to be thown', async () => {
  const problematic = create(() => {
    throw new Error('test')
  })

  expect(async () => await resolve(problematic)).rejects.toThrowError('test')
  expect(async () => await resolve(problematic)).rejects.toThrowError('test')
})

test('can use object as dependency', async () => {
  const intValue = value(1)
  const strValue = value('test')

  const comb = create(({ intValue, strValue }) => {
    return intValue + strValue
  }, { intValue, strValue })

  expect(await resolve(comb)).toBe('1test')
})
