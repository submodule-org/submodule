import { Command } from "@commander-js/extra-typings"
import { createCommand, startCmd } from "@submodule/meta-commander"
import { startServer } from "@submodule/meta-hono"
import { main } from "@submodule/meta-main"
import { add, list, toggle } from "./routes/todo.route"
import { create } from "@submodule/core"
import { todo } from "./services/todo.service"

const startServerCmd = createCommand(
  new Command("serve")
    .option("-p, --port <port>", "port to listen on", Number, 4000),
  ({ port }) => {
    return startServer({ port }, add, list, toggle)
  }
)

const todoCmd = createCommand(
  new Command("todo")
    .argument("[action]", "action to perform", String)
    .option("--id <id>", "id of todo to perform action on", String)
    .option("--value <value>", "content of the todo to add", String),
  (action, { id, value }) => {
    return create(async (todosvc) => {
      switch (action) {
        case "list":
        case "":
          console.log(await todosvc.listTodos())
          return
        case "add":
          if (!value) throw new Error("value is required")
          const addedTodo = await todosvc.addTodo({ value })

          console.log(addedTodo)
          return
        case "toggle":
          if (!id) throw new Error("id is required")

          const toggledTodo = await todosvc.toggleTodo(id)
          console.log(toggledTodo)
          return
      }
    }, todo)
  }
)

main(
  startCmd([startServerCmd, todoCmd])
)