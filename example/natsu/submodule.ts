import { Submodule } from "@submodule/cli"
import { connect, JSONCodec } from "nats"
import { z } from "zod"
import type { Config, NatsContext, PreparedContext, Router } from "./submodule.types"

import { NatsHandler, NatsHandleResult } from "@silenteer/natsu"
import { NatsService } from "@silenteer/natsu-type"
import * as helpers from "./services/helpers"
import logService from "./services/logger"
import natsService from "./services/nats"
import debug from "debug"

const natsuDebug = debug("submodule.natsu")

type AnyService = NatsService<string, unknown, unknown>
class ValidationError extends Error { constructor(message?: string) { super(message) } }
class AuthorizationError extends Error { constructor(message?: string) { super(message) } }

const codec = JSONCodec()

const natsuRequestSchema = z.object({
  headers: z.object({}).optional().default({}),
  body: z.any().optional()
}).optional().default({})

export async function processor(
  mod: NatsHandler<AnyService>,
  { subject, message }: NatsContext,
  preparedContext: PreparedContext): Promise<NatsHandleResult<AnyService>> {

  const input = message.data.length > 0
    ? codec.decode(message.data)
    : undefined

  const data = natsuRequestSchema.parse(input)

  const { authorizeInjection, handleInjection, natsInjection, validateInjection } = preparedContext
  const contextForValidation = { ...natsInjection, ...validateInjection, message, subject, handler: mod }
  const contextForAuthorization = { ...natsInjection, ...authorizeInjection, message, subject, handler: mod }
  const contextForHandle = { ...natsInjection, ...handleInjection, message, subject, handler: mod }

  return Promise.resolve()
    .then(_ => mod.validate?.(data, contextForValidation))
    .then(maybeValidated => {
      if (!maybeValidated || maybeValidated.code === 'OK') {
        return
      }

      throw new ValidationError()
    })
    .then(_ => mod.authorize?.(data, contextForAuthorization))
    .then(maybeAuthorized => {
      if (!maybeAuthorized || maybeAuthorized.code === 'OK') {
        return
      }

      throw new AuthorizationError()
    })
    .then(_ => mod.handle(data, contextForHandle))
    .then(handleResult => {
      return handleResult
    })
}

export default <Submodule<Config, PreparedContext, NatsContext, Router>>{
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

    const routers: Router = {}
    const paths = Object.keys(handlers)

    paths.forEach(path => {
      const validatedNatsuMod = natsuModuleSchema.safeParse(handlers[path])

      if (validatedNatsuMod.success) {
        const mod = validatedNatsuMod.data.default

        routers[mod.subject] = {
          meta: mod as any,
          handle: (context) => processor(mod as any, context, preparedContext)
        }
      }
    })

    return routers
  },

  async adaptorFn({ preparedContext: { nc }, router }) {

    const paths = Object.keys(router)
    paths.forEach(path => {
      natsuDebug('registering %s to route', path)
      const route = router[path]
      const sub = nc.subscribe(path);

      ; (async () => {
        for await (const msg of sub) {
          const context: NatsContext = {
            message: msg,
            subject: path
          }

          natsuDebug('incoming message %s %n', msg.subject, msg.data.length)
          const result = await route.handle(context)
          natsuDebug('finished processing %s %O', msg.subject, result)

          if (msg.reply && result !== undefined) {
            msg.respond(codec.encode(result))
          }
        }
      })();
    })
  }
}