import { defineRoute } from "../submodule";
import { Command } from "commander"

export default defineRoute((left: number, right: number) => {
  return Number(left) + Number(right)
})

export const command: Command = new Command("plus")
  .description('the plus operation')
  .argument('<left>')
  .argument('<right>')