import type { NatsService } from "@silenteer/natsu-type"

export type HelloService = NatsService<'echo', string, string>