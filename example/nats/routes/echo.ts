import { z } from "zod";
import { NatsModule } from "../types";

export default <NatsModule<string, string>> {
  input: z.string(),
  async handle(input, context) {
    context.logger('hello')
    return input
  },
  codec: 'string'
}