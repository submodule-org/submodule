import { combine, provide, map, type Executor, type inferProvide } from "@submodule/core"
import type { AnyRouter, AnyProcedure } from "@trpc/server"

export const createTRPCModule = () => {

  const trpcModule = provide(async () => {
    return await import('@trpc/server')
  })

  const initialized = map(
    trpcModule,
    async (trpcModule) => {
      return trpcModule.initTRPC.create()
    }
  )

  type T = inferProvide<typeof initialized>

  const procedure = <V extends AnyProcedure>(e: Executor<(t: T) => V>) => {
    return map(
      combine({ initialized, e }),
      ({ initialized, e }) => e(initialized)
    )
  }

  const router = <V extends AnyRouter>(
    route: Executor<(t: T) => V>
  ) => {
    return map(
      combine({ initialized, route }),
      ({ initialized, route }) => route(initialized)
    )
  }

  const createCallerFactory = <V extends AnyRouter>(e: Executor<V>) => {
    return map(
      combine({ initialized, e }),
      ({ initialized, e }) => initialized.createCallerFactory(e)
    )
  }

  return {
    mod: trpcModule,
    initialized,
    procedure,
    router,
    createCallerFactory
  }
}