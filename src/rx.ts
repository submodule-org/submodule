/** Credit to rxjs to interfaces and terminologies */

/**
 * A function that unsubscribes from an observable.
 */
export type Unsubscribe = () => void

/**
 * An observer that receives notifications from an observable.
 * @template T The type of the value received by the observer.
 */
export type Observer<T> = {
  next: (value: T) => void
  error: (error: unknown) => void
  complete: () => void
}

/**
 * An operator (like map, filter, etc.) that transforms a source of type T into a result of type R.
 * @template T The type of the value received by the observer.
 */
export type Operator<T, R> = UnaryFunction<Subscribable<T>, Subscribable<R>>

/**
 * Represents a subscribable entity that can be observed.
 * @template T The type of the value emitted by the subscribable.
 */
export type Subscribable<T> = {
  subscribe: (observer: Partial<Observer<T>>) => Unsubscribe
  readonly lastValue: T | undefined
  pipe<A>(op1: Operator<T, A>): Subscribable<A>;
  pipe<A, B>(op1: Operator<T, A>, op2: Operator<A, B>): Subscribable<B>;
  pipe<A, B, C>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>): Subscribable<C>;
  pipe<A, B, C, D>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>): Subscribable<D>;
  pipe<A, B, C, D, E>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>, op5: Operator<D, E>): Subscribable<E>;
  pipe<A, B, C, D, E, F>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>, op5: Operator<D, E>, op6: Operator<E, F>): Subscribable<F>;
  pipe<A, B, C, D, E, F, G>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>, op5: Operator<D, E>, op6: Operator<E, F>, op7: Operator<F, G>): Subscribable<G>;
  pipe<A, B, C, D, E, F, G, H>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>, op5: Operator<D, E>, op6: Operator<E, F>, op7: Operator<F, G>, op8: Operator<G, H>): Subscribable<H>;
  pipe<A, B, C, D, E, F, G, H, I>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>, op5: Operator<D, E>, op6: Operator<E, F>, op7: Operator<F, G>, op8: Operator<G, H>, op9: Operator<H, I>): Subscribable<I>;
  pipe<A, B, C, D, E, F, G, H, I, J>(op1: Operator<T, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>, op5: Operator<D, E>, op6: Operator<E, F>, op7: Operator<F, G>, op8: Operator<G, H>, op9: Operator<H, I>, op10: Operator<I, J>): Subscribable<J>;
}

/**
 * A unary function that transforms a source of type T into a result of type R.
 * @template T The type of the input to the function.
 * @template R The type of the result of the function.
 */
export type UnaryFunction<T, R> = (source: T) => R

export type OperatorFunction<T, R> = UnaryFunction<Subscribable<T>, Subscribable<R>>

export type ObservableInput<T> =
  | ((subscriber: Observer<T>) => Unsubscribe)

/**
 * A function that provides an operator function.
 * @template T The type of the input to the operator.
 * @template R The type of the result of the operator.
 * @template Params The type of the parameters for the operator factory.
 */
export type OperatorFactory<T, R, Params extends unknown[]> = (...args: Params) => OperatorFunction<T, R>

/**
 * A subscriber that receives notifications from an observable.
 * @template T The type of the value received by the subscriber.
 */
export type Subscriber<T> = {
  next: (value: T) => void
  error: (err: unknown) => void
  complete: () => void
}

/** Utility type to force tuple Subscriber and controller */
export type ControllableObservable<T, V> = readonly [Subscribable<T>, V]

/**
 * Represents a push-based observable with a subscriber.
 * @template T The type of the value emitted by the observable.
 */
export type PushObservable<T> = ControllableObservable<T, Subscriber<T>>

type SubjectInit<T> = {
  kind: 'init'
  subscribers: Set<Partial<Observer<T>>>
}

type SubjectActive<T> = {
  kind: 'active'
  subscribers: Set<Partial<Observer<T>>>
  lastValue?: T
}

type SubjectError = {
  kind: 'error'
  error: unknown
}

type SubjectComplete = {
  kind: 'complete'
}

type Subject<T> = SubjectInit<T> | SubjectActive<T> | SubjectError | SubjectComplete

const noops: Unsubscribe = () => { }

/**
 * Creates a push-based observable.
 * @template T The type of the value emitted by the observable.
 * @param {T} [initialValue] - The initial value to emit.
 * @returns {PushObservable<T>} The created push-based observable.
 */
export function pushObservable<T>(initialValue?: T): PushObservable<T> {
  let subject: Subject<T> = initialValue === undefined ? {
    kind: 'init',
    subscribers: new Set()
  } : {
    kind: 'active',
    subscribers: new Set(),
    lastValue: initialValue
  }

  function handleNext(value: T) {
    if (subject.kind === 'error' || subject.kind === 'complete') return;

    if (subject.kind === 'init') {
      subject = {
        kind: 'active',
        subscribers: subject.subscribers
      };
    }

    (subject as SubjectActive<T>).lastValue = value

    for (const sub of subject.subscribers) {
      sub.next?.(value);
    }
  }

  function handleError(err: unknown) {
    if (subject.kind === 'error' || subject.kind === 'complete') return;
    const subs = subject.subscribers;
    subject = { kind: 'error', error: err };
    for (const sub of subs) {
      sub.error?.(err);
    }
  }

  function handleComplete() {
    if (subject.kind === 'error' || subject.kind === 'complete') return;
    const subs = subject.subscribers;
    subject = { kind: 'complete' };
    for (const sub of subs) {
      sub.complete?.();
    }
  }

  const subscriber: Subscriber<T> = {
    next: handleNext,
    error: handleError,
    complete: handleComplete
  };

  const observable: Subscribable<T> = {
    subscribe: (obs: Partial<Observer<T>>) => {
      switch (subject.kind) {
        case 'error':
          obs.error?.(subject.error);
          return noops;
        case 'complete':
          obs.complete?.();
          return noops;
        case 'active': {
          subject.subscribers.add({
            next: obs.next ?? noops,
            error: obs.error ?? noops,
            complete: obs.complete ?? noops
          });

          if (subject.lastValue !== undefined) {
            obs.next?.(subject.lastValue)
          }

          break
        }
        case 'init':
          subject.subscribers.add({
            next: obs.next ?? noops,
            error: obs.error ?? noops,
            complete: obs.complete ?? noops
          });

          break;
      }

      return () => {
        if (subject.kind !== 'error' && subject.kind !== 'complete') {
          subject.subscribers.delete(obs);
        }
      };
    },
    pipe: ((...ops: Operator<unknown, unknown>[]): Subscribable<unknown> => {
      return pipe(observable, ...ops);
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    }) as any,
    get lastValue() {
      return subject.kind === 'active' ? subject.lastValue : undefined;
    }
  }

  return [observable, subscriber];
}

/**
 * Also known as cold observable, the Input will be called and cleaned as a new subscriber subscribes
 * @param observer 
 * @returns 
 */
/**
 * Creates a pull-based observable.
 * @template T The type of the value emitted by the observable.
 * @param {ObservableInput<T>} observer - The observer function to call for each subscription.
 * @returns {Subscribable<T>} The created pull-based observable.
 */
export function pullObservable<T>(observer: ObservableInput<T>): Subscribable<T> {
  const observable = {
    subscribe: (subscriber) => {
      const unsub = observer({
        next: subscriber.next?.bind(subscriber),
        error: subscriber.error?.bind(subscriber),
        complete: () => {
          subscriber.complete?.();
          unsub(); // auto cleanup on complete
        }
      });
      return unsub;
    },
    pipe: ((...ops: Operator<unknown, unknown>[]): Subscribable<unknown> => {
      return pipe(observable, ...ops);
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    }) as any,
    lastValue: undefined
  } satisfies Subscribable<T>;

  return observable;
}

/**
 * Pipes multiple operators together.
 * @template S The type of the source value.
 * @template A The type of the result after applying the first operator.
 * @param {Subscribable<S>} source - The source subscribable.
 * @param {Operator<S, A>} op1 - The first operator to apply.
 * @returns {Subscribable<A>} The resulting subscribable after applying the operators.
 */
export function pipe<S, A>(source: Subscribable<S>, op1: Operator<S, A>): Subscribable<A>;
export function pipe<S, A, B>(source: Subscribable<S>, op1: Operator<S, A>, op2: Operator<A, B>): Subscribable<B>;
export function pipe<S, A, B, C>(source: Subscribable<S>, op1: Operator<S, A>, op2: Operator<A, B>, op3: Operator<B, C>): Subscribable<C>;
export function pipe<S, A, B, C, D>(source: Subscribable<S>, op1: Operator<S, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>): Subscribable<D>;
export function pipe<S, A, B, C, D, E>(source: Subscribable<S>, op1: Operator<S, A>, op2: Operator<A, B>, op3: Operator<B, C>, op4: Operator<C, D>, op5: Operator<D, E>): Subscribable<E>;
export function pipe<S, K>(source: Subscribable<S>, ...ops: Operator<unknown, unknown>[]): Subscribable<K>;

export function pipe<S>(source: Subscribable<S>, ...ops: Operator<unknown, unknown>[]): Subscribable<unknown> {
  return ops.reduce((acc, op) => {
    return op(acc);
  }, source);
}

/**
 * Utility function to create an operator from a function.
 * @template T The type of the input to the operator.
 * @template R The type of the result of the operator.
 * @param {UnaryFunction<Subscribable<T>, Subscribable<R>>} fn - The function to create the operator from.
 * @returns {Operator<T, R>} The created operator.
 */
export function createOperator<T, R>(fn: (source: Subscribable<T>) => Subscribable<R>): Operator<T, R> {
  return fn;
}

/**
 * A collection of common operators.
 */
export const operators = {
  /**
   * Transforms each value emitted by the source observable using the provided function.
   * @template T The type of the input value.
   * @template R The type of the output value.
   * @param {function(T): R} fn - The function to apply to each value.
   * @returns {Operator<T, R>} The operator that applies the function.
   */
  map<T, R>(fn: (value: T) => R): Operator<T, R> {
    return (source) => {
      const [observable, subscriber] = pushObservable<R>();
      const unsub = source.subscribe({
        next: (val) => {
          try {
            subscriber.next(fn(val));
          } catch (err) {
            subscriber.error(err);
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete()
      });
      return {
        ...observable,
        subscribe: (obs) => {
          const unsub2 = observable.subscribe(obs);
          return () => {
            unsub2();
            unsub();
          };
        }
      };
    };
  },
  /**
   * Filters values emitted by the source observable using the provided predicate function.
   * @template T The type of the input value.
   * @param {function(T): boolean} predicate - The predicate function to apply to each value.
   * @returns {Operator<T, T>} The operator that filters values.
   */
  filter<T>(predicate: (value: T) => boolean): Operator<T, T> {
    return (source) => {
      const [observable, subscriber] = pushObservable<T>();
      const unsub = source.subscribe({
        next: (val) => {
          try {
            if (predicate(val)) subscriber.next(val);
          } catch (err) {
            subscriber.error(err);
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete()
      });
      return {
        ...observable,
        subscribe: (obs) => {
          const unsub2 = observable.subscribe(obs);
          return () => {
            unsub2();
            unsub();
          };
        }
      };
    };
  },
  /**
   * Performs side effects for each value emitted by the source observable.
   * @template T The type of the input value.
   * @param {object} handlers - The side effect handlers.
   * @param {function(T): void} [handlers.onNext] - The side effect function to apply to each value.
   * @param {function(unknown): void} [handlers.onError] - The side effect function to apply on error.
   * @param {function(): void} [handlers.onComplete] - The side effect function to apply on completion.
   * @returns {Operator<T, T>} The operator that performs the side effects.
   */
  tap<T>({
    onNext,
    onError,
    onComplete,
  }: {
    onNext?: (value: T) => void;
    onError?: (error: unknown) => void;
    onComplete?: () => void;
  }): Operator<T, T> {
    return (source) => {
      const [observable, subscriber] = pushObservable<T>();
      const unsub = source.subscribe({
        next: (val) => {
          try {
            onNext?.(val);
            subscriber.next(val);
          } catch (err) {
            subscriber.error(err);
          }
        },
        error: (err) => {
          if (onError) {
            try {
              onError(err);
            } catch (e) {
              subscriber.error(e);
              return;
            }
          }
          subscriber.error(err);
        },
        complete: () => {
          if (onComplete) {
            try {
              onComplete();
            } catch (err) {
              subscriber.error(err);
              return;
            }
          }
          subscriber.complete();
        }
      });
      return {
        ...observable,
        subscribe: (obs) => {
          const unsub2 = observable.subscribe(obs);
          return () => {
            unsub2();
            unsub();
          };
        }
      };
    };
  },
  /**
   * Emits only the last value emitted by the source observable when it completes.
   * @template T The type of the input value.
   * @returns {Operator<T, T>} The operator that emits the last value.
   */
  latest<T>(): Operator<T, T> {
    return (source) => {
      const [observable, subscriber] = pushObservable<T>();
      let lastValue: T | undefined;
      let hasValue = false;
      const unsub = source.subscribe({
        next: (val) => {
          lastValue = val;
          hasValue = true;
        },
        error: (err) => subscriber.error(err),
        complete: () => {
          // biome-ignore lint/style/noNonNullAssertion: <explanation>
          if (hasValue) subscriber.next(lastValue!);
          subscriber.complete();
        }
      });
      return {
        ...observable,
        subscribe: (obs) => {
          const unsub2 = observable.subscribe(obs);
          return () => {
            unsub2();
            unsub();
          };
        }
      };
    };
  },
  /**
   * Emits values only when they change, using an optional compare and clone function.
   * @template T The type of the input value.
   * @param {object} [options] - Optional compare and clone functions.
   * @param {function(T, T): boolean} [options.compare] - The function to compare values.
   * @param {function(T): T} [options.clone] - The function to clone values.
   * @returns {Operator<T, T>} The operator that emits values only when they change.
   */
  emitOnChange<T>(options?: {
    compare?: (prev: T, curr: T) => boolean,
    clone?: (value: T) => T
  }): Operator<T, T> {
    const compare = options?.compare ?? Object.is;
    const clone = options?.clone ?? structuredClone;

    return (source) => {
      const [observable, subscriber] = pushObservable<T>();
      let last: T | undefined;
      let hasValue = false;
      const unsub = source.subscribe({
        next: (val) => {
          try {
            const cloned = clone(val);
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            if (!hasValue || !compare(last!, cloned)) {
              last = cloned;
              hasValue = true;
              subscriber.next(cloned);
            }
          } catch (err) {
            subscriber.error(err);
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete()
      });
      return {
        ...observable,
        subscribe: (obs) => {
          const unsub2 = observable.subscribe(obs);
          return () => {
            unsub2();
            unsub();
          };
        }
      };
    };
  },
  /**
   * Accumulates values emitted by the source observable using the provided accumulator function and seed value.
   * @template T The type of the input value.
   * @template R The type of the accumulated value.
   * @param {function(R, T): R} accumulator - The accumulator function to apply to each value.
   * @param {R} seed - The initial accumulated value.
   * @returns {Operator<T, R>} The operator that accumulates values.
   */
  reduce<T, R>(accumulator: (acc: R, value: T) => R, seed: R): Operator<T, R> {
    return (source) => {
      const [observable, subscriber] = pushObservable<R>();
      let accumulated = seed;
      const unsub = source.subscribe({
        next: (val) => {
          try {
            accumulated = accumulator(accumulated, val);
          } catch (err) {
            subscriber.error(err);
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => {
          subscriber.next(accumulated);
          subscriber.complete();
        }
      });
      return {
        ...observable,
        subscribe: (obs) => {
          const unsub2 = observable.subscribe(obs);
          return () => {
            unsub2();
            unsub();
          };
        }
      };
    };
  },
  /**
   * Combines the source observable with the latest values from multiple other observables.
   * @template T The type of the source value.
   * @template R The type of the combined value.
   * @param {Array<Subscribable<any> | ControllableObservable<any, any>>} sources - The sources to combine.
   * @returns {Operator<T, [T, ...any[]]>} The operator that combines the source with the latest values from the other observables.
   */
  withLatestFrom<T, R extends Array<Subscribable<unknown> | ControllableObservable<unknown, unknown>>>(
    ...sources: R
  ): Operator<T, [T, ...{ [K in keyof R]: R[K] extends Subscribable<infer U> ? U : R[K] extends ControllableObservable<infer U, unknown> ? U : never }]> {
    return (source) => {
      const [observable, subscriber] = pushObservable<[T, ...{ [K in keyof R]: R[K] extends Subscribable<infer U> ? U : R[K] extends ControllableObservable<infer U, unknown> ? U : never }]>();
      const values = new Array(sources.length) as { [K in keyof R]: R[K] extends Subscribable<infer U> ? U : R[K] extends ControllableObservable<infer U, unknown> ? U : never }[];

      const hasValue = Array(sources.length).fill(false);

      const unsubs = sources.map((obs, i) => {
        const observable = Array.isArray(obs) ? obs[0] : obs;
        return observable.subscribe({
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          next: (val: any) => {
            values[i] = val;
            hasValue[i] = true;
          },
          error: (err: unknown) => subscriber.error(err),
          complete: () => subscriber.complete()
        });
      });

      const unsubSource = source.subscribe({
        next: (val) => {
          if (hasValue.every(v => v)) {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            subscriber.next([val, ...values] as any);
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete()
      });

      return {
        ...observable,
        subscribe: (obs) => {
          const unsub = observable.subscribe(obs);
          return () => {
            unsub();
            unsubSource();
            for (const unsub of unsubs) {
              unsub();
            }
          };
        }
      };
    };
  }
}

/**
 * A collection of common observables.
 */
export const observables = {
  /**
   * Creates a push-based observable.
   * @template T The type of the value emitted by the observable.
   * @param {T} [initialValue] - The initial value to emit.
   * @returns {PushObservable<T>} The created push-based observable.
   */
  pushObservable,
  /**
   * Creates a pull-based observable.
   * @template T The type of the value emitted by the observable.
   * @param {ObservableInput<T>} observer - The observer function to call for each subscription.
   * @returns {Subscribable<T>} The created pull-based observable.
   */
  pullObservable,
  /**
   * Pipes multiple operators together.
   * @template S The type of the source value.
   * @template A The type of the result after applying the first operator.
   * @param {Subscribable<S>} source - The source subscribable.
   * @param {Operator<S, A>} op1 - The first operator to apply.
   * @returns {Subscribable<A>} The resulting subscribable after applying the operators.
   */
  pipe,
  extends: <T>(source: Subscribable<T>, options: {
    cleanup: () => void
  }): Subscribable<T> => {
    return {
      ...source,
      subscribe: (obs) => {
        const unsub = source.subscribe(obs);
        return () => {
          unsub();
          options.cleanup();
        };
      }
    }
  },

  /** Simplified version of push observable that focusing on providing a shaped api */
  createState: <T, C>(
    initialValue: T,
    fn: (subscriber: Subscriber<T>, get: () => T) => C
  ): readonly [Subscribable<T>, C] => {
    const [observable, subscriber] = pushObservable<T>(initialValue);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const get = () => observable.lastValue!;

    const controller = fn(subscriber, get);
    return [observable, controller] as const;
  },
  /**
   * Combines the latest values from multiple observables into a single observable.
   * @template T The type of the combined value.
   * @param {object} sources - The sources to combine.
   * @returns {Subscribable<T>} The combined observable.
   */
  combineLatest<T extends Record<string, unknown>>(
    sources: {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      [K in keyof T]: Subscribable<T[K]> | ControllableObservable<T[K], any>
    }): Subscribable<T> {

    // only emit where every up streams have emitted
    const keys = Object.keys(sources) as (keyof T)[];
    const [observable, subscriber] = pushObservable<T>();
    const values = {} as T;

    // value can be Subscriable or PushObservable, distinguish them
    const observables = keys.map(key => {
      const source = sources[key] satisfies PushObservable<T[typeof key]> | Subscribable<T[typeof key]>;
      return Array.isArray(source) ? source[0] : source;
    });

    // subscribe all of them, make sure only emitting on all of them has value
    // must use external flag to track, the emitting value can be null or undefined
    const hasValue = Array(keys.length).fill(false);
    const valuesArray = Array(keys.length).fill(undefined);

    const unsubs = observables.map((obs, i) => {
      return obs.subscribe({
        next: (val) => {
          valuesArray[i] = val;
          hasValue[i] = true;
          if (hasValue.every(v => v)) {
            keys.forEach((key, j) => {
              values[key] = valuesArray[j];
            });
            subscriber.next(values);
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete()
      });
    });

    return {
      ...observable,
      subscribe: (obs) => {
        const unsub = observable.subscribe(obs);
        return () => {
          unsub();
          // biome-ignore lint/complexity/noForEach: <explanation>
          unsubs.forEach(unsub => unsub());
        };
      }
    };
  },
  /** determine if it's subscriber or pushObservable */
  isPushObservable<T>(source: Subscribable<T> | PushObservable<T>): source is PushObservable<T> {
    return Array.isArray(source);
  }
}