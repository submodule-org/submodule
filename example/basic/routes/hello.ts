import type { RouteFn } from "../types"

export default <RouteFn> function hello(param) {
  return param || { hello: 'something else' }
}