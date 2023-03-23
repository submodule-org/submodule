import next from "next"
import fastify from "fastify"
import { parse } from "url"
import { SubmoduleNext } from "./submodule.def"

export default {

  createConfig() {
    return {
      port: 3000,
      apiPath: '/api/'
    }  
  },

  async createCommands({ config, router, submoduleArgs }) {
    const app = next({ dev: submoduleArgs.isDev, quiet: submoduleArgs.isDev })
    const handle = app.getRequestHandler()
    await app.prepare()

    const server = fastify({
    })

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
    console.log('server is listening at port', config.port)
  }
} satisfies SubmoduleNext.SubmoduleDef


