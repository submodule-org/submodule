import { value, map, createScope } from "@submodule/core"
import { Hono } from "hono"
import { z } from "zod"
import { trpc, honos } from "./submodules"

const helloProcedure = trpc.procedure(value(p => {
  return p
    .input(z.string())
    .query((o) => ({ hello: o.input }))
}))

const helloRoute = trpc.router({ hello: helloProcedure })
const caller = trpc.createCallerFactory(helloRoute)

async function main() {
  const scope = createScope()

  const hono = value(new Hono())
  const helloRoute = honos.get('/', map(
    caller,
    (caller) => async (context) => {
      const text = await caller({}).hello('abc')
      return context.json(text)
    }
  ))

  await scope.resolve(
    honos.start(hono, helloRoute)
  )
}

await main()