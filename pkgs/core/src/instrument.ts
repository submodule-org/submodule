import opentelemetry, { Context, SpanOptions, SpanStatusCode } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import utils from "util"
import createDebug from "debug"

export function getTracer() {
  return opentelemetry.trace.getTracer('submodule')
}

type AnyFn = (...args: any[]) => any

// this will only work with nodejs instrumentation
export function trace<Fn extends AnyFn>(name: string, fn: Fn, spanOptions: SpanOptions = {}): Fn {
  return function () {
    const that = this
    const args = arguments

    return getTracer().startActiveSpan(name, spanOptions, span => {
      try {
        span.setAttribute(SemanticAttributes.CODE_FUNCTION, name)
        const result = fn.apply(that, args)
        
        if (utils.types.isPromise(result)) {
          return result.then(next => {
            span.setStatus({ code: SpanStatusCode.OK })
            return next
          })
        } else {
          span.setStatus({ code: SpanStatusCode.OK })
          return result
        }
      } catch (e) {
        span
          .setStatus({ code: SpanStatusCode.ERROR })
          .recordException(e)
      } finally {
        span.end()
      }
    })
  } as Fn
}

type InstrumentFunction = <X extends AnyFn>(name: string, fn: X) => X 

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

export function instrument<T>(input: T, instrumentFn: InstrumentFunction, maxLevel = 1, currentLevel = 0): T {
  if (input === null || input === undefined) return input
  if (currentLevel > maxLevel) return input
  
  if ( // there can be more
    typeof input !== 'object' ||
    Array.isArray(input) ||

    // built-in objects like date, bytearray etc
    utils.types.isDate(input)
  ) {
    return input
  }

  Object.keys(input).forEach(key => {
    const instance = input[key]
    if (typeof instance === 'function') {
      input[key] = instrumentFn(key, instance)
    } else {
      input[key] = instrument(input[key], instrumentFn, maxLevel, currentLevel + 1)
    }
  })

  return input
}