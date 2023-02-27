import { Argument } from "commander"
import type { CliApp } from "../submodule.types"

export const args = [
  new Argument('<left>', 'Left side of the formular'),
  new Argument('<right>', 'Right side of the formular')
]

const fn: CliApp.RouteFn = ({ context }) => {
  const args = context.args

  const left = args[0]
  const right = args[1]

  console.log(Number(left) + Number(right))
}

export default fn