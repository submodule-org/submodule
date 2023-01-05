
export type Config = {
  fastify: {
    port: number
  }
}

export type PreparedContext = {
}

export type Context = PreparedContext & { config: Config }

export type RouteFn = (context: Context) => any