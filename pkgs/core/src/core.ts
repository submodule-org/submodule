import type { Any } from "ts-toolbelt";
import { debug, instrument, InstrumentFunction } from "./instrument";
import createDebug from 'debug'

const d = createDebug('submodule.core')

export type Submodule<InitArgs = {}, Config = {}, Services = {}> = Any.Compute<{
  createConfig?: (createConfigParams: {
    initArgs: InitArgs;
  }) => Config | Promise<Config>;

  createServices?: (createServiceParams: {
    initArgs: InitArgs
    config: Config
  }) => Services | Promise<Services>;

}, "flat">;

type Executable<InitArgs, Config, Services, Input, Output> = (
  executableParam: {
    config: Config,
    services: Services,
    initArgs: InitArgs
  }, input: Input) => Output | Promise<Output>

export type ExecutableOptions<InitArgs> = {
  eager?: boolean,
  initArgs?: () => (InitArgs | Promise<InitArgs>),
  instrument?: InstrumentFunction
}

const defaultSubmodule = {
  async createConfig() {
    return {};
  },

  async createServices() {
    return {};
  },
} satisfies Submodule

const defaultExecutableOptions: ExecutableOptions<any> = {
  eager: true,
  initArgs: undefined
}

export type Executor<InitArgs, Config, Services> = {
  execute: <Input extends any, Output> (executable: Executable<InitArgs, Config, Services, Input, Output>, input?: Input) => Promise<Output>
  prepare: <Input extends any, Output> (executable: Executable<InitArgs, Config, Services, Input, Output>) => (input: Input) => Promise<Output>
  config(): Promise<Config>
  services(): Promise<Services>
}

export const prepareExecutable = function <InitArgs = {}, Config = {}, Services = {}>(
  submoduleDef: Submodule<InitArgs, Config, Services>,
  options?: ExecutableOptions<InitArgs>
): Executor<InitArgs, Config, Services> {
  let cached: Promise<{ config: any, services: any }> | undefined = undefined

  const opts = { ...defaultExecutableOptions, ...options }

  const submodule = { ...defaultSubmodule, ...submoduleDef }
  instrument(submodule, debug)

  if (opts.instrument) {
    instrument(submodule, opts.instrument)
  }

  async function load() {
    const initArgs = await options?.initArgs?.()
    const config = await submodule.createConfig({ initArgs: initArgs as any }) as any
    const services = await submodule.createServices({ config, initArgs: initArgs as any })
    return { config, services }
  }

  async function get() {
    if (cached == undefined) {
      d('cache is uninitialized, initializing ...')
      cached = load()
    }
    return await cached
  }

  if (opts.eager && cached == undefined) {
    d('eager loading, cache status %S', cached)
    get()
  }

  return {
    async execute(caller, input) {
      const { config, services } = await get()

      return await caller({ initArgs: opts.initArgs as any, config, services }, input as any)
    },
    prepare(caller) {
      return async (input) => {
        const { config, services } = await get()
        return await caller({ initArgs: opts.initArgs as any, config, services }, input as any)
      }
    },
    async config() {
      const { config } = await get()
      return config
    },
    async services() {
      const { services } = await get()
      return services
    }
  }
}
