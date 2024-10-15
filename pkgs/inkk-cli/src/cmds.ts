import { combine, map } from "@submodule/core"
import { writeConfig, readConfig, configSchema, configHelper } from "./config";
import { installComponent } from "./components"

import debug from "debug"

const addCmdDebug = debug('inc:cmds:add')

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

    return async (component: string, alias?: string) => {
      addCmdDebug('adding component { name: %s, alias: %s }', component, alias)
      await installComponent(currentConfig.config, component, alias)

      if (!currentConfig.hasComponent(component)) {
        currentConfig.config.components.push({ name: component, alias })
        await writeConfig(currentConfig.config)
        return
      }

      addCmdDebug('component %s already exists, skip', component)
    }
  }
)

const installDebug = debug('inc:cmds:install')
export const install = map(
  combine({ readConfig, installComponent }),
  async ({ readConfig, installComponent }) => {
    const currentConfig = await readConfig()
    if (!currentConfig.configFile) {
      throw new Error('need to initialized firstly')
    }

    installDebug('current config %o', currentConfig)
    return async () => {
      for (const c of currentConfig.config.components) {
        const component = typeof c === 'string' ? { name: c } : c
        await installComponent(currentConfig.config, component.name, component.alias)
      }
    }
  }
)