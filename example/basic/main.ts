import { createHonoModule } from "@incompleto/hono"
import { createPinoModule } from "@incompleto/pino"
import { createScope, map, value } from "@submodule/core"

import { Hono } from "hono"

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

async function main() {
  const scope = createScope()

  const hono = value(new Hono())
  const helloRoute = honos.get('/', value(async (context) => {
    return context.json({ hello: 'world' })
  }))

  await scope.resolve(
    honos.start(hono, helloRoute)
  )
}

await main()