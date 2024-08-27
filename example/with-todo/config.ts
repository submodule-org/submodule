import { create } from "@submodule/core"

export const config = create(() => {
  const config = {
    levelConfig: {
      name: 'todo.level'
    },
    honoConfig: {
      port: 4000
    }
  }

  return config
})

export const honoConfig = create(async (config) => {
  return config.honoConfig
}, config)