import { Submodule } from "@submodule/cli"

export default {
  async configFn() {
    const asyncConfig = await Promise.resolve(2)
    return { syncConfig: 1, asyncConfig }
  },
  async preparedContextFn() {
    const asyncContext = await Promise.resolve(2)
    return { syncContext: 1, asyncContext }
  }
} satisfies Submodule