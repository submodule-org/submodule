import type { CliApp } from "./submodule.types"
import { Command, program } from "commander"

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
        fn({ config, context, input: {}, services })
      },
      args: routeModule.args,
      options: routeModule.options
    }
  },

  async createCommands({ router, subCommand, commandArgs }) {
    Object.keys(router)
      .forEach(routerKey => {
        const { handle, args, options } = router[routerKey]

        const command = new Command(routerKey)

        args?.forEach(arg => command.addArgument(arg))
        options?.forEach(opt => command.addOption(opt))
        command.action(function handler() {
          const commandRef = arguments[arguments.length - 1] as Command
          handle({ args: commandRef.args, options: commandRef.opts() })
        })

        program.addCommand(command)
      })

    if (subCommand === undefined) {
      program.help()
    } else {
      await program.parseAsync(commandArgs)
    }
  },

} satisfies CliApp.CliSubmodule