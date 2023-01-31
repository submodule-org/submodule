import type { HelloService } from "../routes";
import type { NatsHandler } from "@silenteer/natsu";

export default <NatsHandler<HelloService>> {
  subject: 'echo',
  async authorize(params, { ok, error }) {
    return ok()
  },
  async validate(params, { ok, error }) {
    return ok()
  },
  async handle({ body }, { ok }) {
    return ok({ body })
  }
}