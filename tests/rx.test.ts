import { describe, it, expect, vi } from 'vitest'
import { createObservable, pipe, operators, observables } from '../src/rx'
import { combineObservables, createScope, provideObservable } from '../src';

describe('Observable', () => {
  describe('basic subscription', () => {
    it('should emit multiple values', () => {
      const next = vi.fn()
      const [observable, subscriber] = createObservable<number>()

      observable.subscribe({ next, error: () => { }, complete: () => { } })

      subscriber.next(1)
      subscriber.next(2)
      subscriber.next(3)

      expect(next).toHaveBeenCalledTimes(3)
      expect(next).toHaveBeenNthCalledWith(1, 1)
      expect(next).toHaveBeenNthCalledWith(2, 2)
      expect(next).toHaveBeenNthCalledWith(3, 3)
    })

    it('should handle completion', () => {
      const next = vi.fn()
      const complete = vi.fn()

      const [observable, subscriber] = createObservable<number>()

      observable.subscribe({ next, error: () => { }, complete })

      subscriber.next(1)
      subscriber.complete()
      subscriber.next(2) // Should not emit after complete

      queueMicrotask(() => {
        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledWith(1)
        expect(complete).toHaveBeenCalledTimes(1)
      })
    })

    it('should support partial observer', () => {
      const next = vi.fn();
      const [observable, subscriber] = createObservable<number>();

      observable.subscribe({ next });

      subscriber.next(1);
      subscriber.next(2);

      expect(next).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenNthCalledWith(1, 1);
      expect(next).toHaveBeenNthCalledWith(2, 2);
    });

  })

  describe('error handling', () => {
    it('should handle errors and stop emission', () => {
      const next = vi.fn()
      const error = vi.fn()
      const testError = new Error('test error')

      const [observable, subscriber] = createObservable<number>()

      observable.subscribe({ next, error, complete: () => { } })

      subscriber.next(1)
      subscriber.error(testError)
      subscriber.next(2) // Should not emit after error

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(1)
      expect(error).toHaveBeenCalledWith(testError)
    })

    it('should immediately emit error to new subscribers after error', () => {
      const error = vi.fn()
      const testError = new Error('test error')

      const [observable, subscriber] = createObservable<number>()
      observable.subscribe({ error })

      subscriber.error(testError)

      expect(error).toHaveBeenCalledWith(testError)
    })
  })


  describe('pipe operations', () => {
    it('should transform values through pipe', () => {
      const next = vi.fn()
      const [observable, subscriber] = createObservable<number>()

      pipe(
        observable,
        operators.map(x => x * 2),
        operators.map(x => x.toString())
      ).subscribe({
        next,
        error: () => { },
        complete: () => { }
      })

      subscriber.next(1)
      subscriber.next(2)

      expect(next).toHaveBeenNthCalledWith(1, '2')
      expect(next).toHaveBeenNthCalledWith(2, '4')
    })

    it('should support method chaining with pipe', () => {
      const next = vi.fn()
      const [observable, subscriber] = createObservable<number>()

      pipe(
        observable,
        operators.map(x => x * 2),
        operators.map(x => x.toString())
      ).subscribe({
        next,
        error: () => { },
        complete: () => { }
      })

      subscriber.next(1)
      subscriber.next(2)

      expect(next).toHaveBeenNthCalledWith(1, '2')
      expect(next).toHaveBeenNthCalledWith(2, '4')
    })
  })

  describe('subscriber', () => {
    it('should allow external control of observable', () => {
      const next = vi.fn()
      const complete = vi.fn()

      const [observable, subscriber] = createObservable<number>()

      observable.subscribe({ next, error: () => { }, complete })

      subscriber.next(1)
      subscriber.next(2)
      subscriber.complete()
      subscriber.next(3) // Should not emit after complete

      expect(next).toHaveBeenCalledTimes(2)
      expect(next).toHaveBeenNthCalledWith(1, 1)
      expect(next).toHaveBeenNthCalledWith(2, 2)
      expect(complete).toHaveBeenCalledTimes(1)
    })

  })

  describe('static creation', () => {
    describe('combineLatest', () => {
      it('should combine latest values from multiple observables', async () => {
        const next = vi.fn();
        const [obs1, ctrl1] = createObservable<number>();
        const [obs2, ctrl2] = createObservable<string>();

        observables.combineLatest({
          num: obs1,
          str: obs2
        }).subscribe({
          next,
        });

        ctrl1.next(1);
        await nextTickPromise()
        expect(next).not.toHaveBeenCalled(); // Wait for all sources

        ctrl2.next('a');
        await nextTickPromise()
        expect(next).toHaveBeenCalledWith({ num: 1, str: 'a' });

        ctrl1.next(2);
        await nextTickPromise()
        expect(next).toHaveBeenCalledWith({ num: 2, str: 'a' });
      });

      it('should complete when all sources complete', () => {
        const complete = vi.fn();
        const [obs1, ctrl1] = createObservable<number>();
        const [obs2, ctrl2] = createObservable<string>();

        observables.combineLatest({
          num: obs1,
          str: obs2
        }).subscribe({
          next: () => { },
          error: () => { },
          complete
        });

        ctrl1.complete();
        expect(complete).toHaveBeenCalled();

        ctrl2.complete();
        expect(complete).toHaveBeenCalled();
      });
    });

  });

  describe('operator:map', () => {
    it('should transform values', () => {
      const next = vi.fn();
      const [source, controller] = createObservable<number>();

      pipe(
        source,
        operators.map(x => x * 2)
      ).subscribe({ next, error: () => { }, complete: () => { } });

      controller.next(1);
      controller.next(2);
      controller.next(3);

      expect(next).toHaveBeenCalledTimes(3);
      expect(next).toHaveBeenNthCalledWith(1, 2);
      expect(next).toHaveBeenNthCalledWith(2, 4);
      expect(next).toHaveBeenNthCalledWith(3, 6);
    });

    it('should handle errors', () => {
      const error = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.map(() => { throw new Error('test'); })
      ).subscribe({ next: () => { }, error, complete: () => { } });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });

    it('should complete when source completes', () => {
      const complete = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.map(x => x * 2)
      ).subscribe({ next: () => { }, error: () => { }, complete });

      subscriber.complete();
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('operator:latest', () => {
    it('should emit last value only on completion', () => {
      const next = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.latest()
      ).subscribe({ next, error: () => { }, complete: () => { } });

      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);

      expect(next).not.toHaveBeenCalled();

      subscriber.complete();
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(3);
    });

    it('should not emit if no values received', () => {
      const next = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.latest()
      ).subscribe({ next, error: () => { }, complete: () => { } });

      subscriber.complete();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors', () => {
      const next = vi.fn();
      const error = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.latest()
      ).subscribe({ next, error, complete: () => { } });

      subscriber.next(1);
      subscriber.error('test error');

      expect(next).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('test error');
    });
  });

  describe('operator:filter', () => {
    it('should filter values based on predicate', () => {
      const next = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.filter(x => x % 2 === 0)
      ).subscribe({ next, error: () => { }, complete: () => { } });

      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);
      subscriber.next(4);

      expect(next).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenNthCalledWith(1, 2);
      expect(next).toHaveBeenNthCalledWith(2, 4);
    });

    it('should handle errors in predicate', () => {
      const error = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.filter(() => { throw new Error('test'); })
      ).subscribe({ next: () => { }, error, complete: () => { } });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });

    it('should complete when source completes', () => {
      const complete = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.filter(x => x % 2 === 0)
      ).subscribe({ next: () => { }, error: () => { }, complete });

      subscriber.complete();
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('operator:distinctUntilChanged', () => {
    it('should emit first value always', () => {
      const next = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.emitOnChange()
      ).subscribe({ next });

      subscriber.next(1);
      expect(next).toHaveBeenCalledWith(1);
    });

    it('should not emit same value twice', () => {
      const next = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.emitOnChange()
      ).subscribe({ next });

      subscriber.next(1);
      subscriber.next(1);
      subscriber.next(1);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should support custom compare function', () => {
      const next = vi.fn();
      const [source, subscriber] = createObservable<{ id: number }>();

      pipe(
        source,
        operators.emitOnChange({
          compare: (a, b) => a.id === b.id
        })
      ).subscribe({ next });

      subscriber.next({ id: 1 });
      subscriber.next({ id: 1 });
      subscriber.next({ id: 2 });
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should support custom clone function', () => {
      const next = vi.fn();
      const clone = vi.fn(x => ({ ...x }));
      const [source, subscriber] = createObservable<{ id: number }>();

      pipe(
        source,
        operators.emitOnChange({
          clone
        })
      ).subscribe({ next });

      subscriber.next({ id: 1 });
      expect(clone).toHaveBeenCalled();
    });

    it('should handle errors in compare function', () => {
      const error = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.emitOnChange({
          compare: () => { throw new Error('test'); }
        })
      ).subscribe({ next: () => { }, error });

      subscriber.next(1);
      subscriber.next(2);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('operator:tap', () => {
    it('should perform side effects without modifying values', () => {
      const next = vi.fn();
      const sideEffect = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.tap(sideEffect)
      ).subscribe({ next });

      subscriber.next(1);
      subscriber.next(2);

      expect(next).toHaveBeenCalledTimes(2);
      expect(next).toHaveBeenNthCalledWith(1, 1);
      expect(next).toHaveBeenNthCalledWith(2, 2);

      expect(sideEffect).toHaveBeenCalledTimes(2);
      expect(sideEffect).toHaveBeenNthCalledWith(1, 1);
      expect(sideEffect).toHaveBeenNthCalledWith(2, 2);
    });

    it('should handle errors in side effect', () => {
      const error = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.tap(() => { throw new Error('test'); })
      ).subscribe({ next: () => { }, error });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });

    it('should not affect completion', () => {
      const complete = vi.fn();
      const sideEffect = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.tap(sideEffect)
      ).subscribe({ next: () => { }, error: () => { }, complete });

      subscriber.complete();
      expect(complete).toHaveBeenCalled();
    });

    it('should handle onError side effect', () => {
      const error = vi.fn();
      const sideEffect = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.tap(undefined, sideEffect)
      ).subscribe({ error });

      subscriber.error('test error');
      expect(sideEffect).toHaveBeenCalledWith('test error');
      expect(error).toHaveBeenCalledWith('test error');
    });

    it('should handle onComplete side effect', () => {
      const complete = vi.fn();
      const sideEffect = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.tap(undefined, undefined, sideEffect)
      ).subscribe({ next: undefined, error: undefined, complete });

      subscriber.complete();
      expect(sideEffect).toHaveBeenCalled();
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('operator:reduce', () => {
    it('should accumulate values and emit after completion', () => {
      const next = vi.fn();
      const complete = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.reduce((acc, val) => acc + val, 0)
      ).subscribe({ next, complete });

      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);
      subscriber.complete();

      expect(next).toHaveBeenCalledWith(6);
      expect(complete).toHaveBeenCalled();
    });

    it('should handle errors in accumulator', () => {
      const error = vi.fn();
      const [source, subscriber] = createObservable<number>();

      pipe(
        source,
        operators.reduce(() => { throw new Error('test'); }, 0)
      ).subscribe({ next: () => { }, error });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('pushObservable', () => {
    it('should emit initial value and subsequent values', () => {
      const next = vi.fn();
      const [observable, subscriber] = createObservable<number>(99);

      observable.subscribe({ next });
      expect(next).toHaveBeenCalledWith(99);

      subscriber.next(100);
      expect(next).toHaveBeenLastCalledWith(100);
    });

    it('should emit null value', () => {
      const next = vi.fn();
      const [observable, subscriber] = createObservable<null>(null);

      observable.subscribe({ next });
      expect(next).toHaveBeenCalledWith(null);

      subscriber.next(null);
      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('operator:withLatestFrom', () => {
    it('should combine latest values from multiple observables', () => {
      const next = vi.fn();
      const [source, sourceSubscriber] = createObservable<number>();
      const [obs1, ctrl1] = createObservable<number>();
      const [obs2, ctrl2] = createObservable<string>();

      pipe(
        source,
        operators.withLatestFrom(obs1, obs2)
      ).subscribe({ next });

      ctrl1.next(1);
      ctrl2.next('a');
      sourceSubscriber.next(100);

      expect(next).toHaveBeenCalledWith([100, 1, 'a']);
    });

    it('should handle errors in source observable', () => {
      const error = vi.fn();
      const [source, sourceSubscriber] = createObservable<number>();
      const [obs1, ctrl1] = createObservable<number>();
      const [obs2, ctrl2] = createObservable<string>();

      pipe(
        source,
        operators.withLatestFrom(obs1, obs2)
      ).subscribe({ next: () => { }, error });

      ctrl1.next(1);
      ctrl2.next('a');
      sourceSubscriber.error('test error');

      expect(error).toHaveBeenCalledWith('test error');
    });

    it('should handle errors in combined observables', () => {
      const error = vi.fn();
      const [source, sourceSubscriber] = createObservable<number>();
      const [obs1, ctrl1] = createObservable<number>();
      const [obs2, ctrl2] = createObservable<string>();

      pipe(
        source,
        operators.withLatestFrom(obs1, obs2)
      ).subscribe({ next: () => { }, error });

      ctrl1.next(1);
      ctrl2.error('test error');
      sourceSubscriber.next(100);

      expect(error).toHaveBeenCalledWith('test error');
    });

    it('should complete when source completes', () => {
      const complete = vi.fn();
      const [source, sourceSubscriber] = createObservable<number>();
      const [obs1, ctrl1] = createObservable<number>();
      const [obs2, ctrl2] = createObservable<string>();

      pipe(
        source,
        operators.withLatestFrom(obs1, obs2)
      ).subscribe({ next: () => { }, complete });

      ctrl1.next(1);
      ctrl2.next('a');
      sourceSubscriber.complete();

      expect(complete).toHaveBeenCalled();
    });
  });
});

describe("submodule:observables", () => {
  it("should be useable", async () => {
    const counterMod = provideObservable<number>()
    const next = vi.fn()

    const scope = createScope()

    const counter = await scope.resolve(counterMod)

    counter[0].subscribe({ next })
    counter[1].next(1)

    expect(next).toHaveBeenCalledWith(1)
  })

  it("should combine observables", async () => {
    const counterStream = provideObservable<number>(1000)
    const textStream = provideObservable<string>("hello")

    const combinedStream = combineObservables({ counterStream, textStream })

    const scope = createScope()

    const result = await scope.safeRun({
      combinedStream, textStream, counterStream
    }, async ({ combinedStream, textStream, counterStream }) => {
      const fn = vi.fn()
      combinedStream.subscribe({ next: fn })

      await nextTickPromise()
      expect(fn).toHaveBeenCalledWith({ counterStream: 1000, textStream: "hello" })

      counterStream[1].next(1)
      await nextTickPromise()
      expect(fn).toHaveBeenCalledWith({ counterStream: 1, textStream: "hello" })

      textStream[1].next("world")
      await nextTickPromise()
      expect(fn).toHaveBeenCalledWith({ counterStream: 1, textStream: "world" })
    })

    if (result.error) {
      throw result.error
    }
  })
})

function nextTickPromise() {
  return new Promise<void>(resolve => {
    queueMicrotask(() => resolve())
  })
}