import { RouteFn } from "../types";

export default <RouteFn> function ({ logger }) {
  logger.info("hello world")
  return {
    hello: 'world'
  }
}