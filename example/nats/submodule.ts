import { type Submodule } from "submodule"
import dotenv from "dotenv"
import { z } from "zod"
import { Config, NatsContext, NatsModule, PreparedContext } from "./types"
import { connect, JSONCodec, StringCodec } from "nats"

export default <Submodule<Config, PreparedContext, NatsContext, NatsModule>> {
  configFn() {
    const envConfig = dotenv.config({ debug: Boolean(process.env.DEBUG) }).parsed

    const configSchema = z.object({
      nats: z.object({
        codec: z.literal('json').or(z.literal('string')).default('json'),
        url: z.string(),
        user: z.string().optional(),
        pass: z.string().optional(),
        workgroup: z.string().optional()
      }).optional()
    }) satisfies z.ZodType<Config>

    return configSchema.parse(envConfig)
  },
  async preparedContextFn({ config }) {
    const nc = await connect({ 
      servers: config.nats?.url,
      user: config.nats?.user,
      pass: config.nats?.pass,
    })
    
    return { nc }
  },
  handlerFn({ config, handlers, preparedContext }) {
    const handlerSchema = z.object({
      subject: z.string().optional(),
      input: z.instanceof(z.Schema).optional(),
      output: z.instanceof(z.Schema).optional(),
      handle: z.function(),
      codec: z.literal('json').or(z.literal('string')).default('json')
    }) satisfies z.ZodType<NatsModule>
    
    const routes: Record<string, NatsModule> = {}
    for (const path in handlers) {
      const handlerMod = handlerSchema.parse(handlers[path]?.['default'])
      routes[path] = handlerMod
    }

    return routes
  },
  adaptorFn({ config, preparedContext, router }) {
    const nc = preparedContext.nc
    const workgroup = config.nats?.workgroup
    const codecs = {
      string: StringCodec(),
      json: JSONCodec()
    } as const

    Object.keys(router).forEach(path => {
      const route = router[path]
      const sub = nc.subscribe(route.subject || path, { queue: workgroup });
      const codec = 'string' === route.codec
        ? codecs.string
        : codecs.json;

      ;(async () => {
        for await (const msg of sub) {
          const context: NatsContext = {
            ...preparedContext,
            msg,
            subject: route.subject || path
          }

          const incomingObject = msg.data.length > 0 
            ? codec.decode(msg.data)
            : {}

          route?.input?.parse(incomingObject)

          const result = await route.handle(incomingObject, context)

          if (msg.reply && result !== undefined) {
            msg.respond(codec.encode(result))
          }
        }
      })();
    })
  }
}