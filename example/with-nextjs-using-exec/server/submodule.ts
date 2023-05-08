import { prepareExecutable } from "@submodule/core";
import { todoService } from "./services/todo.service"

export const { execute } = prepareExecutable(() => todoService)
