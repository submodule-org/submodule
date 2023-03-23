#!/usr/bin/env node

import { Command } from 'commander';
import { fork } from 'child_process'

import type { z } from "zod"
import type { Metafile } from 'esbuild';
import type { ArgShape, CommandShape, OptShape, SubmoduleInstance } from '.';

async function transpile({ configName, routeDir, cwd }: { configName: string, routeDir: string, cwd: string, }, outdir: string) {
  const debug = (await import('debug')).default('submodule.entry.transpileConfig')
  debug('looking for config file configName: %s in %s', configName, cwd)
  const acceptedExts = ['.js', '.ts', '.tsx', '.jsx']
  const path = await import('path')

  const config = await listFiles(cwd, (file) => {
    const { ext, name } = path.parse(file)
    debug('processing %s%s', name, ext)
    return acceptedExts.includes(ext) && name === configName
  })

  const configEntry: Record<string, string> = config.at(0) !== undefined
    ? { submodule: config[0] }
    : {}

  const routes = await listFiles(path.join(cwd, routeDir), (file) => {
    const { ext } = path.parse(file)
    return acceptedExts.includes(ext)
  })

  const routeEntries = routes.reduce((next, item) => {
    const { name } = path.parse(item)
    next[`routes/${name}`] = item
    return next
  }, {})

  const candidates = { ...configEntry, ...routeEntries }
  debug('passing those %O to transform', candidates)

  const mode = await detectMode(cwd)
  
  async function transpile(entry: Record<string, string>, outdir: string) {
    const tsup = await import('tsup')
    await tsup.build({
      entry,
      format: [mode],
      target: 'node14',
      outDir: outdir,
      shims: true,
      metafile: true,
      splitting: true,
      sourcemap: "inline",
      dts: false,
      silent: true
    })
  }

  Object.entries(candidates).length > 0 && await transpile(candidates, outdir)
};

async function listFiles(dir: string, filter?: (file: string) => boolean): Promise<string[]> {
  const fs = await import('fs')
  const path = await import('path')
  const nameMapper = (file: string) => path.join(dir, file)
  if (!filter) return fs.readdirSync(dir).map(nameMapper)
  return fs.readdirSync(dir).filter(filter).map(nameMapper)
}

export type BuildArgs = {
  cwd: string
  config: string
  routeDir: string
  outDir: string
}

export type DevArgs = BuildArgs & {
  subCommand: string
  isDev: boolean
}

export type StartArgs = BuildArgs & {
  outDir: string
  subCommand: string
  isDev: boolean
}

async function run(args: StartArgs, command: Command, instance: SubmoduleInstance) {
  const { z } = await import('zod')

  const argSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional().default(false),
    defaultValue: z.string().optional(),
    value: z.string().optional()
  }) satisfies z.ZodType<ArgShape>

  const optSchema = z.object({
    name: z.string(),
    shortName: z.string().length(1).optional(),
    description: z.string().optional(),
    required: z.boolean().optional().default(false),
    defaultValue: z.string().optional(),
    value: z.string().optional()
  }) satisfies z.ZodType<OptShape>

  const debug = (await import('debug')).default('submodule.entry.handle')

  const commandSchema = z.object({
    description: z.string().optional(),
    action: z.function().returns(z.void().or(z.promise(z.void()))),
    args: z.array(argSchema).optional(),
    opts: z.array(optSchema).optional()
  }) satisfies z.ZodType<CommandShape>

  const commandsSchema = z.record(commandSchema.or(z.function()))

  const { config, router, services, submodule } = instance

  const generateTypes = async (target: string) => {
    const path = await import('path')
    const fs = await import('fs/promises')

    const cwd = path.resolve(args.cwd)
    const relativeToRouteDir = path.relative(cwd, path.resolve(path.join(cwd, args.routeDir)))

    const typeFile = path.resolve(cwd, target)

    debug('generating types to %s %s %s', cwd, typeFile, relativeToRouteDir)
    let content = ''

    const envelop = (input: { content: string }) => `
/** ⚠️ This is a generated document, please don't change this manually ⚠️ */
export type Router = {
  
${input.content}
}
`
    for (const routeName in router) {
      content += `  ${routeName}: typeof import('./${relativeToRouteDir}/${routeName}') \n`
    }

    await fs.writeFile(typeFile, new Uint8Array(Buffer.from(envelop({ content }))))
  };

  await generateTypes('submodule.router.ts')

  const subCommand = args.subCommand
  const commands = await submodule?.createCommands?.({
    config,
    services,
    router,
    subCommand,
    commandArgs: ['submoduleCommand', subCommand, ...command.args], 
    submoduleArgs: args
  })

  if (submodule.createCommands && commands === undefined) {
    debug('finished processing, expected the createCommands did something already')
    return
  }

  if (submodule.createCommands) {
    debug('using %O to create more commands', commands)
    const validatedCommandsShape = commandsSchema.parse(commands)

    for (const commandName in validatedCommandsShape) {
      const commandShape = validatedCommandsShape[commandName]
      debug('adding command %s %O', commandName, commandShape)

      if (typeof commandShape !== 'function') {
        const addingCommand = new Command(commandName).action(async function commandHandler() {
          const refCommand = arguments[arguments.length - 1] as Command
          commandShape.action({ args: refCommand.args, opts: refCommand.opts() })
        })

        commandShape.description && addingCommand.description(commandShape.description)

        commandShape?.args?.forEach(arg => {
          const wrapper = () => arg.required ? `<${arg.name}>` : `[${arg.name}]`
          addingCommand.argument(wrapper(), arg.description, arg.defaultValue)
        })

        commandShape?.opts?.forEach(opt => {
          const shortName = opt.shortName ? `-${opt.shortName}` : ''
          const fullName = opt.required ? `--${opt.name} <${opt.name}>` : `--${opt.name}`
          addingCommand.option(`${shortName}, ${fullName}`, opt.description)
        })

        command.addCommand(addingCommand)
      } else {
        command.command(commandName)
          .action(async function commandHandler() {
            const refCommand = arguments[arguments.length - 1] as Command
            commandShape({ args: refCommand.args, opts: refCommand.opts() })
          })
      }
    }

    if (!subCommand) {
      debug('No subcommand found, displaying help')
      return command.help()
    } else {
      debug('Subcommand found, executing')
      await command.parseAsync(command.args, { from: 'user' })
    }
  } else if (subCommand && router[subCommand]) {
    debug('Subcommand found, executing route in router')
    await router[subCommand]?.handle?.({ config, services })
  } else {
    debug('Subcommand not found, or path not found, displaying help')
    return command.help()
  }
}

async function init({ cwd, distDir, config, routeDir }: { cwd: string, distDir: string, config: string, routeDir: string }) {
  const debug = (await import('debug')).default('submodule.entry.run')
  debug('starting init with %O', { cwd, distDir, config, routeDir })
  const path = await import('path')
  const mode = await detectMode(cwd)

  async function load(mod: string) {
    return mode === 'cjs'
      ? require(mod)
      : await import(mod)
  }

  debug('loading %s', path.join(distDir, `metafile-${mode}.json`))
  const meta: Metafile = require(path.join(distDir, `metafile-${mode}.json`)) 

  let submodule: any = {}
  let routes: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(meta.outputs)) {
    if (value.entryPoint) {
      debug('processing entrypoint %s: %O', key, value)
      const fileMeta = path.parse(value.entryPoint)

      if (key.endsWith('submodule.js') && !key.endsWith('routes/submodule.js')) {
        debug('loading submodule at %s', key, value)
        submodule = await load(path.resolve(key))
      }

      if (/.*\/routes\/.*\.js/.test(key)) {
        debug('loading route %s, actual path %s', value.entryPoint, path.relative(process.cwd(), key))
        routes[fileMeta.name] = await load(path.resolve(key))
      }
    }
  }

  const { createSubmoduleInstance } = await import('./core')

  return await createSubmoduleInstance(submodule.default || submodule, routes)
}

export async function handleDev(args: DevArgs, thisCommand: Command) {
  const debug = (await import('debug')).default('submodule.entry.dev')
  const path = await import('path')
  debug('dev details %O', args)

  const cwd = path.resolve(args.cwd)

  const routeDir = args.routeDir
  const config = args.config

  const targetTmpDir = path.join(cwd, args.outDir)

  const chokidar = await import('chokidar')

  const relativeCwd = path.relative(process.cwd(), cwd)

  const watcher = chokidar.watch([
    `${routeDir}/*.{js,ts,jsx,tsx}`,
    `${config}.{js,ts}`
  ], { cwd: relativeCwd })

  async function startMain(restart: boolean = false) {
    if (restart) {
      debug('restarting ...')
    }

    await transpile({ routeDir, configName: config, cwd: cwd }, targetTmpDir)

    debug('forking a child process with %s - %s', __filename, thisCommand.args)
    let forked = fork(`${__filename}`, thisCommand.args, {
      env: { ...process.env, SUBMODULE_CHILD: "true", SUBMODULE_DEV: "true" },
      execArgv: [...process.execArgv, '--enable-source-maps']
    });

    forked.on('error', console.error)
    return forked
  }

  async function startWorker() {
    debug('starting run process')
    const instance = await init({ config, cwd, routeDir, distDir: targetTmpDir })
    await run({...args, outDir: targetTmpDir }, thisCommand, instance)
  }

  if (Boolean(process.env.SUBMODULE_CHILD)) {
    startWorker()
  } else {
    debug('starting controller process')
    let forked = await startMain()

    watcher.on('change', async (path) => {
      debug('change detected %s. restarting submodule', path)

      !forked.killed && forked.kill()
      forked = await startMain(true)
    })
  }
}

async function detectMode(cwd: string): Promise<'cjs' | 'esm'> {
  const debug = (await import('debug')).default('submodule.entry.detectMode')
  const path = await import('path')
  const fs = await import('fs')

  if (!fs.existsSync(path.join(cwd, 'package.json'))) {
    debug('package.json not found, set to cjs')
    return 'cjs'
  }

  debug('checking %s', path.join(cwd, 'package.json'))
  const packageJson = require(path.join(cwd, 'package.json'))

  return packageJson['type'] === 'module'
    ? 'esm'
    : 'cjs'
}

export async function handleBuild(args: BuildArgs) {
  const debug = (await import('debug')).default('submodule.entry.build')

  debug('build details %O', args)
  const path = await import('path')
  
  const cwd = path.resolve(args.cwd)
  debug('effective cwd %s', cwd)
  
  const routeDir = args.routeDir
  const config = args.config

  const targetOutDir = path.join(cwd, args.outDir)

  await transpile({ routeDir, configName: config, cwd }, targetOutDir)
}

export async function handleStart(args: StartArgs, thisCommand: Command) {
  const debug = (await import('debug')).default('submodule.entry.start')

  debug('build details %O', args)
  const path = await import('path')

  const cwd = path.resolve(args.cwd)
  debug('effective cwd %s', cwd)
  const targetOutDir = path.join(cwd, args.outDir)

  const routeDir = args.routeDir || "routes"
  const config = args.config || 'submodule'

  const instance = await init({ config, cwd, routeDir, distDir: targetOutDir })
  await run(args, thisCommand, instance)
}

(async () => {
  const { program } = await import('commander')

  program
    .option('--cwd <cwd>', 'current working dir', process.cwd())
    .option('-c, --config <config>', 'config file', 'submodule')
    .option('-r, --routeDir <routeDir>', 'route dir', 'routes')
    .option('-o, --outDir <outDir>', 'output dir', 'dist')
    .passThroughOptions(true)

    .addCommand(new Command('dev')
      .argument('[subCommand]', 'subcommand to forward to')
      .description('start app in dev mode')
      .action(async function dev(subCommand: string, options, thisCommand: Command) {
        await handleDev({ ...program.opts(), subCommand, isDev: true }, thisCommand)
      })
    )
    .addCommand(new Command('build')
      .description('build to outdir')
      .action(async () => {
        await handleBuild(program.opts())
      })
    )
    .addCommand(new Command('start')
      .argument('[subCommand]', 'subcommand to forward to')
      .description('start the app in production mode')
      .action(async function start(subCommand: string, options, thisCommand) {
        await handleStart({ ...program.opts(), subCommand, isDev: false }, thisCommand)
      })
    )
    .action(async () => {
      program.help()
    })

  await program.parseAsync()
})()