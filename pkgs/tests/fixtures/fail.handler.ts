import { Submodule } from "@submodule/cli"

export default {
  async createRoute() {
    throw new Error('handler threw exception')
  }
} satisfies Submodule