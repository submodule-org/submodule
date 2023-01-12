import { Submodule } from "@submodule/cli"

export default <Submodule> {
  adaptorFn() {
    throw new Error('adaptor threw exception')
  }
}