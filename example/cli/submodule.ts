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

  createRoute({ routeModule, config, services, routeName }) {
    return {
      async handle(context) {
        const fn = routeModule.default
        return fn({ config, context, input: {}, services })
      },
      args: routeModule.args,
      options: routeModule.options,
      description: routeModule.description
    }
  },

  async createCommands({ router }) {
    const commands: Commands = {}

    for (const routePath of Object.keys(router)) {
      const route = router[routePath]
      commands[routePath] = {
        action: async ({ args, opts}) => { 
          const result = await route.handle({ args, opts })
          console.log(result)
        },
        args: route?.args,
        opts: route?.options,
        description: route?.description
      }
    }

    return commands;
  },

} satisfies CliApp.CliSubmodule