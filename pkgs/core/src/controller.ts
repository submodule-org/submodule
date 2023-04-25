import createDebug from "debug"

export class SubmoduleController {}
export type ControllerSignal = SubmoduleController | Promise<SubmoduleController>

class DisplayHelp extends SubmoduleController {
  constructor(public helpMessage: string, public exitCode: number) { super() }
}

class StopWithError extends SubmoduleController {
  constructor(
    public phase: 'definition' | 'config' | 'services' | 'route' | 'router' | 'start' | 'runtime',
    public exitCode: number,
    public exitReason: string,
    public error: any
  ) {
    super()
  }
}

export const stopAndDisplayHelp = (helpMessage: string, exitCode: number = 0): SubmoduleController => {
  return new DisplayHelp(helpMessage, exitCode)
}

export const stopWithError = (
  phase: StopWithError['phase'],
  exitCode?: StopWithError['exitCode'],
  exitReason?: StopWithError['exitReason'],
  error?: any
): SubmoduleController => {
  return new StopWithError(
    phase,
    exitCode || 1,
    exitReason || '',
    error
  )
}

export const isControllerSignal = (maybeSignal: unknown): boolean => {
  return maybeSignal !== undefined && maybeSignal instanceof SubmoduleController
}

type AnyFn = (...args: any[]) => any

// this will only work with nodejs instrumentation
export function withControllerUnit<Fn extends AnyFn>(fn: Fn): Fn {
  return function () {
    const that = this
    const args = arguments

    try {
      return fn.apply(that, args)
    } catch (e) {
      if (e instanceof DisplayHelp) {
        console.log(e.helpMessage)
        process.exit(e.exitCode)
      }

      if (!(e instanceof StopWithError)) {
        e = new StopWithError('runtime', 1, 'Unexpected exception', e)
      }

      console.log('Caught an exception %s', e)
      process.exit(e.exitCode)
    }
  } as Fn
}