import { builder } from "@submodule/core";
import { todoService, TodoService } from "./services/todo.service"

type Services = { todoService: TodoService }

export const exec = builder()
  .services<Services>()
  .prepareExecutable({
    createServices() {
      return { todoService }
    },
    async execute({ route, config, services, initArgs, input }) {
      return route({ config, services, initArgs, input })
    }
  }, undefined)
