import { createScope, type Executor } from "@submodule/core"
import { createLogger } from "@submodule/meta-pino"

const mainLogger = createLogger("main")

export const main = async (...executions: Array<Executor<unknown>>) => {
  const scope = createScope()
  const logger = await mainLogger.resolve(scope)
  logger.debug("starting server")

  if (executions.length === 0) {
    logger.warn("no executions registered, will not start server")
    return
  }

  const onShutdown = async () => {
    logger.debug("shutting down...")
    setTimeout(() => process.exit(0), 5000)
    const e = await scope.dispose()

    process.exit(0)
  }

  process.on("SIGINT", () => {
    logger.debug("received SIGINT, shutting down...")
    onShutdown()
  })
  process.on("SIGTERM", () => {
    logger.debug("received SIGTERM, shutting down...")
    onShutdown()
  })

  let e: any

  try {
    const promises = executions.map(execution => execution.resolve(scope))
    await Promise.all(promises)
  } catch (e) {
    logger.error("Encountered error", e)
  } finally {
    logger.debug("Trigger system dispose")
    scope.dispose()

    if (e) process.exit(1)
    process.exit(0)
  }
}