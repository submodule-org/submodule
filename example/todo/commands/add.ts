import { program } from "commander"
import type { PreparedContext } from "../submodule.types";

export default async function({ preparedContext, args }: { preparedContext: PreparedContext, args: string[]}) {
  
  program.argument('<value>')
    .action(async (value: string) => {
      await preparedContext.todoService.addTodo({ value })
    })
    .parseAsync(args, { from: 'user' })

}