import { vi, it, test, expect } from "vitest"
import { Submodule } from "../src"
import { createSubmoduleInstance } from "../src/core"
import { createCaller } from "../src/client"

test('test empty instance should work', async () => {
  const submodule: Submodule = {}
  const routes = {}

  const { config, services, router } = await createSubmoduleInstance(submodule, routes)

  expect(config).toEqual({})
  expect(services).toEqual({})
  expect(router).toEqual({})
})

test('test simple routing', async () => {
  const handler = vi.fn()

  const submodule: Submodule = {}
  const routes = {
    test: { default: handler }
  }

  const { config, services, router } = await createSubmoduleInstance(submodule, routes)

  expect(config).toEqual({})
  expect(services).toEqual({})
  expect(Object.keys(router)).toContain('test')

  await router['test'].handle({})

  expect(handler).toBeCalledTimes(1)
})

test('test createCaller', async () => {
  const handler = vi.fn().mockImplementation(({ config, services }) => {
    return [config, services]
  })

  const submodule: Submodule = { 
    createConfig: () => ({ config: 'config'}), 
    createServices: () => ({ services: 'services' })
  }
  const routes = {
    test: { default: handler }
  }

  await createSubmoduleInstance(submodule, routes)

  const caller = createCaller(async ({ config, services, router }, query, context) => {
    return router[query].handle(context)
  })

  const result = await caller('test', 'something') as Array<any>
  expect(result[0]).toEqual({ config: 'config'})
  expect(result[1]).toEqual({ services: 'services'})

})

test('test config and service promise fn', async () => {
  const configFn = vi.fn().mockImplementation(() => {
    return Promise.resolve({ test: 'value' })
  })

  const serviceFn = vi.fn().mockImplementation(({ config }) => {
    return Promise.resolve({ [config.test]: 'test' })
  })

  const submodule: Submodule = { createConfig: configFn, createServices: serviceFn }
  const routes = {}

  const { config, services } = await createSubmoduleInstance(submodule, routes)
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

  const submodule: Submodule = { createConfig: configFn, createServices: serviceFn }
  const routes = {}

  const { config, services } = await createSubmoduleInstance(submodule, routes)
  expect(configFn).toHaveBeenCalledOnce()
  expect(serviceFn).toHaveBeenCalledOnce()

  expect(config).toEqual({ test: 'value' })
  expect(services).toEqual({ value: 'test' })
})

test('test custom route handle', async () => {
  const createRoute: Submodule['createRoute'] = vi.fn().mockImplementation(({ routeModule, routeName }) => {
    return {
      handle: async (ctx) => {
        return [ctx, await routeModule.custom()]
      },
      routeModule,
      routeName
    }
  })

  const submodule: Submodule = { createRoute }
  const routes = {
    test: { 
      custom: () => 'hello world',
      meta: 'string'
    }
  }

  const { router } = await createSubmoduleInstance(submodule, routes)
  expect(router['test']).to.not.toBeNull
  expect(router['test'].routeModule['meta']).toBe('string')

  const result = await router['test'].handle('test') as Array<any>
  expect(Array.isArray(result)).toBeTruthy()
  expect(result[0]).toBe('test')
  expect(result[1]).toBe('hello world')
})