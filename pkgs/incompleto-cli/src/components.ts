import { readConfig, type Config } from "./config"
import { combine, map, provide } from "@submodule/core"
import { z } from "zod"
import debug from "debug"
import path from "node:path"
import fs from "node:fs"

const pullDebug = debug('incompleto:components:pull')
const installDebug = debug('incompleto:components:install')
const installDependenciesDebug = debug('incompleto:components:install:dependencies')

const componentSchema = z.object({
  name: z.string(),
  version: z.string(),
  dependencies: z.string().array().default([]),
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string()
    })
      .or(z.string())
  )
})

export type Component = z.infer<typeof componentSchema>

const degitModule = provide(async () => {
  return await import('degit')
})

const execaModule = provide(async () => {
  return await import('execa')
})

const niModule = provide(async () => {
  return await import('@antfu/ni')
})

const gitUrlParseModule = provide(async () => {
  return await import('git-url-parse')
})

const readComponentConfig = provide(async () => {
  return (dir: string): Component | undefined => {
    const configFile = path.join(dir, 'component.json')
    if (fs.existsSync(configFile)) {
      const file = fs.readFileSync(configFile, 'utf-8')
      return componentSchema.parse(JSON.parse(file))
    }

    return undefined
  }
})

const installDependencies = map(
  combine({ execaModule }),
  async ({ execaModule }) => {
    return async (pkgManager: 'bun' | 'yarn' | 'pnpm' | 'npm', pkgs: string[], type: undefined | 'dev' | 'peer' = undefined) => {
      const command = pkgManager === 'npm' ? 'install' : 'add'
      const targetType = type === 'dev'
        ? '-D'
        : type === 'peer'
          ? '-P'
          : ''
      installDependenciesDebug('installing dependencies %s', `${pkgManager} ${command} ${targetType} ${pkgs.join(' ')}`)
      return await execaModule.execa`${pkgManager} ${command} ${targetType} ${pkgs.join(' ')}`
    }
  }
)

export const pull = map(
  combine({ degitModule, gitUrlParseModule }),
  async ({ degitModule, gitUrlParseModule }) => {
    return async (config: Config, componentName: string) => {
      const repoName = gitUrlParseModule.default(componentName).name

      pullDebug('pulling component %s', componentName)
      const emitter = degitModule.default(componentName, { cache: true, force: true })

      emitter.on('info', (...info) => {
        pullDebug('pulling info', ...info)
      })

      const targetDir = path.join(config.installDir, repoName)
      await emitter.clone(targetDir)
      return targetDir
    }
  }
)

export const installComponent = map(
  combine({ degitModule, niModule, installDependencies, readComponentConfig, pull }),
  async ({ degitModule, niModule, installDependencies, readComponentConfig, pull }) => {
    return async (config: Config, component: string[]) => {
      for (const componentName of component) {
        const targetDir = await pull(config, componentName)
        const componentConfig = readComponentConfig(targetDir)

        if (!componentConfig) {
          throw new Error(`component ${componentName} is not valid, component.json is not found in the target dir`)
        }

        if (componentConfig.dependencies.length > 0) {
          await installDependencies(config.pkg, componentConfig.dependencies)
        }

      }
    }
  }
)

