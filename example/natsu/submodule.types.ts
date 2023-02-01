import type { NatsResponse, NatsService } from "@silenteer/natsu-type"
import type { NatsHandler, NatsInjection, NatsAuthorizationInjection, NatsValidationInjection, NatsHandleInjection, NatsHandleResult } from "@silenteer/natsu"
import type { Msg, NatsConnection } from "nats"

type AnyService = NatsService<string, unknown, unknown>

export type Config = {}


export type PreparedContext = {
  nc: NatsConnection
  natsInjection: Pick<NatsInjection<AnyService>, 'natsService' | 'logService'>
  authorizeInjection: Pick<NatsAuthorizationInjection<AnyService>, 'ok' | 'error'>
  validateInjection: Pick<NatsValidationInjection<AnyService>, 'ok' | 'error'>
  handleInjection: Pick<NatsHandleInjection<AnyService>, 'ok' | 'error'>
}

export type RequestContext = {
  subject: string
  message: Msg
}

export type NatsContext = Pick<NatsInjection<AnyService>, "subject" | "message">

export type Route = {
  handle: (context: NatsContext) => Promise<NatsHandleResult<AnyService>>
  meta: NatsHandler<AnyService>
}

export type Router = Record<string, Route>