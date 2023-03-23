import { Submodule } from "@submodule/cli"

export default {
  async createConfig() {
    throw new Error('config threw exception')
  }
} satisfies Submodule