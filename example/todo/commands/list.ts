import type { PreparedContext } from "../submodule.types";

export default async function({ preparedContext }: { preparedContext: PreparedContext}) {
  console.log(await preparedContext.todoService.listTodos())
}