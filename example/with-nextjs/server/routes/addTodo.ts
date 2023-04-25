import { Todo } from "../services/todo.service";
import { defineRoute } from "../submodule";

export default defineRoute((services, input: Omit<Todo, 'id'>) => {
  return services.todoService.add(input)
})