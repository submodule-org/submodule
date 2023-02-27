import type { RouteFn, RouteModule } from "../submodule.types"

const route: RouteFn = ({}) => {
  return context.todoService.listTodos()
}

export default route