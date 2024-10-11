import { provide, map, combine } from "@submodule/core"
import { z } from "zod"
import debug from "debug"
import path from "node:path"
import fs from "node:fs"

const logger = debug('incompleto:config')

export const configSchema = z.object({
  version: z.string().optional(),
  pkg: z.enum(['bun', 'npm', 'yarn', 'pnpm']).default('npm'),
  components: z.string().array().default([]),
  installDir: z.string().optional().default('mods')
})

export type Config = z.infer<typeof configSchema>

const configFiles = provide(() => {
  return [
    path.join(process.cwd(), 'incompleto.json'),
  ]
})

export const readConfig = map(
  configFiles,
  (configFiles) => async (): Promise<{ configFile: undefined } | { configFile: string, config: Config }> => {
    logger('reaching out incompleto.json %s', configFiles)

    const configFile = configFiles.find(f => fs.existsSync(f))
    if (!configFile) {
      return { configFile: undefined }
    }

    const configContent = await fs.promises.readFile(configFile, 'utf-8')
    const config: Config = configSchema.parse(JSON.parse(configContent))
    return {
      configFile,
      config
    }
  }
)

export const writeConfig = map(
  combine({ readConfig, configFiles }),
  async ({ readConfig, configFiles }) => {
    return async (config: unknown) => {
      const existingConfig = await readConfig()

      if (existingConfig.configFile) {
        const updated = configSchema.parse(config)
        logger('writing config %o', updated)
        await fs.promises.writeFile(existingConfig.configFile, JSON.stringify(updated, null, 2))
      } else {
        logger('writing config %o', config)
        await fs.promises.writeFile(configFiles[0], JSON.stringify(config, null, 2))
      }
    }
  }
)