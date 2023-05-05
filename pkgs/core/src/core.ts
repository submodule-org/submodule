import type { Any, O } from "ts-toolbelt";
import { debug, instrument } from "./instrument";
import createDebug from 'debug'

const d = createDebug('submodule.core')

export type Submodule<InitArgs = {}, Config = {}, Services = {}> = Any.Compute<{
  createConfig?: (createConfigParams?: {
    initArgs: InitArgs;
  }) => Config | Promise<Config>;

  createServices?: (createServiceParams: {
    initArgs: InitArgs;
    config: Config;
  }) => Services | Promise<Services>;

},
  "flat"
>;

type Executable<InitArgs, Config, Services, Input, Output> = (
  executableParam: {
    config: Config,
    services: Services,
    initArgs: InitArgs
  }, input: Input) => Output | Promise<Output>

export type ExecutableOptions<InitArgs> = {
  eager: boolean,
  initArgs: InitArgs | undefined
}

const defaultSubmodule = {
  async createConfig() {
    return {};
  },

  async createServices() {
    return {};
  },
} satisfies Submodule

export const prepareExecutable = function <InitArgs = {}, Config = {}, Services = {}>(
  submoduleDef: Submodule<InitArgs, Config, Services>,
  options: ExecutableOptions<InitArgs> = { eager: false, initArgs: undefined }
): {
  execute: <Input extends any, Output> (executable: Executable<InitArgs, Config, Services, Input, Output>, input?: Input) => Promise<Output>
  prepare: <Input extends any, Output> (executable: Executable<InitArgs, Config, Services, Input, Output>) => (input: Input) => Promise<Output>
} {
  let cached: { config: any, services: any } | undefined = undefined

  const submodule = { ...defaultSubmodule, ...submoduleDef }
  instrument(submodule, debug)

  async function load() {
    if (cached === undefined) {
      d('loading cache %S', cached)
      
      const config = await submodule.createConfig({ initArgs: options.initArgs as any }) as any
      const services = await submodule.createServices({ config, initArgs: options.initArgs as any })
      cached = { config, services }
      d('cache resolved %S', cached)
    }

    return cached
  }

  if (options.eager) {
    d('eager loading, cache status %S', cached)
    load()
  }

  return {
    async execute(caller, input) {
      d('using cache on execute, cache status %S', cached)
      const { config, services } = await load()
      
      return await caller({ initArgs: options.initArgs as any, config, services }, input as any)
    },
    prepare(caller) {
      return async (input) => {
        d('using cache on prepare, cache status %S', cached)
        const { config, services } = await load()
        return await caller({ initArgs: options.initArgs as any, config, services }, input as any)
      }
    }
  }
}


