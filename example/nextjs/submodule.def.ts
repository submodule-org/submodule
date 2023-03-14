import { Submodule, createCaller } from "@submodule/cli"
import { Router } from "./submodule.router"

export declare module SubmoduleNext {
  type Config = {
    port: number
    apiPath: string
  }

  type SubmoduleDef = Submodule<Config>
}

export const caller = createCaller<Router, SubmoduleNext.SubmoduleDef>(
  //            ^?
  async (instance, query, context) => {
    return instance.router[query]?.handle(context)
  })
