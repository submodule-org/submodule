import {
	createScope,
	isExecutor,
	map,
	value,
	type PushObservableExecutor,
	type Executor,
	type Scope,
	type Subscribable,
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
import type { Subscriber, OperatorFactory } from "../rx";

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

export function useScope(): Scope {
	const scope = useContext(scopeContext);

	if (!scope) {
		throw new Error("useScope must be used within a ScopeProvider");
	}

	return scope;
}

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

export function usePushObservable<P>(
	pobservable: PushObservableExecutor<P>,
): [Emission<P> & Result<P>, Subscriber<P>] {
	const { observable, subscriber } = useResolve(pobservable);

	return [useObservableValue(observable), subscriber];
}

export function useObservableValue<P>(
	subcribable: Subscribable<P>,
): Emission<P> & Result<P> {
	const valueRef = useRef<Emission<P> & Result<P>>(NOT_EMITTED);

	const subs = useCallback(
		(cb: () => void) => {
			const unsubscribe = subcribable.subscribe({
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
		[subcribable],
	);

	const subbed = useSyncExternalStore(
		subs,
		() => valueRef.current,
		() => valueRef.current,
	);

	return subbed;
}

export function useObservable<P>(
	pexecutor: Executor<Subscribable<P>>,
): Emission<P> {
	const observable = useResolve(pexecutor);
	return useObservableValue(observable);
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
