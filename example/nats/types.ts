import { Msg, NatsConnection } from "nats"
import { z } from "zod"

export type PreparedContext = {
  nc: NatsConnection
}

export type Config = {
  nats?: {
    url: string
    user?: string
    pass?: string,
    workgroup?: string
    codec?: 'json' | 'string'
  }
}

export type NatsContext = {
  msg: Msg
  subject: string
} & PreparedContext

export type NatsFn<Input, Output> = (input: Input, context: NatsContext) => Output | Promise<Output>

export type NatsModule<Input = any, Output = any> = {
  handle: NatsFn<Input, Output>
  input?: z.ZodSchema<Input>
  output?: z.ZodSchema<Output>
  subject?: string
  codec?: 'json' | 'string'
}