import type { Submodule } from "@submodule/cli"
import { Config, Context, PreparedContext, Router } from "./types"
import { z } from "zod"
import repl from "repl"
import { Command } from "commander"
import stringArgv from 'string-argv';

export default <Submodule<Config, PreparedContext, Context, Router>>{
  submodule: {
    appName: 'submodule-basic',
    appVersion: 'local-test',
  },

  async handlerFn({ handlers, preparedContext }) {
    const handlerSchema = z.object({
      default: z.function()
    })

    const router: Router = {}
    Object.keys(handlers).forEach(handlerName => {
      const parseResult = handlerSchema.safeParse(handlers[handlerName])

      if (parseResult.success) {
        router[handlerName] = {
          handle: (param) => {
            return parseResult.data.default(param)
          } 
        }
      }
    })

    return router
  },
  async adaptorFn({ router }) {
    const replServer = repl.start({ prompt: '> '})
    replServer.context.router = router
    replServer.defineCommand('send', {
      help: 'send command to the router',
      async action(args) {
        const command = new Command()
          .argument('<name>', 'function name')
          .argument('[params]', 'json parameter, will be parsed by JSON.parse')
          .action(async function (routeName, inputParam) {
            if (!router[routeName]) {
              console.log('route not found', args)
              return
            }
            
            const call = router[routeName].handle
            const params = inputParam
              ? JSON.parse(inputParam)
              : undefined

            console.log(await call(params))
          })
          
        if (args.trim() === '') {
          console.log(command.helpInformation())
        } else {
          await command.parseAsync(stringArgv(args), { from: 'user' })
        }

        this.displayPrompt()
      }
    })
  }
}