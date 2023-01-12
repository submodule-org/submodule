import type { RouteFn } from "../types"

export default <RouteFn> function hello(context) {
  return { hello: 'something else' }
}