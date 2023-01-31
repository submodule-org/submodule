import { Submodule } from "@submodule/cli"
import { connect, JSONCodec } from "nats"
import type { Config, PreparedContext, Context, Route } from "./submodule.types"
import { z } from "zod"

import natsService from "./services/nats"
import logService from "./services/logger"
import * as  helpers from "./services/helpers"
import { NatsAuthorizationResult, NatsHandler, NatsHandleResult, NatsValidationInjection, NatsValidationResult } from "@silenteer/natsu"
import { NatsService } from "@silenteer/natsu-type"


type AnyService = NatsService<string, unknown, unknown>
class ValidationError extends Error { constructor(message?: string) { super(message) }}
class AuthorizationError extends Error { constructor(message?: string) { super(message) }}

export async function processor(
  mod: NatsHandler<AnyService>, 
  context: Context, 
  preparedContext: PreparedContext): Promise<NatsHandleResult<AnyService>> {
    
  const { authorizeInjection, handleInjection, natsInjection, validateInjection } = preparedContext
  const contextForValidation = { ...natsInjection, ...validateInjection }
  const contextForAuthorization = { ...natsInjection, ...authorizeInjection }
  const contextForHandle = { ...natsInjection, ...handleInjection }

  return undefined as any
}

export default <Submodule<Config, PreparedContext, Context, Route>>{
  submodule: {
    appName: "submodule-natsu"
  },

  async preparedContextFn({ }) {
    const nc = await connect()

    const natsInjection = {
      natsService: await natsService({ nc, codec: JSONCodec() }),
      logService: await logService({})
    } satisfies PreparedContext['natsInjection']

    return {
      nc,
      natsInjection,
      authorizeInjection: helpers.authorizationInjection,
      handleInjection: helpers.handleInjection,
      validateInjection: helpers.validationInjection
    } satisfies PreparedContext

  },

  async handlerFn({ preparedContext, handlers }) {
    const natsuModuleSchema = z.object({
      default: z.object({
        subject: z.string(),
        authorize: z.function(),
        validate: z.function(),
        handle: z.function()
      })
    })

    const routers: Record<string, Route> = {}
    const paths = Object.keys(handlers)

    paths.forEach(path => {
      const validatedNatsuMod = natsuModuleSchema.safeParse(handlers[path])

      if (validatedNatsuMod.success) {
        const mod = validatedNatsuMod.data.default

        routers[path] = {
          ...mod,
          handle: (context: Context) => processor(mod as any, context, preparedContext)
        }
      }
    })

    return routers
  },

  async adaptorFn({ preparedContext: { nc, natsInjection }, router }) {

    const paths = Object.keys(router)
    paths.forEach(path => {
      const route = router[path]
      const sub = nc.subscribe(route.subject);
      const codec = JSONCodec()

        ; (async () => {
          for await (const msg of sub) {
            const input = msg.data.length > 0
              ? codec.decode(msg.data)
              : undefined

            const context: Context = {
              ...natsInjection,
              input,
              message: msg,
              handler: route as any,
              subject: route.subject || path
            }

            const result = await route.handle(context)

            if (msg.reply && result !== undefined) {
              msg.respond(codec.encode(result))
            }
          }
        })();
    })
  }
}