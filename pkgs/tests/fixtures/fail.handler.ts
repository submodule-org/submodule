import { Submodule } from "@submodule/cli"

export default <Submodule> {
  async handlerFn() {
    throw new Error('handler threw exception')
  }
}