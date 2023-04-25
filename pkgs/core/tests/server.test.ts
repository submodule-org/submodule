import { vi, test, expect } from "vitest"
import { ServerSubmodule, startServer } from "../src/_server"

test('test empty instance should work', async () => {
  const submodule: ServerSubmodule = { async start() {}}
  const routes = {}

  const { config, services, router } = await startServer(submodule, routes)

  expect(config).toEqual({})
  expect(services).toEqual({})
  expect(router).toEqual({})
})

test('test simple routing', async () => {
  const handler = vi.fn()

  const submodule: ServerSubmodule = { async start() {} }
  const routes = {
    test: { default: handler }
  }

  const { config, services, router } = await startServer(submodule, routes)

  expect(config).toEqual({})
  expect(services).toEqual({})
  expect(Object.keys(router)).toContain('test')

  await router['test'].handle({})

  expect(handler).toBeCalledTimes(1)
})

test('test config and service promise fn', async () => {
  const configFn = vi.fn().mockImplementation(() => {
    return Promise.resolve({ test: 'value' })
  })

  const serviceFn = vi.fn().mockImplementation(({ config }) => {
    return Promise.resolve({ [config.test]: 'test' })
  })

  const submodule: ServerSubmodule = { createConfig: configFn, createServices: serviceFn, async start() {} }
  const routes = {}

  const { config, services } = await startServer(submodule, routes)
  expect(configFn).toHaveBeenCalledOnce()
  expect(serviceFn).toHaveBeenCalledOnce()

  expect(config).toEqual({ test: 'value' })
  expect(services).toEqual({ value: 'test' })
})

test('test config and service regular fn', async () => {
  const configFn = vi.fn().mockImplementation(() => {
    return { test: 'value' }
  })

  const serviceFn = vi.fn().mockImplementation(({ config }) => {
    return { [config.test]: 'test' }
  })

  const submodule: ServerSubmodule = { createConfig: configFn, createServices: serviceFn, async start() {} }
  const routes = {}

  const { config, services } = await startServer(submodule, routes)
  expect(configFn).toHaveBeenCalledOnce()
  expect(serviceFn).toHaveBeenCalledOnce()

  expect(config).toEqual({ test: 'value' })
  expect(services).toEqual({ value: 'test' })
})

test('test custom route handle', async () => {
  const createRoute: ServerSubmodule['createRoute'] = vi.fn().mockImplementation(({ routeModule, routeName }) => {
    return {
      handle: async (ctx) => {
        return [ctx, await routeModule.custom()]
      },
      routeModule,
      routeName
    }
  })

  const submodule: ServerSubmodule = { createRoute, async start() {} }
  const routes = {
    test: { 
      custom: () => 'hello world',
      meta: 'string'
    }
  }

  const { router } = await startServer(submodule, routes)
  expect(router['test']).to.not.toBeNull

  const result = await router['test'].handle('test') as Array<any>
  expect(Array.isArray(result)).toBeTruthy()
  expect(result[0]).toBe('test')
  expect(result[1]).toBe('hello world')
})