import utils from "util"
import createDebug from "debug"

export type AnyFn = (...args: any[]) => any

export type InstrumentFunction = <X extends AnyFn>(name: string, fn: X) => X 

export function debug<Fn extends AnyFn>(name: string, fn: Fn): Fn {
  const _debugger = createDebug(`submodule.runtime.${name}`)
  return function () {
    const that = this
    const args = arguments

    _debugger('calling function %s, with %O', name, arguments)
    const result = fn.apply(that, args)
    if (result === undefined) {
      _debugger('completed function call %s', name)
      return
    } else if (utils.types.isPromise(result)) {
      return result
      .then(next => {
          _debugger('completed function call %s, with %O', name, next)
          return next
        })
        .catch(e => {
          _debugger('caught an exception function call %s, with %O', name, e)
          throw e
        })
    } else {
      return result
    }
  } as Fn
}

export function instrument<T>(container: T, instrumentFn: InstrumentFunction, maxLevel = 1, currentLevel = 0): T {
  if (container === null || container === undefined) return container
  if (currentLevel > maxLevel) return container
  
  if ( // there can be more
    typeof container !== 'object' ||
    Array.isArray(container) ||

    // built-in objects like date, bytearray etc
    utils.types.isDate(container)
  ) {
    return container
  }

  Object.keys(container).forEach(key => {
    const instance = container[key]
    if (typeof instance === 'function') {
      container[key] = instrumentFn(key, instance)
    } else {
      container[key] = instrument(container[key], instrumentFn, maxLevel, currentLevel + 1)
    }
  })

  return container
}