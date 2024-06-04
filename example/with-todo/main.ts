import { combine, createExecution, group } from "@submodule/core"
import { serve } from '@hono/node-server'
import { Hono } from "hono"
import { routes } from "./routes/todo.route"
import { config } from "./config"

const main = createExecution(async ({ todo, config }) => {
  const app = new Hono()

  for (const route of todo) {
    app.route("/", route)
  }

  const server = serve({
    fetch: app.fetch,
    port: config.honoConfig.port
  }, () => {
    console.log('hono will be listening at port', config.honoConfig.port)
  })

  return server
}, combine({
  todo: routes, config
}))

main.execute()