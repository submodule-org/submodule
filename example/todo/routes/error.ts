import type { TodoApp } from "../submodule.types"

export default {
  handle: async () => {
    throw new Error('unexpected error')
  },
  meta: {
    method: 'GET'
  }
} satisfies TodoApp.Definition