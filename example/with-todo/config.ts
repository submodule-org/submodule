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