import { expect, test, vi } from "vitest"
import { combine, create, execute, prepare, template, value, make } from "../src"

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
  expect(result).toEqual({ a: 'a', b: 'b' })
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

  expect(result).toEqual({ b: 'x' })

})

test('submodule can be executed in prototype mode', async () => {
  const fnA = vi.fn(() => 'a')
  const exA = create(fnA, { mode: 'prototype' })

  expect(fnA).toBeCalledTimes(0)
  await exA.get()
  expect(fnA).toBeCalledTimes(1)
  await exA.get()
  expect(fnA).toBeCalledTimes(2)
})

test('mode can be mixed', async () => {
  const fnA = vi.fn(() => 'a')
  const exA = create(fnA, { mode: 'singleton' })

  const fnB = vi.fn(() => 'b')
  const exB = create(fnB, exA, { mode: 'prototype' })

  await exB.get()
  await exB.get()
  await exB.get()

  expect(fnB).toBeCalledTimes(3)
  expect(fnA).toBeCalledTimes(1)

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

test('magic function 4', async () => {
  const demand = async (fn: (x: string, y: number) => string | Promise<string>): Promise<string> => {
    return await fn('a', 2)
  }

  const b = value('b')
  const c = template(b)((v, i1, i2) => v + i1 + i2)

  const d = await demand(c)
  expect(d).toEqual('ba2')
})

test('magic function 5', async () => {
  const demand = async (fn: (x: string, y: number) => string | Promise<string>): Promise<string> => {
    return await fn('a', 2)
  }

  const b = value('b')
  const c = template(b)(async (v, i1, i2) => Promise.resolve(v + i1 + i2))

  const d = await demand(c)
  expect(d).toEqual('ba2')
})

test('magic function 7', async () => {
  type Fn = (a: string, b: number) => Promise<number>
  const a = value(true)
  const mock = vi.fn()
  const fn = template(a)<Fn>(mock)

  await fn('a', 1)

  expect(mock.mock.lastCall).toStrictEqual([true, 'a', 1])
})

test('could set name', async () => {
  const execute = create(() => 'a', { name: 'test' })
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

test('prestaged function', async () => {
  type Config = { port: number }
  const stagedService = (config: Config) => {
    // will be a server
    return config.port
  }

  const config = value({ port: 3000 })
  const service = create(stagedService, config)

  const actualized = await service.get()
  expect(actualized).toBe(3000)
})

test('unstage function', async () => {
  const config = value({ port: 3000 })

  const service = create((config) => {
    // will be a server
    return config.port
  }, config)

  const alternativeConfig = value({ port: 4000 })
  const reService = await service.get(alternativeConfig)

  expect(reService).toBe(4000)
})

test('can mock easily', async () => {
  const config = value({ port: 3000 })
  const service = create((config) => {
    // will be a server
    return config.port
  }, config)

  const testConfig = value({ port: 4000 })
  const result = await service.get(testConfig)
  expect(result).toBe(4000)
})

test('can set value by early access to the root dependency', async () => {
  const port = create((port: number) => port, value(0))

  const service = create((port) => {
    // will be a server
    return port
  }, port)

  await port.get(value(4000))
  await port.get(value(3000))

  const result = await service.get()
  expect(result).toBe(4000)
})

test('provider with dependency cannot be initialized without dependency', async () => {
  const port = create((port: number) => port, undefined as any)

  expect(async () => await port.get()).rejects.toThrowError()
})

test('can use .set to change the value', async () => {
  const a = value('a')
  const c = create((a) => a, a)
  a.set('b')

  expect(await a.get()).equal('b')
  expect(await c.get()).equal('b')
})

test('expect error to be thown', async () => {
  const problematic = create(() => {
    throw new Error('test')
  })

  expect(async () => await problematic.get()).rejects.toThrowError('test')
  expect(async () => await problematic.get()).rejects.toThrowError('test')
})

test('expect onError to report error', async () => {
  const onError = vi.fn()
  const problematic = create(() => {
    throw new Error('test')
  }, { onError })

  await expect(async () => await problematic.get()).rejects.toThrowError('test')
  expect(onError).toBeCalledTimes(1)
  expect(onError).toBeCalledWith(expect.any(Error))

  await expect(async () => await problematic.get()).rejects.toThrowError('test')
  expect(onError).toBeCalledTimes(1)
})

test('expect onError to report error in prototype mode', async () => {
  const onError = vi.fn()
  const problematic = create(() => {
    throw new Error('test')
  }, { onError, mode: 'prototype' })

  await expect(async () => await problematic.get()).rejects.toThrowError('test')
  expect(onError).toBeCalledTimes(1)
  expect(onError).toBeCalledWith(expect.any(Error))

  await expect(async () => await problematic.get()).rejects.toThrowError('test')
  expect(onError).toBeCalledTimes(2)
})

test('expect onExecute to wrap around execution', async () => {
  let value = 0
  const resource = create(() => {
    return () => value++
  }, {
    onExecute: async (fn, execution) => {
      fn()
      const result = await execution(fn)
      fn()
      return result
    }
  })

  expect(await resource.execute((v) => v())).toBe(1)
  expect(value).toBe(3)
})

test('use set to change value', async () => {
  const value = create(() => ({ a: 'a' }))

  const b = create((a) => a, value)
  value.set({ a: 'b' })

  expect(await b.get()).toEqual({ a: 'b' })
})

test('make API', async () => {
  const port = make(value(0), (port: number) => port)

  const service = make(port, (port) => {
    // will be a server
    return port
  })

  await port.get(value(4000))
  await port.get(value(3000))

  const result = await service.get()
  expect(result).toBe(4000)
})