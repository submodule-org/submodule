import { Command } from "commander"
import fs from "fs"
import path from "path"
import chalk from "chalk"

export default new Command()
  .action(() => {
    console.log(chalk.green('Submodule will create'))
    console.log('- sample route, with a hello function')
    console.log('- submodule.ts file, with filled content')
    console.log('- types.ts file, with sample content')

  })