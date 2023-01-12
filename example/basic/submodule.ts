import type { Submodule } from "@submodule/cli"
import { Config, Context, PreparedContext, RouteFn } from "./types"
import { z } from "zod"
import repl from "repl"
import { Command } from "commander"


export default <Submodule<Config, PreparedContext, Context, RouteFn>>{
  submodule: {
    appName: 'submodule-basic',
    appVersion: 'local-test',
  },

  async preparedContext() {
    return {
      test: require('./hello2').test
    }
  },

  async handlerFn({ handlers }) {
    const handlerSchema = z.object({
      default: z.function()
    })

    const router: Record<string, RouteFn> = {}
    Object.keys(handlers).forEach(handlerName => {
      const parseResult = handlerSchema.safeParse(handlers[handlerName])

      if (parseResult.success) {
        router[handlerName] = parseResult.data.default
      }
    })

    return router
  },
  async adaptorFn({ config, preparedContext, router }) {
    const context = { ...preparedContext, config: { ...config } }

    const replServer = repl.start({ prompt: '> '})
    replServer.context.router = router
    replServer.defineCommand('send', {
      help: 'send command to the router',
      async action(args) {
        const command = new Command()
          .argument('<name>', 'function name')
          .action(async args => {
            if (!router[args]) {
              console.log('route not found', args)
              return
            }

            console.log(await router[args](context))
          })
          
        if (args.trim() === '') {
          console.log(command.helpInformation())
        } else {
          await command.parseAsync(args.split(' '), { from: 'user' })
        }

        this.displayPrompt()
      }
    })
  }
}