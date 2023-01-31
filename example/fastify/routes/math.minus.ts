import { RouteFn, RouteMeta } from "../types";

type MathParam = {
  left: number
  right: number
}

export default <RouteFn<MathParam>> function (_, { left, right }) {
  return {
    sum: Number(left) - Number(right)
  }
}

export const meta: RouteMeta = {
  method: ['POST']
}