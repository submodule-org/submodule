import { createHonoModule } from "@incompleto/hono"
import { createPinoModule } from "@incompleto/pino"
import { createTRPCModule } from "@incompleto/trpc"
import { map, value } from "@submodule/core"

const loggers = createPinoModule({
  config: {
    msgPrefix: '[submodule] ',
  },
  pinoPretty: true
})

export const honos = createHonoModule({
  runtime: value('bun'),
  port: value(4000),
  logger: map(
    loggers.createLogger('hono'),
    (logger) => logger.info.bind(logger)
  )
})

export const trpc = createTRPCModule()