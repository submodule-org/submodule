import { combine, provide, map, type Executor, type EODE, isExecutor, type inferProvide } from "@submodule/core"
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

  const procedure = <V extends AnyProcedure>(e: Executor<(t: T['procedure']) => V>) => {
    return map(
      combine({ initialized, e }),
      ({ initialized, e }) => e(initialized.procedure)
    )
  }

  const router = <V extends Record<string, AnyProcedure | AnyRouter>>(
    route: EODE<V>
  ) => {
    const combined = isExecutor(route) ? route : combine(route)
    return map(
      combine({ initialized, combined }),
      ({ initialized, combined }) => initialized.router(combined)
    )
  }

  const createCallerFactory = <V extends AnyRouter>(e: Executor<V>) => {
    return map(
      combine({ initialized, e }),
      ({ initialized, e }) => initialized.createCallerFactory(e)
    )
  }

  return {
    initialized,
    procedure,
    router,
    createCallerFactory
  }
}