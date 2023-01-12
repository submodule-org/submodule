import { RouteFn } from "../types";

type MathParam = {
  left: number
  right: number
}

export default <RouteFn<MathParam>> function (_, { left, right }) {
  return {
    sum: Number(left) - Number(right)
  }
}