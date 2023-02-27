import { program } from "commander"
import type { PreparedContext } from "../submodule.types";

export default async function({ preparedContext, args }: { preparedContext: PreparedContext, args: string[]}) {
  
  program
    .argument('<id>')
    .action(async function (id: string) {
      await preparedContext.todoService.toggleTodo(id)
    })
    .parseAsync(args)

}