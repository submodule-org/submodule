import vitest, { expect, test } from "vitest"
import { prepareExecutable } from "../src/core"

test('submodule should work', async () => {
  const config = prepareExecutable(() => ({ port: 3000 }))

  expect(await config.get()).toEqual({ port: 3000})
})

test('eager must load things at max once', () => {
  
})