import { NatsInjection } from "@silenteer/natsu"
import { NatsService } from "@silenteer/natsu-type"

type LoggerConfig = {
}

export default async function logService({ }: LoggerConfig): Promise<NatsInjection<NatsService<string, any, any>>['logService']> {
  const logger = function (logLevel: string) { 
    return function( ...args: any[]) {
      console.log.apply(console, [logLevel, '-', ...args])
    }
  }

  return {
    error: logger('error'),
    info: logger('info'),
    log: logger('log'),
    warn: logger('warn')
  }
}