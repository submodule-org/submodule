import { SubmoduleInstance } from "./index";

export const submoduleSymbol = Symbol.for('submodule')

function setClient(_submoduleInstance: SubmoduleInstance) {
  global[submoduleSymbol] = _submoduleInstance
}

function getClient(): SubmoduleInstance {
  if (!global[submoduleSymbol]) throw new Error(`submodule isn't ready`)

  return global[submoduleSymbol]
}

export { getClient, setClient }