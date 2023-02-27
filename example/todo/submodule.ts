import { createDb } from "./services/level.client"
import { createService } from "./services/todo.service"
import { TodoSubmodule } from "./submodule.types"


const submodule = {
  configFn() {
    return {
      levelConfig: {
        name: 'todo.level'
      },
      fastifyConfig: {
        port: 3000
      }
    }
  },

  async preparedContextFn({ config }) {
    const db = await createDb(config.levelConfig)
    const todoService = createService({ db })

    return {
      db, todoService
    }
  }
  
} satisfies TodoSubmodule

export default submodule