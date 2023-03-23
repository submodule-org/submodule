import type { CliApp } from "./submodule.types"
import { Commands } from "@submodule/cli"

export default {
  submodule: { appName: "example-cli" },

  createConfig() {
    return {
      demoName: "example-cli",
      demoPort: 1234567
    }
  },

  async createCommands({ router }) {
    const commands: Commands = {}

    for (const routePath in router) {
      const route = router[routePath]
      commands[routePath] = {
        action: async ({ args, opts}) => { 
          await route.handle({ args, opts })
        },
        args: route.routeModule?.args,
        opts: route.routeModule?.options,
        description: route.routeModule?.description
      }
    }

    return commands;
  },

} satisfies CliApp.CliSubmodule