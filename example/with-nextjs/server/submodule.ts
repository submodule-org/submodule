import { value } from "@submodule/core";
import { todoService } from "./services/todo.service"
import { from } from "@submodule/core";

export const { execute } = from(value(todoService))
