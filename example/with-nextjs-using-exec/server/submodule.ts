import { prepareExecutable } from "@submodule/core";
import { todoService } from "./services/todo.service"

const configurator = prepareExecutable({
  createConfig() {
    return { port: 3000 }
  }
})

export const { execute } = prepareExecutable({
  async createServices() {
    return { todoService }
  },
})
