import { Submodule } from "@submodule/cli"

export default {
  createCommands() {
    throw new Error('adaptor threw exception')
  }
} satisfies Submodule