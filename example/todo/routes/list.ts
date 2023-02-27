import type { RouteFn, RouteModule } from "../submodule.types"

const route: RouteFn = (context, param) => {
  return context.todoService.listTodos()
}

export default route