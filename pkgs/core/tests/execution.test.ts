import { describe, expect, test } from "vitest"
import { createExecution, value } from "../src"

describe('execution', () => {
  const word = value('world')
  const hello = createExecution((word, prefix: string) => `${prefix} - hello ${word}`, word)
  const helloFn = hello.resolve()

  test('execution can be executed', async () => {
    const result = await hello.execute('mr')
    expect(result).toBe('mr - hello world')
  })

  test('prepared function can be used', async () => {
    const result = await helloFn('mr')
    expect(result).toBe('mr - hello world')
  })

})