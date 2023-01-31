import { Codec, connect, JSONCodec, NatsConnection, PublishOptions, RequestOptions } from "nats"
import { NatsInjection } from "@silenteer/natsu"
import { NatsService } from "@silenteer/natsu-type"

type NatsServiceConfig = {
  nc: NatsConnection
  codec: Codec<any>
}

export default async function natsService({ nc, codec }: NatsServiceConfig): Promise<NatsInjection<NatsService<string, any, any>>['natsService']> {
  return {
    drain: nc.drain,
    
    async request(subject: string, data?: any, opts?: RequestOptions) {
      const sendingData = data && codec.encode(data)
      return nc.request(subject, sendingData, opts)
    },

    async publish(subject: string, data?: any, opts?: PublishOptions) {
      const sendingData = data && codec.encode(data)
      return nc.publish(subject, sendingData, opts)
    },
    
    subscribe: nc.subscribe
  }
}