import { GetRouteModules, serve } from "@submodule/core";
import type { Submodule } from "./submodule.types";
import fastify from "fastify"

const submodule = { 
  createConfig() {
    return {
      port: Number(process.env.PORT_NUMBER || 3000)
    }
  },

  async loadRouteModules({ }) {
    return {
      math: await import("./routes/api.math")
    }
  },

  async createRoute({ routeModule, routeName }) {
    return {
      handle: async (context) => {
        const result = await routeModule.default(context)

        if (result !== undefined) {
          context.rep.send(result)
        }
      },
      routeModule, routeName
    }
  },

  async serve({ config, router }) {
    const server = fastify()

    for (const [routeName, route] of Object.entries(router)) {
      server.route({
        method: route.routeModule.meta?.methods || ['GET'],
        url: `/${routeName}`,
        handler: (req, rep) => {
          return route.handle({ req, rep })
        }
      })
    }

    server.listen({
      port: config.port
    })

    console.log("Server is listening at port", config.port)
  }
} satisfies Submodule

export type Routes = GetRouteModules<typeof submodule>

serve(submodule)