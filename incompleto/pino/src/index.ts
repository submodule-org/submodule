import { combine, type Executor, map, normalize, provide } from "@submodule/core"
import type { Logger, LoggerOptions } from "pino"

type PinoModuleConfig = {
  pinoPretty?: boolean
  config?: LoggerOptions
}

export const createPinoModule = (config: PinoModuleConfig | Executor<PinoModuleConfig>) => {
  const moduleConfig = normalize(config)
  const pinoModule = provide(async () => {
    return await import('pino')
  })

  const defaultLoggerOptions = provide((): LoggerOptions => {
    return {}
  })

  const _config = map(
    combine({ defaultLoggerOptions, moduleConfig }),
    ({ moduleConfig, defaultLoggerOptions }) => {
      const config = {
        ...defaultLoggerOptions,
        ...moduleConfig.config
      }

      return config
    })

  const pinoPretty = map(
    moduleConfig,
    async (moduleConfig) => {
      if (!moduleConfig.pinoPretty) return undefined

      const prettyMod = await import('pino-pretty')
      return prettyMod.PinoPretty
    })

  const rootLogger = map(
    combine({ pinoModule, _config, pinoPretty }),
    async ({ pinoModule, _config, pinoPretty }): Promise<Logger> => {
      if (pinoPretty) {
        return pinoModule.default(pinoPretty(_config))
      }

      return pinoModule.default(_config)
    })

  return {
    createLogger: (name: string, attrs?: Record<string, unknown>): Executor<Logger> => {
      return map(
        combine({ rootLogger }),
        ({ rootLogger }) => {
          return rootLogger.child({
            name,
            ...attrs
          })
        })
    }
  }

}