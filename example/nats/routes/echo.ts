import { z } from "zod";
import { NatsModule } from "../types";

export default <NatsModule<string, string>> {
  input: z.string(),
  output: z.string(),
  async handle(input) {
    return input
  },
  codec: 'string'
}