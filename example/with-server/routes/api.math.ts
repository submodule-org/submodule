import { defineRoute } from "../submodule.types";

export default defineRoute(({ rep, req }) => {
  console.log(req.params, req.headers)
  return { test: 'string'}
})