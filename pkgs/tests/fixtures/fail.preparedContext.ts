import { Submodule } from "@submodule/cli"

export default <Submodule> {
  async preparedContextFn() {
    throw new Error('prepared context error')
  }
}