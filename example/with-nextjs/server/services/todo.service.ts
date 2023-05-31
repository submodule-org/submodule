export type Todo = { id: number, value: string }

declare namespace global {
  let store: Map<number, Todo>
}

global['store'] = global['store'] || new Map()

const store: Map<number, Todo> = global['store']

let id = 0

export const todoService = {
  async list(): Promise<Todo[]> {
    console.log(Array.from(store.values()))
    return Array.from(store.values())
  },

  async add(todo: Omit<Todo, 'id'>) {
    const nextId = id++
    const todoItem = { ...todo, id: nextId }
    store.set(nextId, todoItem)

    return todoItem
  }
}

export type TodoService = typeof todoService