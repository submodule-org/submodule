import { expect, test, vi } from "vitest"
import { combine, create, execute, prepare, value, flat, unImplemented, createScope, factory, factorize, produce, provide, map, getScope, createFamily } from "../src"

test('submodule should work', async () => {
  const a = create(() => 'a' as const)
  expect(await getScope().resolve(a)).toMatch('a')

  const b = create(async () => 'b' as const)
  expect(await getScope().resolve(b)).toMatch('b')

  const d = await execute(c => c, b)
  expect(d).toBe('b')
})

test('submodule can be used as dependencies', async () => {
  const a = create(() => 'a')
  const b = create((x) => x, a)

  const result = await getScope().resolve(b)
  expect(result).eq('a')
})

test('array should also work as list of resolvers', async () => {
  const a = provide(() => 1)
  const b = provide(() => { throw 'thrown error' })

  const scope = createScope()
  await expect(async () => await scope.resolve([a, b])).rejects.toThrowError('thrown error')
  expect(scope.has(a)).toBe(true)
  expect(scope.has(b)).toBe(true)
})

test('safeResolve should work', async () => {
  const scope = createScope()
  const a = value(1)
  const b = provide<string>(() => { throw 'thrown error' })

  const result = await scope.safeResolve([a, b])
  expect(result.type).toBe('error')
  expect(result.error).toBe('thrown error')

  expect(scope.has(a)).toBe(true)
  expect(scope.has(b)).toBe(true)
})

test('safeRun should work', async () => {
  const scope = createScope()

  const goodValue = value(1)
  const anotherGoodValue = value('good')
  const badValue = provide(() => Promise.reject('error'))

  const errorResult = await scope.safeRun(
    { goodValue, badValue },
    async () => { }
  )

  expect(errorResult.type).toBe('error')

  const goodResult = await scope.safeRun({ goodValue, anotherGoodValue }, async ({ goodValue, anotherGoodValue }) => {
    return goodValue + anotherGoodValue
  })

  expect(goodResult.type).toBe('ok')
  expect(goodResult.data).toBe('1good')

  const r = await scope.safeRun(
    [goodValue, anotherGoodValue],
    async ([goodValue, anotherGoodValue], factor: string) => {
      return goodValue + anotherGoodValue + factor
    },
    'factor'
  )

  expect(r.type).toBe('ok')
  expect(r.data).toBe('1goodfactor')
})

test('create should not be eager', async () => {
  const fn = vi.fn(() => 'a')

  const a = create(fn)
  process.nextTick(async () => {
    expect(fn).toBeCalledTimes(0)
    await getScope().resolve(a)
    expect(fn).toBeCalledTimes(1)
  })
})

test('combine should work', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })
  const result = await getScope().resolve(ab)
  expect(result).toEqual({ a: 'a', b: 'b' })
})

test('combined can be separated', async () => {
  const a = provide(() => 'a')
  const b = provide(() => 'b')
  const ab = combine({ a, b })

  const separated = ab.separate()
  expect(separated.a).toBe(a)
  expect(separated.b).toBe(b)
})

test('should only executed one even in combine', async () => {
  const fnA = vi.fn(() => 'a')
  const lazyA = create(fnA)

  const fnB = vi.fn(() => 'b')
  const eagerB = create(fnB)

  const ab = combine({ a: lazyA, b: eagerB })

  await getScope().resolve(ab)

  expect(fnA).toBeCalledTimes(1)
  expect(fnB).toBeCalledTimes(1)
})

test('submodule can be chained', async () => {
  type Req = { a: string }

  const transform = create(() => {
    return (req: Req) => ({ b: req.a })
  })

  const fn = await getScope().resolve(transform)

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

  await expect(async () => await getScope().resolve(b)).rejects.toThrowError('test')
})

test('can mock easily', async () => {
  const config = value({ port: 3000 })
  const service = create((config) => {
    // will be a server
    return config.port
  }, config)

  const testConfig = { port: 4000 }
  getScope().resolveValue(config, testConfig)
  const result = await getScope().resolve(service)
  expect(result).toBe(4000)
})

test('can set value by early access to the root dependency', async () => {
  const port = create((port: number) => port, value(0))

  const service = create((port) => {
    // will be a server
    return port
  }, port)

  getScope().resolveValue(port, value(4000))
  getScope().resolveValue(port, value(3000))

  const result = await getScope().resolve(service)
  expect(result).toBe(4000)
})

test('provider with dependency cannot be initialized without dependency', async () => {
  const port = unImplemented<number>()

  const falsyScope = createScope()
  expect(async () => await falsyScope.resolve(port)).rejects.toThrowError('not implemented')

  const truthyScope = createScope()
  port.subs(value(1))
  expect(await truthyScope.resolve(port)).toBe(1)
})

test('factory should work', async () => {
  const fnFactory = factory<(value: string) => number>()
  const seed = value(1)
  const stringToNumber = fnFactory(create((seed) => {
    return (value: string) => Number(value) + seed.valueOf()
  }, seed))

  const result = await getScope().resolve(stringToNumber)
  expect(result('1')).toBe(2)
})

test('expect error to be thown', async () => {
  const problematic = create(() => {
    throw new Error('test')
  })

  expect(async () => await getScope().resolve(problematic)).rejects.toThrowError('test')
  expect(async () => await getScope().resolve(problematic)).rejects.toThrowError('test')
})

test('can use object as dependency', async () => {
  const intValue = value(1)
  const strValue = value('test')

  const comb = create(({ intValue, strValue }) => {
    return String(intValue) + strValue
  }, combine({ intValue, strValue }))

  expect(await getScope().resolve(comb)).toBe('1test')
})

test('submodule can be substituted', async () => {
  const intValue = value(1)
  intValue.subs(value(2))

  const i = await getScope().resolve(intValue)
  expect(i).toBe(2)
})

test("flat should work", async () => {
  const a = create(() => create(() => 'a'))
  const ar = await getScope().resolve(flat(a))
  expect(ar).toBe('a')
})

test("submodule can do cachedFactory", async () => {
  type LogConfig = {
    name: string
    level: 'debug' | 'info' | 'warn' | 'error'
  }

  const createLogger = factorize(
    async (config: LogConfig) => {
      return {
        log: (msg: string) => {
          return `${config.level} - ${config.name} - ${msg}`
        }
      }
    }
  )

  const systemLogger = createLogger({ name: 'system', level: 'debug' })
  const anotherSystemLogger = createLogger({ name: 'system', level: 'info' })
  const userLogger = createLogger({ name: 'user', level: 'info' })

  const scope = createScope()
  const r = await scope.resolve({ systemLogger, userLogger, anotherSystemLogger })

  expect(r.systemLogger.log('hello')).toBe('debug - system - hello')
  expect(r.userLogger.log('hello')).toBe('info - user - hello')
})

test("factory can make use of executor as well", async () => {
  type ServerConfig = {
    port: number
  }

  const rootServerConfig = create(() => ({ port: 4000 } as ServerConfig))

  const createServer = factorize(
    create((rootConfig) => async (config: ServerConfig) => {
      return {
        serverPort: config.port + rootConfig.port
      }
    }, rootServerConfig),
  )

  const server = createServer({ port: 4000 })

  const scope = createScope()
  const r = await scope.resolve(server)
  expect(r.serverPort).toBe(8000)
})

test("null or undefined will not be cached", async () => {
  let seed = 0
  const fn = vi.fn()

  const plus = create(() => {
    fn(seed++)
  })

  const scope = createScope()
  await scope.resolve(plus)
  expect(fn).toBeCalledTimes(1)

  await scope.resolve(plus)
  expect(fn).toBeCalledTimes(2)
})

test("use fullfill to create a module", async () => {
  const plus = create(() => {
    return (seed: number) => seed + 1
  })

  const formula = produce(plus, value(1))

  const scope = createScope()
  const result = await scope.resolve(formula)
  expect(result).toBe(2)
})

test("fulfillment can make use of destructuring", async () => {
  type Config = {
    server: string
    port: string
  }

  const defaultConfig = value({
    server: 'localhost',
    port: '4000'
  } satisfies Config)

  const createServer = create((defaultConfig) => {
    return (config: Partial<Config>) => {
      return `${config.server || defaultConfig.server}:${config.port || defaultConfig.port}`
    }
  }, defaultConfig)

  const server1 = produce(createServer, value({ port: '3000' }))
  const server2 = produce(createServer, value({ server: '127.0.0.1' }))

  const scope = createScope()
  const r = await scope.resolve({ server1, server2 })
  expect(r.server1).toBe('localhost:3000')
  expect(r.server2).toBe('127.0.0.1:4000')

})

test("provide and map should work", async () => {
  const seed = provide(() => 4000)
  const factor = value(-1)
  const negate = map(factor, (factor) => (v: number) => factor * v)

  const plus = map(seed, (seed) => seed + 1)
  const nagativeSeed = map(seed, negate)

  const scope = createScope()
  const r = await scope.resolve({ plus, nagativeSeed })
  expect(r.plus).toBe(4001)
  expect(r.nagativeSeed).toBe(-4000)
})

test('createFamily should work', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor)

  const scope = createScope()
  const result1 = await scope.resolve(family('key1'))
  const result2 = await scope.resolve(family('key2'))

  const result12 = await scope.resolve(family('key1'))

  expect(result1).toBe('value for key1')
  expect(result2).toBe('value for key2')
  expect(result12).toBe('value for key1')

  expect(fn).toBeCalledTimes(2)
})

test('createFamily should work with object keys', async () => {
  const fn = vi.fn((key: { id: number }) => `value for ${key.id}`)
  const executor = provide(() => fn)
  const family = createFamily(executor)

  const scope = createScope()
  const result1 = await scope.resolve(family({ id: 1 }))
  const result2 = await scope.resolve(family({ id: 2 }))

  const result12 = await scope.resolve(family({ id: 1 }))

  expect(result1).toBe('value for 1')
  expect(result2).toBe('value for 2')
  expect(result12).toBe('value for 1')

  expect(fn).toBeCalledTimes(2)
})

test('createFamily should work with nested object keys', async () => {
  const fn = vi.fn((key: { id: number, nested: { subId: number } }) => `value for ${key.id}-${key.nested.subId}`)
  const executor = provide(() => fn)
  const family = createFamily(executor)

  const scope = createScope()
  const result1 = await scope.resolve(family({ nested: { subId: 1 }, id: 1 }))
  const result2 = await scope.resolve(family({ nested: { subId: 2 }, id: 1 }))
  const result3 = await scope.resolve(family({ nested: { subId: 1 }, id: 2 }))

  const result12 = await scope.resolve(family({ nested: { subId: 1 }, id: 1 }))

  expect(result1).toBe('value for 1-1')
  expect(result2).toBe('value for 1-2')
  expect(result3).toBe('value for 2-1')
  expect(result12).toBe('value for 1-1')

  expect(fn).toBeCalledTimes(3)
})

test('createFamily should work with limitToProvided option', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor, { init: [['key1', value('value for key1')]], limitToProvided: true })

  const scope = createScope()

  const result1 = await scope.resolve(family('key1'))
  await expect(scope.resolve(family('key2'))).rejects.toThrowError('key "key2" is not provided')

  expect(result1).toBe('value for key1')
  expect(fn).toBeCalledTimes(0)
})

test('createFamily should work without limitToProvided option', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor)

  const scope = createScope()
  const result1 = await scope.resolve(family('key1'))
  const result2 = await scope.resolve(family('key2'))

  expect(result1).toBe('value for key1')
  expect(result2).toBe('value for key2')
  expect(fn).toBeCalledTimes(2)
})

test('createFamily should work with init option', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor, { init: [['key1', value('initial value')]] })

  const scope = createScope()
  const result1 = await scope.resolve(family('key1'))
  const result2 = await scope.resolve(family('key2'))

  expect(result1).toBe('initial value')
  expect(result2).toBe('value for key2')
  expect(fn).toBeCalledTimes(1)
})

test('createFamily should work with custom keyBuilder option', async () => {
  const fn = vi.fn((key: { id: number }) => `value for ${key.id}`)
  const executor = provide(() => fn)
  const customKeyBuilder = (key: { id: number }) => `custom-${key.id}`
  const family = createFamily(executor, { keyBuilder: customKeyBuilder })

  const scope = createScope()
  const result1 = await scope.resolve(family({ id: 1 }))
  const result2 = await scope.resolve(family({ id: 2 }))

  const result12 = await scope.resolve(family({ id: 1 }))

  expect(result1).toBe('value for 1')
  expect(result2).toBe('value for 2')
  expect(result12).toBe('value for 1')

  expect(fn).toBeCalledTimes(2)
})

test('createFamily should work with limitToProvided and init options', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor, { limitToProvided: true, init: [['key1', value('initial value')]] })

  const scope = createScope()
  const result1 = await scope.resolve(family('key1'))
  await expect(scope.resolve(family('key2'))).rejects.toThrowError('key "key2" is not provided')

  expect(result1).toBe('initial value')
  expect(fn).toBeCalledTimes(0)
})

test('createFamily should throw error if limitToProvided is true but no init is set', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)

  expect(() => createFamily(executor, { limitToProvided: true })).toThrowError('limitToProvided is set to true but no init is provided')
})

test('createFamily should work without limitToProvided option', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor)

  const scope = createScope()
  const result1 = await scope.resolve(family('key1'))
  const result2 = await scope.resolve(family('key2'))

  expect(result1).toBe('value for key1')
  expect(result2).toBe('value for key2')
  expect(fn).toBeCalledTimes(2)
})

test('createFamily should work with init option', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor, { init: [['key1', value('initial value')]] })

  const scope = createScope()
  const result1 = await scope.resolve(family('key1'))
  const result2 = await scope.resolve(family('key2'))

  expect(result1).toBe('initial value')
  expect(result2).toBe('value for key2')
  expect(fn).toBeCalledTimes(1)
})

test('createFamily should work with custom keyBuilder option', async () => {
  const fn = vi.fn((key: { id: number }) => `value for ${key.id}`)
  const executor = provide(() => fn)
  const customKeyBuilder = (key: { id: number }) => `custom-${key.id}`
  const family = createFamily(executor, { keyBuilder: customKeyBuilder })

  const scope = createScope()
  const result1 = await scope.resolve(family({ id: 1 }))
  const result2 = await scope.resolve(family({ id: 2 }))

  const result12 = await scope.resolve(family({ id: 1 }))

  expect(result1).toBe('value for 1')
  expect(result2).toBe('value for 2')
  expect(result12).toBe('value for 1')

  expect(fn).toBeCalledTimes(2)
})

test('createFamily should work with limitToProvided and init options', async () => {
  const fn = vi.fn((key: string) => `value for ${key}`)
  const executor = provide(() => fn)
  const family = createFamily(executor, { limitToProvided: true, init: [['key1', value('initial value')]] })

  const scope = createScope()
  const result1 = await scope.resolve(family('key1'))
  await expect(scope.resolve(family('key2'))).rejects.toThrowError('key "key2" is not provided')

  expect(result1).toBe('initial value')
  expect(fn).toBeCalledTimes(0)
})