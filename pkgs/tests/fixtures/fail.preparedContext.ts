import { Submodule } from "@submodule/cli"

export default {
  async createServices() {
    throw new Error('prepared context error')
  }
} satisfies Submodule