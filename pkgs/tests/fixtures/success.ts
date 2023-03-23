import { Submodule } from "@submodule/cli"

export default {
  async createConfig() {
    return { config: 'config' }
  },
  async createServices() {
    return { services: 'services' }
  }
} satisfies Submodule