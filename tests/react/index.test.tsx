import { renderHook, configure, waitFor, act } from "@testing-library/react";
import {
	applyPipes,
	combineObservables,
	observables,
	operators,
	provideObservable,
	value,
} from "../../src";
import {
	ScopeProvider,
	useObservable,
	useControllableObservable,
	useResolve,
} from "../../src/react";
import type { PropsWithChildren } from "react";
import React, { Suspense, useMemo, useState } from "react";
import "@testing-library/jest-dom";

configure({ reactStrictMode: true });

const stringvalue = value("hello");

const observableCount = provideObservable<number>(0);

const listStream = provideObservable([
	{ id: 1, value: "1" },
	{ id: 2, value: "2" },
	{ id: 3, value: "3" },
]);

const selectedIdStream = provideObservable(null as null | number);

const selectedItem = applyPipes(
	combineObservables({ listStream, selectedIdStream }),
	operators.map(({ listStream, selectedIdStream }) => {
		return selectedIdStream === null
			? null
			: listStream.find((item) => item.id === selectedIdStream);
	}),
);

const wrapper = ({ children }: PropsWithChildren) => (
	<ScopeProvider>
		<Suspense>{children}</Suspense>
	</ScopeProvider>
);

describe("test useResolve", () => {
	test("useResolve should be able to resolve value", async () => {
		const { result } = renderHook(() => useResolve(stringvalue), {
			wrapper,
		});

		await waitFor(() => expect(result.current).toEqual("hello"));
	});
});

describe("test observable", () => {
	test("manual observable should just work", async () => {
		const { result } = renderHook(
			() => {
				const [counter, setCounter] =
					useControllableObservable(observableCount);

				return { counter, setCounter };
			},
			{
				wrapper,
			},
		);

		await waitFor(() => {
			expect(result.current.counter).toMatchObject({ kind: "not-emitted" });
			expect(result.current.counter).toMatchObject({
				hasError: false,
				hasValue: false,
			});
		});

		act(() => {
			result.current.setCounter.next(5);
		});

		await waitFor(() =>
			expect(result.current.counter).toMatchObject({ value: 5, kind: "value" }),
		);
	});

	test("useObservable with a little bit more complicated usecase", async () => {
		const { result } = renderHook(
			() => {
				const [selectedId, setSelectedId] =
					useControllableObservable(selectedIdStream);
				const [list, setList] = useControllableObservable(listStream);
				const selected = useObservable(selectedItem);

				return {
					selected,
					setSelectedId,
					setList,
					list,
					selectedId,
				};
			},
			{
				wrapper,
			},
		);

		await waitFor(() => {
			expect(result.current.selected).toMatchObject({ kind: "not-emitted" });
		});

		act(() => {
			result.current.setSelectedId.next(1);
		});

		await waitFor(() => {
			expect(result.current.selected).toMatchObject({
				kind: "value",
				value: { id: 1, value: "1" },
			});
		});

		act(() => {
			const currentList = result.current.list;

			if (currentList.kind === "value") {
				result.current.setList.next(
					currentList.value.map((item) => {
						if (item.id === 1) {
							return { id: 1, value: "new value" };
						}
						return item;
					}),
				);
			}
		});

		await waitFor(() => {
			expect(result.current.selected).toMatchObject({
				kind: "value",
				value: { id: 1, value: "new value" },
			});
		});

		act(() => {
			result.current.setSelectedId.next(2);
		});

		await waitFor(() => {
			expect(result.current.selected).toMatchObject({
				kind: "value",
				value: { id: 2, value: "2" },
			});
		});

		act(() => {
			result.current.setSelectedId.next(null);
		});

		await waitFor(() => {
			expect(result.current.selected).toMatchObject({
				kind: "value",
				value: null,
			});
		});
	});
});

describe("test useOperator with useObservable and useObservableValue", () => {
	test("useOperator with useObservable should work", async () => {
		const operator = operators.map((value: number) => value * 2);
		const { result } = renderHook(
			() => {
				const [factor, setFactor] = useState(1);
				const [counter, setCounter] =
					useControllableObservable(observableCount);
				const doubledCounter = useObservable(observableCount, operator);

				return { counter, setCounter, doubledCounter, factor, setFactor };
			},
			{
				wrapper,
			},
		);

		await waitFor(() => {
			expect(result.current.counter).toMatchObject({ kind: "not-emitted" });
			expect(result.current.doubledCounter).toMatchObject({
				kind: "not-emitted",
			});
		});

		act(() => {
			result.current.setCounter.next(5);
		});

		await waitFor(() => {
			expect(result.current.counter).toMatchObject({ value: 5, kind: "value" });
			expect(result.current.doubledCounter).toMatchObject({
				value: 10,
				kind: "value",
			});
		});
	});

	test("useOperator with useObservable inline should work", async () => {
		const { result } = renderHook(
			() => {
				const [factor, setFactor] = useState(2);
				const operator = useMemo(
					() => operators.map((value: number) => value * factor),
					[factor],
				);

				const toStringOp = useMemo(
					() => operators.map((value: number) => value.toString()),
					[],
				);

				const [counter, setCounter] =
					useControllableObservable(observableCount);
				const doubledCounter = useObservable(
					observableCount,
					operator,
					toStringOp,
				);

				return { counter, setCounter, doubledCounter, factor, setFactor };
			},
			{
				wrapper,
			},
		);

		await waitFor(() => {
			expect(result.current.counter).toMatchObject({ kind: "not-emitted" });
			expect(result.current.doubledCounter).toMatchObject({
				kind: "not-emitted",
			});
		});

		act(() => {
			result.current.setFactor(3);
			result.current.setCounter.next(5);
		});

		await waitFor(() => {
			expect(result.current.doubledCounter).toMatchObject({
				value: "15",
				kind: "value",
			});
		});
	});
});
