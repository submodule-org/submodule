import { provide } from '@submodule/core'

export const execaModule = provide(async () => {
  return await import('execa')
})

export const niModule = provide(async () => {
  return await import('@antfu/ni')
})

export const resolvePackagePathModule = provide(async () => {
  return await import('resolve-package-path')
})