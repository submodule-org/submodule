import { combine, map, provide } from "@submodule/core"
import { writeConfig, readConfig, configSchema } from "./config";
import { installComponent, pull } from "./components"
import debug from "debug"

const addCmdDebug = debug('incompleto:cmds:add')

export const init = map(
  writeConfig,
  async (writeConfig) => {
    const defaultInitConfig = configSchema.parse({
      version: '1.0'
    })

    await writeConfig(defaultInitConfig)
  }
)

export const add = map(
  combine({ readConfig, writeConfig, installComponent }),
  async ({ readConfig, writeConfig, installComponent }) => {
    const currentConfig = await readConfig()
    if (!currentConfig.configFile) {
      throw new Error('need to initialized firstly')
    }
    addCmdDebug('current config %o', currentConfig)

    const currentComponents = new Set(currentConfig.config.components)
    return async (components: string[]) => {
      await installComponent(currentConfig.config, components)
    }
  }
)