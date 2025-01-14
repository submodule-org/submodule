import {
	createScope,
	isExecutor,
	map,
	value,
	type PushObservableExecutor,
	type Executor,
	type Scope,
	type Subscribable,
	observables,
	type OperatorLike,
	pipe,
} from "../";

import React, {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import type {
	Subscriber,
	OperatorFactory,
	PushObservable,
	Operator,
} from "../rx";

const scopeContext = createContext<Scope | undefined>(undefined);
const resetContext = createContext<() => void>(() => {});
const scopeCache = createContext<
	| {
			cache: CacheEntry[];
			clear: () => void;
	  }
	| undefined
>(undefined);

function useCache() {
	const cache = useContext(scopeCache);

	if (!cache) {
		throw new Error("useCache must be used within a ScopeProvider");
	}

	return cache;
}

function BaseScopeProvider({
	children,
	scopes,
}: PropsWithChildren<{ scopes?: Scope[] }>) {
	const parentScope = useContext(scopeContext);
	const cache = useCache();

	const scope = useMemo(() => {
		return createScope(
			...[...(scopes ?? []), ...(parentScope ? [parentScope] : [])],
		);
	}, [parentScope, scopes]);

	useEffect(() => {
		return () => {
			scope.dispose();
			cache.clear();
		};
	}, [scope, cache]);

	return (
		<scopeContext.Provider value={scope}> {children} </scopeContext.Provider>
	);
}

const next = () => Math.random();

/**
 * Provide the scope for the component tree. This is the root of the scope tree.
 * @param Scope can take a list of scope to be used in the tree.
 * @returns
 */
export function ScopeProvider({
	children,
	scopes,
}: PropsWithChildren<{ scopes?: Scope[] }>) {
	const [reset, setReset] = useReducer(next, 0);
	const [cache] = useState(() => {
		const cache: CacheEntry[] = [];
		return {
			cache,
			clear: () => {
				cache.length = 0;
			},
		};
	});

	return (
		<resetContext.Provider value={setReset}>
			<scopeCache.Provider value={cache}>
				<BaseScopeProvider key={reset} scopes={scopes}>
					{children}
				</BaseScopeProvider>
			</scopeCache.Provider>
		</resetContext.Provider>
	);
}

/**
 * Get the closest scope from the current component. Throw error if the use is not within a ScopeProvider.
 *
 * @returns The current scope.
 */
export function useScope(): Scope {
	const scope = useContext(scopeContext);

	if (!scope) {
		throw new Error("useScope must be used within a ScopeProvider");
	}

	return scope;
}

/**
 * @experimental - don't use this yet
 * @returns
 */
export function useResetScope() {
	return useContext(resetContext);
}

type Cache = {
	promise: Promise<unknown>;
	result?: { data: unknown } | { error: unknown };
};

type CacheEntry = [unknown, Cache];

/**
 * Core functionality of submodule. Resolves an executor within the current scope.
 * useResolve must be used within a Suspense boundary.
 *
 * @param executor - The executor to resolve within the current scope.
 * @returns The resolved value of the executor.
 * @throws {Promise} If the executor is not yet resolved, a promise is thrown to suspend the component.
 */
export function useResolve<T>(executor: Executor<T>): T {
	const scope = useScope();
	const { cache } = useCache();

	for (const [e, c] of cache) {
		if (e === executor && c.result) {
			if ("error" in c.result) {
				throw c.result.error;
			}

			return c.result.data as T;
		}
	}

	const cacheEntry: CacheEntry = [
		executor,
		{
			promise: scope.resolve(executor).then(
				(resolved) => {
					cacheEntry[1].result = { data: resolved };
				},
				(e) => {
					cacheEntry[1].result = { error: e };
				},
			),
		},
	];

	cache.push(cacheEntry);
	throw cacheEntry[1].promise;
}

type Emission<Value> =
	| { kind: "value"; value: Value }
	| { kind: "error"; error: unknown }
	| { kind: "not-emitted" };

type Result<Value> =
	| { hasError: false; hasValue: false; value: undefined }
	| { hasError: true; hasValue: false; value: undefined; error: unknown }
	| { hasError: false; hasValue: true; value: Value }
	| { hasError: false; hasValue: false };

const NOT_EMITTED = {
	kind: "not-emitted",
	hasError: false,
	hasValue: false,
} satisfies Emission<unknown> & Result<unknown>;

/**
 * @param pobservable - The push observable executor to use.
 * @returns A tuple containing the emission and a subscriber for the push observable.
 */
export function usePushObservable<P>(
	pobservable: PushObservableExecutor<P>,
): [Emission<P> & Result<P>, Subscriber<P>] {
	const [observable, subscriber] = useResolve(pobservable);

	return [useObservableValue(observable), subscriber];
}

export function useObservableValue<P>(
	subcribable: Subscribable<P> | PushObservable<P>,
): Emission<P> & Result<P>;

export function useObservableValue<P, A>(
	subcribable: Subscribable<P> | PushObservable<P>,
	op1: Operator<P, A>,
): Emission<A> & Result<A>;

export function useObservableValue<P, A, B>(
	subcribable: Subscribable<P> | PushObservable<P>,
	op1: Operator<P, A>,
	op2: Operator<A, B>,
): Emission<B> & Result<B>;

export function useObservableValue<P>(
	subcribable: Subscribable<P> | PushObservable<P>,
	...ops: Operator<unknown, unknown>[]
): Emission<unknown> & Result<unknown>;

/**
 * @param subcribable - The subscribable to use.
 * @returns The emission and result of the subscribable. The return value can be discriminated by the kind property or hasValue/hasError properties.
 */
export function useObservableValue<P>(
	subcribable: Subscribable<P> | PushObservable<P>,
	...ops: Operator<unknown, unknown>[]
): Emission<unknown> & Result<unknown> {
	const valueRef = useRef<Emission<unknown> & Result<unknown>>(NOT_EMITTED);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const subs = useCallback(
		(cb: () => void) => {
			const observable = observables.isPushObservable(subcribable)
				? subcribable[0]
				: subcribable;

			const piped = pipe(observable, ...ops);

			const unsubscribe = piped.subscribe({
				next: (value) => {
					valueRef.current = {
						kind: "value",
						hasError: false,
						hasValue: true,
						value,
					};
					cb();
				},
				error: (error) => {
					valueRef.current = {
						kind: "error",
						hasError: true,
						hasValue: false,
						value: undefined,
						error,
					};
				},
			});

			return () => {
				valueRef.current = NOT_EMITTED;
				unsubscribe();
			};
		},
		[subcribable, ...ops],
	);

	const subbed = useSyncExternalStore(
		subs,
		() => valueRef.current,
		() => valueRef.current,
	);

	return subbed;
}

/**
 * Use observable in combination with operators.
 * @param source - The source of the observable.
 */
export function useObservable<S>(
	source: Executor<Subscribable<S> | PushObservable<S>>,
): Emission<S> & Result<S>;

export function useObservable<S, A>(
	source: Executor<Subscribable<S> | PushObservable<S>>,
	op1: Operator<S, A>,
): Emission<A> & Result<A>;

export function useObservable<S, A, B>(
	source: Executor<Subscribable<S> | PushObservable<S>>,
	op1: Operator<S, A>,
	op2: Operator<A, B>,
): Emission<B> & Result<B>;

export function useObservable<S, A, B, C>(
	source: Executor<Subscribable<S> | PushObservable<S>>,
	op1: Operator<S, A>,
	op2: Operator<A, B>,
	op3: Operator<B, C>,
): Emission<C> & Result<C>;

export function useObservable<S, A, B, C, D>(
	source: Executor<Subscribable<S> | PushObservable<S>>,
	op1: Operator<S, A>,
	op2: Operator<A, B>,
	op3: Operator<B, C>,
	op4: Operator<C, D>,
): Emission<D> & Result<D>;

export function useObservable<S, A, B, C, D, E>(
	source: Executor<Subscribable<S> | PushObservable<S>>,
	op1: Operator<S, A>,
	op2: Operator<A, B>,
	op3: Operator<B, C>,
	op4: Operator<C, D>,
	op5: Operator<D, E>,
): Emission<E> & Result<E>;

export function useObservable<S>(
	source: Executor<Subscribable<S>>,
	...ops: Operator<S, unknown>[]
): Emission<unknown> & Result<unknown>;

export function useObservable<S>(
	source: Executor<Subscribable<S> | PushObservable<S>>,
	...ops: Operator<S, unknown>[]
): Emission<unknown> & Result<unknown> {
	const observable = useResolve(source);
	return useObservableValue(observable, ...ops);
}

export function useOperator<P, V, Params extends Array<unknown>>(
	operator:
		| OperatorFactory<P, V, Params>
		| Executor<OperatorFactory<P, V, Params>>,
	...params: Params
) {
	const executor = useMemo(() => {
		return isExecutor(operator)
			? map(operator, (operator) => operator(...params))
			: value(operator(...params));
	}, [operator, params]);

	return useResolve(executor);
}
