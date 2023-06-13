import { create } from "@submodule/core"
import { test } from "vitest"
import { shell } from "../src"

test("instrument should work", async () => {
  const a = create(async () => 'a')
  const b = create(async () => 'b')
  const c = create(async (c) => 'c' + c, a)

  shell(async () => {
    const x = await b.execute((b) => b + '1')

    const d = await c.get()

  }, {
    id: 'test-instrument'
  })
})