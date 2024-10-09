import { combine, type EODE, type Executor, group, isExecutor, map, normalize, scoper, value } from "@submodule/core"
import type { Handler, Hono, MiddlewareHandler } from "hono"

type HonoModuleEvents = 'route-added' | 'middleware-added' | 'server-started' | 'server-starting' | 'server-stopping' | 'server-stopped' | 'start-error'

export type HonoModuleConfig = {
  runtime: 'node' | 'bun' | 'deno'
  port?: number
  logger?: (event: HonoModuleEvents, ...msg: unknown[]) => void
}

export const createHonoModule = (config: EODE<HonoModuleConfig>) => {
  const normalizedConfig = isExecutor(config) ? config : combine(config)

  const defaultConfig = value<HonoModuleConfig>({
    runtime: 'node',
    port: 4000
  })

  const applicableConfig = map(
    combine({
      defaultConfig,
      normalizedConfig
    }),
    ({ defaultConfig, normalizedConfig }) => ({
      ...defaultConfig,
      ...normalizedConfig
    }))

  const use = (
    middleware: Readonly<Executor<{ path: string, middleware: MiddlewareHandler }>>
  ) => {
    return map(combine({ middleware, applicableConfig }), ({ middleware, applicableConfig }) => {
      return (hono: Hono) => {
        if (applicableConfig.logger) {
          applicableConfig.logger('middleware-added', middleware)
        }
        return hono.use(middleware.path, middleware.middleware)
      }
    })
  }

  const route = (path: string, app: Readonly<Executor<Hono>>) => {
    return map(combine({ app, applicableConfig }), ({ app, applicableConfig }) => {

      return (hono: Hono) => {
        if (applicableConfig.logger) {
          applicableConfig.logger('route-added', path)
        }
        return hono.route(path, app)
      }
    })
  }

  type verb = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options'
  const addRoute = (verb: verb) => (path: Readonly<string>, handler: Readonly<Executor<Handler>>) => {
    return map(combine({ handler, applicableConfig }), ({ handler, applicableConfig }) => {
      return (hono: Hono) => {
        if (applicableConfig.logger) {
          applicableConfig.logger('route-added', path)
        }
        return hono[verb](path, handler)
      }
    })
  }

  const get = addRoute('get')
  const post = addRoute('post')
  const put = addRoute('put')
  const deleteFn = addRoute('delete')
  const patch = addRoute('patch')
  const options = addRoute('options')

  const start = (
    hono: Readonly<Executor<Hono>>,
    ...modifers: Readonly<Array<Executor<(hono: Hono) => Hono>>>
  ) => {
    const groupedModifiers = group(...modifers)
    const instance = map(combine({ hono, groupedModifiers }), ({ hono, groupedModifiers }) => {
      return groupedModifiers.reduce((h, m) => m(h), hono)
    })

    return map(
      combine({ scoper, instance, applicableConfig }),
      async ({ scoper, instance, applicableConfig }) => {
        if (applicableConfig.runtime === 'node') {
          const { serve } = await import('@hono/node-server')
          if (applicableConfig.logger) {
            applicableConfig.logger('server-starting', { runtime: 'node', port: applicableConfig.port })
          }

          const server = serve({
            port: applicableConfig.port,
            fetch: instance.fetch
          }, () => {
            if (applicableConfig.logger) {
              applicableConfig.logger('server-started', { runtime: 'node', port: applicableConfig.port })
            }
          })

          scoper.addDefer(() => {
            server.close()
          })

          return server
        }

        if (applicableConfig.runtime === 'bun') {
          if (applicableConfig.logger) {
            applicableConfig.logger('server-starting', { runtime: 'bun', port: applicableConfig.port })
          }
          const server = Bun.serve({
            port: applicableConfig.port,
            fetch: instance.fetch
          })

          if (applicableConfig.logger) {
            applicableConfig.logger('server-started', { runtime: 'bun', port: applicableConfig.port })
          }

          scoper.addDefer(() => {
            if (applicableConfig.logger) {
              applicableConfig.logger('server-stopping', { runtime: 'bun', port: applicableConfig.port })
            }
            server.stop()
            if (applicableConfig.logger) {
              applicableConfig.logger('server-stopped', { runtime: 'bun', port: applicableConfig.port })
            }
          })

          return server
        }

        if (applicableConfig.logger) {
          applicableConfig.logger('start-error', { runtime: applicableConfig.runtime, port: applicableConfig.port })
        }

        throw new Error(`unknown runtime ${applicableConfig.runtime}`)
      }
    )
  }

  return {
    use,
    route,
    start,
    get,
    post,
    put,
    delete: deleteFn,
    patch,
    options
  }

}