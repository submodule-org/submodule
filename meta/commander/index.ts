import { Command, type OptionValues } from '@commander-js/extra-typings';
import { combine, create, group, scoper, value, type Executor } from '@submodule/core';
import { createLogger } from "@submodule/meta-pino";

const logger = createLogger("commander")

export type Modifier = (command: Command) => Command

const source = value(process.argv)
const rootCommand = value(new Command())
const commands = value<Command[]>([])
const modifiers = value<Modifier[]>([])

export function createCommand<T extends Array<any>, U extends OptionValues>(
  command: Command<T, U>,
  handler: (...param: [...T, U, Command<T, U>]) => Executor<any>
): Executor<Command<T, U>> {
  return create(async (scope) => {
    command.action(async (...args) => {
      return handler(...args).resolve(scope)
    })

    return command
  }, scoper)
}

const parse = create(async ({ rootCommand, commands, modifiers, source, logger }) => {
  for (const modifier of modifiers) {
    rootCommand = modifier(rootCommand)
  }

  for (const command of commands) {
    logger.debug({ command: command.name }, "registering command")
    rootCommand.addCommand(command)
  }

  await rootCommand.parseAsync(source)
}, combine({ rootCommand, commands, modifiers, source, logger }))

export const startCmd = (cmds: Array<Executor<Command<any>>>, modifier?: Array<Executor<Modifier>>) => {
  const uc = group(...cmds)

  if (modifier) {
    const mc = group(...modifier)
    parse.patch(modifiers, mc)
  }

  parse.patch(commands, uc)
  return parse
}