export type RequireDirOpts = {
  recurse?: boolean | undefined;
  duplicates?: boolean | undefined;
  extensions?: string[] | undefined;
  filter?: any;
  mapKey?: any;
  mapValue?: any;
}

import { glob } from "glob"
import path from "path"
import debug from "debug"

const debugLoader = debug('submodule.loader')

export async function requireDir(dir: string, opts?: RequireDirOpts): Promise<Record<string, any>> {
  const globExp = opts?.recurse
    ? '**/*.{js,ts}'
    : '*.{js,ts}'

  debugLoader('loader in %s mode', globExp)

  const candidates = glob.sync(globExp, { cwd: dir })
  debugLoader('loaded candidates %O', candidates)
  // result in format of
  // [filename], no dir, as dir is set to cwd

  const result = {}
  
  for (const candidate of candidates) {
    const file = path.parse(candidate)
    debugLoader('parsing candidate %s -> %s', candidate, file)
    result[file.name] = candidate
  }

  debugLoader('loaded modulePaths %O', result)

  for (const moduleName of Object.keys(result)) {
    const modulePath = path.join(dir, moduleName)

    debugLoader('loading module path %s', modulePath)
    result[moduleName] = require(modulePath)
  }

  debugLoader('loaded modules %O', result)

  return result
}