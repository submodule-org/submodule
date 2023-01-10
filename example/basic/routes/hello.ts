import type { RouteFn } from "../types"
import { test } from "./hello2"

export default <RouteFn> function hello(context) {
  test()
  return { hello: 'world' }
}