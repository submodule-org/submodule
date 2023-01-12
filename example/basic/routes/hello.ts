import type { RouteFn } from "../types"

export default <RouteFn> function hello(context) {
  console.log(context)
  return { hello: 'world' }
}