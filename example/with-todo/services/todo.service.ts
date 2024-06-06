import { level } from "./level.client"
import { create } from "@submodule/core"

export type Todo = {
  id: string
  value: string
  done?: boolean
}

export const todo = create(async (db) => {
  function nextId(length: number = 6) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  async function addTodo(newTodo: Omit<Todo, 'id'>): Promise<Todo> {
    const id = nextId()
    await db.put(id, JSON.stringify({ ...newTodo, id }))

    return { ...newTodo, id }
  }

  async function listTodos(): Promise<Todo[]> {
    const result: Todo[] = []
    for await (const [key, value] of db.iterator()) {
      result.push(JSON.parse(value))
    }

    return result
  }

  async function getTodo(id: string): Promise<Todo> {
    const result = await db.get(id)

    if (!result) throw new Error(`cannot find requesting id ${id}`)

    return JSON.parse(result) as Todo
  }

  async function toggleTodo(id: string): Promise<void> {
    const todo = await getTodo(id)

    await db.put(id, JSON.stringify({ ...todo, done: !todo.done }))
  }

  return { addTodo, getTodo, toggleTodo, listTodos }
}, level)