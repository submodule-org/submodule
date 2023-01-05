import { register } from "esbuild-register/dist/node"

register({
  
})

import { Command } from "commander"
import requireDir from "require-dir"

const commandMods = requireDir(`${__dirname}/commands`)

// cleanup non Command export
Object.keys(commandMods).forEach(commandName => {
  const command = commandMods[commandName]?.default
  if (!(command instanceof Command)) {
    delete commandMods[command]
  }
})

const defaultCommandKey = Object.keys(commandMods).find(command => command === '_default')
const commandKeys = Object.keys(commandMods)
  .filter(command => command !== '_default')

const program = defaultCommandKey 
  ? commandMods[defaultCommandKey]
  : new Command()

commandKeys.forEach(name => {
  const command = commandMods[name].default as Command
  command.name(name)
  program.addCommand(command)
})

program.parse()