import { expect, test } from "vitest"
import { execaCommandSync } from "execa"

test('fail on config exception', async() => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.config run')
  }).toThrow()
})

test('fail on preparedContext exception', async() => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.preparedContext run')
  }).toThrow()
})

test('fail on handler exception', async() => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.handler run')
  }).toThrow()
})

test('fail on adaptor exception', async() => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.adaptor run')
  }).toThrow()
})

test('success sharing config and ', () => {
  expect(() => {
    const result = execaCommandSync('yarn submodule --cwd ./fixtures --config success inspect --format stringify')
    
    const inspectedResult = JSON.parse(result.stdout)
    expect(inspectedResult.config).toMatchObject({ syncConfig: 1, asyncConfig: 2})
    expect(inspectedResult.preparedContext).toMatchObject({ syncContext: 1, asyncContext: 2})
    expect(Object.keys(inspectedResult.routes)).toContain('route1')
    expect(Object.keys(inspectedResult.routes)).toContain('route2')
    expect(Object.keys(inspectedResult.routes)).toContain('route3')

  }).to.not.throw()
  
})