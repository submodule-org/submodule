import { defineMeta, defineRoute } from "../submodule";

export default defineRoute(({ rep, req }) => {
  return { 
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body
  }
})

export const meta = defineMeta({
  methods: ['GET', 'POST', 'DELETE']
})