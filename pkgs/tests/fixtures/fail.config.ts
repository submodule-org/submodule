import { Submodule } from "@submodule/cli"

export default <Submodule> {
  async configFn() {
    throw new Error('config threw exception')
  }
}