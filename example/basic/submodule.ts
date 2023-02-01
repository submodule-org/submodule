import { Builder } from "@submodule/cli"
import { Command } from "commander"
import repl from "repl"
import stringArgv from 'string-argv'
import { z } from "zod"
import { Context, Router } from "./types"

export default Builder
  .new({
    appName: 'submodule-basic',
    appVersion: 'local-test',
  })
  .setHandlerFn<Context, Router>(async ({ handlers }) => {
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
  })
  .setAdaptorFn(async ({ router }) => {
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
  })
  .build()
