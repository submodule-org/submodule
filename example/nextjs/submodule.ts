import type { Submodule } from "@submodule/cli"
import next from "next"
import fastify from "fastify"
import { parse } from "url"

declare module SubmoduleNext {
  type Config = {
    port: number
    apiPath: string
  }
}

export default {

  createConfig() {
    return {
      port: 3000,
      apiPath: '/api/'
    }  
  },

  async createCommands({ config, router, submoduleArgs }) {
    const app = next({ dev: submoduleArgs.dev })
    const handle = app.getRequestHandler()
    await app.prepare()

    const server = fastify({})

    for (const routePath in router) {
      server.get(`${config.apiPath}${routePath}`, async (req, rep) => {
        const result = await router[routePath].handle({})

        rep.send(result)
      })
    }

    server.all('*', async function nextDelegate(req, rep) {
      const parsedUrl = parse(req.url, true)
      return handle(req.raw, rep.raw, parsedUrl)
    })

    server.listen({ port: config.port })
  }
} satisfies Submodule<SubmoduleNext.Config>