import { describe, it, expect, vi } from 'vitest'
import { pushObservable, pipe, pullObservable, operators, observables } from '../src/rx'
import { combineObservables, createScope, providePushObservable } from '../src';

describe('Observable', () => {
  describe('basic subscription', () => {
    it('should emit multiple values', () => {
      const next = vi.fn()
      const { observable, subscriber } = pushObservable<number>()

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

      const { observable, subscriber } = pushObservable<number>()

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
      const { observable, subscriber } = pushObservable<number>();

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

      const { observable, subscriber } = pushObservable<number>()

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

      const { observable, subscriber } = pushObservable<number>()
      observable.subscribe({ error })

      subscriber.error(testError)

      expect(error).toHaveBeenCalledWith(testError)
    })
  })


  describe('pipe operations', () => {
    it('should transform values through pipe', () => {
      const next = vi.fn()
      const { observable, subscriber } = pushObservable<number>()

      pipe(observable,
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
      const { observable, subscriber } = pushObservable<number>()

      observable.pipe(
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

      const { observable, subscriber } = pushObservable<number>()

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

  describe('cold observable', () => {
    it('should create new execution for each subscriber', () => {
      const executionLog: number[] = [];
      const cold = pullObservable<number>(sub => {
        executionLog.push(1);
        sub.next(1);
        sub.next(2);
        return () => { };
      });

      // First subscriber
      cold.subscribe({
        next: () => { },
        error: () => { },
        complete: () => { }
      });

      // Second subscriber
      cold.subscribe({
        next: () => { },
        error: () => { },
        complete: () => { }
      });

      expect(executionLog).toEqual([1, 1]); // Observer executed twice
    });

    it('should maintain separate streams for each subscriber', () => {
      let count = 0;
      const cold = pullObservable<number>(sub => {
        const currentCount = ++count;
        sub.next(currentCount);
        return () => { };
      });

      const next1 = vi.fn();
      const next2 = vi.fn();

      cold.subscribe({ next: next1, error: () => { }, complete: () => { } });
      cold.subscribe({ next: next2, error: () => { }, complete: () => { } });

      expect(next1).toHaveBeenCalledWith(1);
      expect(next2).toHaveBeenCalledWith(2);
    });
  });

  describe('static creation', () => {
    describe('combineLatest', () => {
      it('should combine latest values from multiple observables', () => {
        const next = vi.fn();
        const { observable: obs1, subscriber: ctrl1 } = pushObservable<number>();
        const { observable: obs2, subscriber: ctrl2 } = pushObservable<string>();

        observables.combineLatest({
          num: obs1,
          str: obs2
        }).subscribe({
          next,
          error: () => { },
          complete: () => { }
        });

        ctrl1.next(1);
        expect(next).not.toHaveBeenCalled(); // Wait for all sources

        ctrl2.next('a');
        expect(next).toHaveBeenCalledWith({ num: 1, str: 'a' });

        ctrl1.next(2);
        expect(next).toHaveBeenCalledWith({ num: 2, str: 'a' });
      });

      it('should complete when all sources complete', () => {
        const complete = vi.fn();
        const { observable: obs1, subscriber: ctrl1 } = pushObservable<number>();
        const { observable: obs2, subscriber: ctrl2 } = pushObservable<string>();

        observables.combineLatest({
          num: obs1,
          str: obs2
        }).subscribe({
          next: () => { },
          error: () => { },
          complete
        });

        ctrl1.complete();
        expect(complete).not.toHaveBeenCalled();

        ctrl2.complete();
        expect(complete).toHaveBeenCalled();
      });
    });

  });

  describe('operator:map', () => {
    it('should transform values', () => {
      const next = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.map(x => x * 2)
      ).subscribe({ next, error: () => { }, complete: () => { } });

      subscriber.next(1);
      subscriber.next(2);
      subscriber.next(3);

      expect(next).toHaveBeenCalledTimes(3);
      expect(next).toHaveBeenNthCalledWith(1, 2);
      expect(next).toHaveBeenNthCalledWith(2, 4);
      expect(next).toHaveBeenNthCalledWith(3, 6);
    });

    it('should handle errors', () => {
      const error = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.map(() => { throw new Error('test'); })
      ).subscribe({ next: () => { }, error, complete: () => { } });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });

    it('should complete when source completes', () => {
      const complete = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.map(x => x * 2)
      ).subscribe({ next: () => { }, error: () => { }, complete });

      subscriber.complete();
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('operator:latest', () => {
    it('should emit last value only on completion', () => {
      const next = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
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
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.latest()
      ).subscribe({ next, error: () => { }, complete: () => { } });

      subscriber.complete();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors', () => {
      const next = vi.fn();
      const error = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
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
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
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
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.filter(() => { throw new Error('test'); })
      ).subscribe({ next: () => { }, error, complete: () => { } });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });

    it('should complete when source completes', () => {
      const complete = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.filter(x => x % 2 === 0)
      ).subscribe({ next: () => { }, error: () => { }, complete });

      subscriber.complete();
      expect(complete).toHaveBeenCalled();
    });
  });

  describe('operator:distinctUntilChanged', () => {
    it('should emit first value always', () => {
      const next = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.emitOnChange()
      ).subscribe({ next });

      subscriber.next(1);
      expect(next).toHaveBeenCalledWith(1);
    });

    it('should not emit same value twice', () => {
      const next = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.emitOnChange()
      ).subscribe({ next });

      subscriber.next(1);
      subscriber.next(1);
      subscriber.next(1);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should support custom compare function', () => {
      const next = vi.fn();
      const { observable: source, subscriber } = pushObservable<{ id: number }>();

      source.pipe(
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
      const { observable: source, subscriber } = pushObservable<{ id: number }>();

      source.pipe(
        operators.emitOnChange({
          clone
        })
      ).subscribe({ next });

      subscriber.next({ id: 1 });
      expect(clone).toHaveBeenCalled();
    });

    it('should handle errors in compare function', () => {
      const error = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
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
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
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
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.tap(() => { throw new Error('test'); })
      ).subscribe({ next: () => { }, error });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });

    it('should not affect completion', () => {
      const complete = vi.fn();
      const sideEffect = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.tap(sideEffect)
      ).subscribe({ next: () => { }, error: () => { }, complete });

      subscriber.complete();
      expect(complete).toHaveBeenCalled();
    });
  });


  describe('operator:reduce', () => {
    it('should accumulate values and emit after completion', () => {
      const next = vi.fn();
      const complete = vi.fn();
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
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
      const { observable: source, subscriber } = pushObservable<number>();

      source.pipe(
        operators.reduce(() => { throw new Error('test'); }, 0)
      ).subscribe({ next: () => { }, error });

      subscriber.next(1);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('pushObservable', () => {
    it('should emit initial value and subsequent values', () => {
      const next = vi.fn();
      const { observable, subscriber } = pushObservable<number>(99);

      observable.subscribe({ next });
      expect(next).toHaveBeenCalledWith(99);

      subscriber.next(100);
      expect(next).toHaveBeenLastCalledWith(100);
    });

    it('should emit null value', () => {
      const next = vi.fn();
      const { observable, subscriber } = pushObservable<null>(null);

      observable.subscribe({ next });
      expect(next).toHaveBeenCalledWith(null);

      subscriber.next(null);
      expect(next).toHaveBeenCalledTimes(2);
    });
  });
});

describe("submodule:observables", () => {
  it("should be useable", async () => {
    const counterMod = providePushObservable<number>()
    const next = vi.fn()

    const scope = createScope()

    const counter = await scope.resolve(counterMod)

    counter.observable.subscribe({ next })
    counter.subscriber.next(1)

    expect(next).toHaveBeenCalledWith(1)
  })

  it("should combine observables", async () => {
    const counterStream = providePushObservable<number>(1000)
    const textStream = providePushObservable<string>("hello")

    const combinedStream = combineObservables({ counterMod: counterStream, textMod: textStream })

    const scope = createScope()

    const result = await scope.safeRun({
      combinedStream, textStream, counterStream
    }, ({ combinedStream, textStream, counterStream }) => {
      const fn = vi.fn()
      combinedStream.subscribe({ next: fn })

      expect(fn).toHaveBeenCalledWith({ counterMod: 1000, textMod: "hello" })

      counterStream.subscriber.next(1)
      expect(fn).toHaveBeenCalledWith({ counterMod: 1, textMod: "hello" })

      textStream.subscriber.next("world")
      expect(fn).toHaveBeenCalledWith({ counterMod: 1, textMod: "world" })
    })

    if (result.error) {
      throw result.error
    }
  })
})