import { expect, test } from "vitest"
import { execaCommandSync } from "execa"

test('fail on config exception', async () => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.config -o test.config build')
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.config -o test.config start')
  }).toThrow()
})

test('fail on preparedContext exception', async () => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.preparedContext -o test.services build')
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.preparedContext -o test.services start route2')
  }).toThrow()
})

test('fail on handler exception', async () => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.handler -o test.handler build')
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.handler -o test.handler start route2')
  }).toThrow()
})

test('fail on adaptor exception', async () => {
  expect(() => {
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.adaptor -o test.commands build')
    execaCommandSync('yarn submodule --cwd ./fixtures --config fail.adaptor -o test.commands start route2')
  }).toThrow()
})

test('success sharing config and ', () => {
  execaCommandSync('yarn submodule --cwd ./fixtures --config success -o test.success build')
  const result = execaCommandSync('yarn submodule --cwd ./fixtures --config success -o test.success start inspect')
  const inspectedResult = JSON.parse(result.stdout)
  
  expect(inspectedResult.config).toEqual({ config: 'config' })
  expect(inspectedResult.services).toEqual({ services: 'services' })


})