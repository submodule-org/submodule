import { AsyncLocalStorage } from "async_hooks";

const asyncContext = new AsyncLocalStorage()

export function run(context: any, fn: () => any | Promise<any>) {
  return asyncContext.run(context, fn)
}

export function get<T>(): T | undefined {
  return asyncContext.getStore() as any
}