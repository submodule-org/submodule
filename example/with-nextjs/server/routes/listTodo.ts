import { defineRoute } from "../submodule";

export default defineRoute((services) => {
  return services.todoService.list()
})