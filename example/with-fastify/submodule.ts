import {
  DefaultInputOutputExtractor,
  DefaultRouteFnExtractor,
  DefaultRouteModule,
  builder,
} from "@submodule/core";
import fastify, { FastifyReply, FastifyRequest, HTTPMethods } from "fastify";

type Config = { port: number };
type Services = {};
type RequestContext = { req: FastifyRequest; rep: FastifyReply };
type RouteMeta = { methods: HTTPMethods | HTTPMethods[] };
type RouteModule = DefaultRouteModule<RequestContext> & { meta?: RouteMeta };

export const submodule = builder()
  .config<Config>()
  .services<Services>()
  .context<RequestContext>()
  .routeModule<
    RouteModule,
    DefaultRouteFnExtractor<RequestContext>,
    DefaultInputOutputExtractor<RouteModule>
  >();

submodule.serve({
  createConfig() {
    return {
      port: Number(process.env.PORT_NUMBER || 3000),
    };
  },

  async loadRouteModules({}) {
    return {
      echo: await import("./routes/echo"),
    };
  },

  async createRoute({ config, services, routeModule, routeName }) {
    return {
      handle: async (context) => {
        const result = await routeModule.default(context);

        if (result !== undefined) {
          context.rep.send(result);
        }
      },
      routeModule,
      routeName,
    };
  },

  async serve({ config, router }) {
    const server = fastify();

    for (const [routeName, route] of Object.entries(router)) {
      server.route({
        method: route.routeModule.meta?.methods || ["GET"],
        url: `/${routeName}`,
        handler: (req, rep) => {
          return route.handle({ req, rep });
        },
      });
    }

    server.listen({
      port: config.port,
    });

    console.log("Server is listening at port", config.port);
  },
});

export const defineRoute = submodule.defineRouteFn;
export const defineMeta = (meta: RouteMeta) => meta;
export type Submodule = typeof submodule.serverSubmodule;
