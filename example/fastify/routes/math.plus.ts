import { RouteFn } from "../types";

type MathParam = {
  left: number
  right: number
}

export default <RouteFn<MathParam>> function ({ logger }, { left, right }) {
  return {
    sum: Number(left) - Number(right)
  }
}