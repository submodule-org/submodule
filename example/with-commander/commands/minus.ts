import { Command } from "commander"
import { defineRoute } from "../submodule"

export default defineRoute((left: string, right: string) => {
  return Number(left) - Number(right)
})

export const command: Command = new Command("minus")
  .description('the minus operation')
  .argument('<left>')
  .argument('<right>')