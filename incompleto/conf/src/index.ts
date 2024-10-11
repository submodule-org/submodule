import { combine, create, type Executor, normalize } from "@submodule/core"
import type { Logger, LoggerOptions } from "pino"

type PinoModuleConfig = {
  pinoPretty?: boolean
  config?: LoggerOptions
}

export const createPinoModule = (config: PinoModuleConfig | Executor<PinoModuleConfig>) => {
  const moduleConfig = normalize(config)
  const pinoModule = create(async () => {
    return await import('pino')
  })

  const defaultLoggerOptions = create((): LoggerOptions => {
    return {}
  })

  const _config = create(({
    moduleConfig, defaultLoggerOptions
  }) => {
    const config = {
      ...defaultLoggerOptions,
      ...moduleConfig.config
    }

    return config
  }, { defaultLoggerOptions, moduleConfig })

  const pinoPretty = create(async (moduleConfig) => {
    if (!moduleConfig.pinoPretty) return undefined

    const prettyMod = await import('pino-pretty')
    return prettyMod.PinoPretty
  }, moduleConfig)

  const rootLogger = create(async ({ pinoModule, _config, pinoPretty }): Promise<Logger> => {
    console.log(_config)
    if (pinoPretty) {
      return pinoModule.default(pinoPretty(_config))
    }

    return pinoModule.default(_config)
  }, combine({
    pinoModule,
    _config,
    pinoPretty
  }))

  return {
    createLogger: (name: string, attrs?: Record<string, unknown>): Executor<Logger> => {
      return create(({ rootLogger }) => {
        return rootLogger.child({
          name,
          ...attrs
        })
      }, { rootLogger })
    }
  }

}