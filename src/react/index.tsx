import {
	createScope,
	type Executor,
	type Scope,
	type ObservableGet,
} from "../";

import React, {
	createContext,
	type PropsWithChildren,
	use,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createTransformedObservable, transformFn } from "../observables";

const scopeContext = createContext<Scope | undefined>(undefined);

/**
 * Provides a scope context for managing dependencies and their lifecycle.
 * All hooks must be used within this provider.
 *
 * @example
 * ```tsx
 * <ScopeProvider>
 *   <App />
 * </ScopeProvider>
 * ```
 */
export function ScopeProvider({
	children,
	scopes,
}: PropsWithChildren<{ scopes?: Scope[] }>) {
	const parentScope = useContext(scopeContext);
	const scope = useMemo(() => {
		return createScope(
			...[...(scopes ?? []), ...(parentScope ? [parentScope] : [])],
		);
	}, [parentScope, scopes]);

	useEffect(() => {
		return () => {
			scope.dispose();
			cache = cache.filter(([s]) => s !== scope);
		};
	}, [scope]);

	return (
		<scopeContext.Provider value={scope}> {children} </scopeContext.Provider>
	);
}

/**
 * Returns the current scope instance.
 * Must be used within a ScopeProvider.
 *
 * @throws {Error} If used outside of a ScopeProvider
 * @returns {Scope} The current scope instance
 */
export function useScope(): Scope {
	const scope = useContext(scopeContext);

	if (!scope) {
		throw new Error("useScope must be used within a ScopeProvider");
	}

	return scope;
}

type Cache = {
	promise: Promise<unknown>;
	result?: { data: unknown } | { error: unknown };
};

type CacheEntry = [Scope, Executor<unknown>, Cache];

let cache = [] as CacheEntry[];

/**
 * Core functionality of submodule. Resolves an executor within the current scope.
 *
 * @param executor - The executor to resolve within the current scope.
 * @returns The resolved value of the executor.
 * @throws {Promise} If the executor is not yet resolved, a promise is thrown to suspend the component.
 */
export function useResolve<T>(executor: Executor<T>): T {
	const scope = useContext(scopeContext);

	if (!scope) {
		throw new Error("useScope must be used within a ScopeProvider");
	}

	for (const [s, e, c] of cache) {
		if (s === scope && e === executor && c.result) {
			if ("error" in c.result) {
				throw c.result.error;
			}

			return c.result.data as T;
		}
	}

	const cacheEntry: CacheEntry = [
		scope,
		executor,
		{
			promise: scope.resolve(executor).then(
				(resolved) => {
					cacheEntry[2].result = { data: resolved };
				},
				(e) => {
					cacheEntry[2].result = { error: e };
				},
			),
		},
	];

	cache.push(cacheEntry);
	throw cacheEntry[2].promise;
}

export function useObservable<P>(executor: Executor<ObservableGet<P>>): P {
	const observable = useResolve(executor);
	const subs = useCallback(
		(cb: () => void) => {
			return observable.onValue(cb);
		},
		[observable],
	);

	return useSyncExternalStore(
		subs,
		() => observable.value,
		() => observable.value,
	);
}

export function useTransformFn<Upstream, Value>(
	transform: (upstream: Upstream, prev: Value) => Value,
) {
	const [fn] = useState(() => transform);
	return fn;
}

export function useTransformedObservable<Upstream, Value>(
	executor: Executor<ObservableGet<Upstream>>,
	transform: (upstream: Upstream, prev: Value) => Value,
	initialValue: Value,
): Value {
	const observable = useResolve(executor);
	const updatedValueRef = useRef(initialValue);

	const subs = useCallback(
		(cb: () => void) => {
			const transformed = createTransformedObservable(
				observable,
				transform,
				initialValue,
			);

			const cleanup = transformed.onValue((next) => {
				updatedValueRef.current = next;
				cb();
			});

			return () => {
				cleanup();
				transformed.cleanup();
			};
		},
		[observable, transform, initialValue],
	);

	return useSyncExternalStore(
		subs,
		() => {
			return updatedValueRef.current;
		},
		() => updatedValueRef.current,
	);
}
