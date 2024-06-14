import { pino, LoggerOptions } from "pino"
import { create, value, Executor, isExecutor } from "@submodule/core"

const defaultLoggerConfig: LoggerOptions<never> = {
  level: "info",
}

const pinoConfig = value<LoggerOptions<never>>(defaultLoggerConfig)

export const logger = create((pinoConfig) => {
  return pino(pinoConfig)
}, pinoConfig)

export function setDevMode() {
  deriveDefaultLogger(opt => {
    return {
      ...opt,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          levelFirst: true,
          singleLine: true,
          colorizeObjects: false,
          ignore: 'pid,hostname'
        },
      },
    }
  })
}

export function setLoggerConfig(uc: LoggerOptions<never> | Executor<LoggerOptions<never>>): void {
  pinoConfig.subs(isExecutor(uc) ? uc : value(uc))
}

export function deriveDefaultLogger(m: (opt: LoggerOptions<never>) => LoggerOptions<never>): void {
  pinoConfig.subs(value(m({ ...defaultLoggerConfig })))
}

export function createLogger(name: string, attrs?: Record<string, any>) {
  return create((logger) => {
    return logger.child({
      name: name,
      ...attrs
    })
  }, logger)
}