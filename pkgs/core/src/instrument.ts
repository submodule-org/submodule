import opentelemetry, { Context, SpanOptions, SpanStatusCode } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import utils from "util"

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

export function startSpan(name: string, spanOptions?: SpanOptions, context?: Context) {
  return getTracer()
    .startSpan(name, spanOptions, context)
}