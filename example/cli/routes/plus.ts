import type { CliApp } from "../submodule.types"

export const description: CliApp.RouteModule['description'] = 'A simple plus equation'

export const args: CliApp.RouteModule['args'] = [
  { name: 'left', required: true, description: 'Left side of the equation'},
  { name: 'right', required: true, description: 'Right side of the equation'},
]

const fn: CliApp.RouteFn = ({ context }) => {
  const args = context.args

  const left = args[0]
  const right = args[1]
  
  return Number(left) + Number(right)
}

export default fn