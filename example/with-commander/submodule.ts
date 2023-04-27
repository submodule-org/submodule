import { builder, ExtractRouteFn } from "@submodule/core"
import { Command, program } from "commander"

type RouteModule = {
  default: (...args: any[]) => unknown
  command: Command
}

interface RouteFnExtractor extends ExtractRouteFn<RouteModule> {
  routeFn: this['routeModule']['default']
}

const sb = builder()
  .routeModule<RouteModule, RouteFnExtractor>()

export const defineRoute = sb.defineRouteFn

sb.serve({
  async loadRouteModules() {
    return {
      plus: await import('./commands/plus'),
      minus: await import('./commands/minus')
    }
  },

  async createRoute({ routeName, routeModule }) {
    return {
      async handle(context) {
        return await routeModule.default.apply(routeModule, context)
      },
      routeModule,
      routeName,
    }
  },

  async serve({ router }) {
    for (const [_, route] of Object.entries(router)) {
      program.addCommand(
        route.routeModule.command
          .action(async function () {
            console.log(await route.handle(arguments))
          })
      )
    }

    program.parse()
  }

})