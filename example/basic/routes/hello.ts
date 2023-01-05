import type { RouteFn } from "../types"

export default <RouteFn> function(context) {
  console.log('hello world')
  return { hello: 'world' }
}