import { NatsAuthorizationInjection, NatsHandleInjection, NatsValidationInjection } from "@silenteer/natsu"
import { NatsService } from "@silenteer/natsu-type"

type AnyService = NatsService<string, unknown, unknown>

type AuthorizeInjection = Pick<NatsAuthorizationInjection<AnyService>, 'ok' | 'error'>
type ValidateInjection = Pick<NatsValidationInjection<AnyService>, 'ok' | 'error'>
type HandleInjection = Pick<NatsHandleInjection<AnyService>, 'ok' | 'error'>

export const authorizationInjection: AuthorizeInjection = {
  ok() { return { code: 'OK' } },
  error(params) {
    return {
      code: params?.code || 403,
      errors: params?.errors
    }
  }
}

export const validationInjection: ValidateInjection = {
  ok() { return { code: 'OK' } },
  error(params) {
    return {
      code: params?.code || 400,
      errors: params?.errors
    }
  }
}

export const handleInjection: HandleInjection = {
  ok(params) {
    return {
      code: 'OK',
      body: params?.body,
      headers: params?.headers || {}
    }
  },
  error(params) {
    return {
      code: params?.code || 500,
      errors: params?.errors
    }
  },
}