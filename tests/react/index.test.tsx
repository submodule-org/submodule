import { renderHook, configure, waitFor, act } from "@testing-library/react";
import {
	applyPipes,
	combineObservables,
	operators,
	providePushObservable,
	value,
} from "../../src";
import {
	ScopeProvider,
	useObservable,
	usePushObservable,
	useResolve,
} from "../../src/react";
import type { PropsWithChildren } from "react";
import React, { Suspense, useState } from "react";
import "@testing-library/jest-dom";

configure({ reactStrictMode: true });

const stringvalue = value("hello");

const observableCount = providePushObservable<number>(0);

const listStream = providePushObservable([
	{ id: 1, value: "1" },
	{ id: 2, value: "2" },
	{ id: 3, value: "3" },
]);

const selectedIdStream = providePushObservable(null as null | number);

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

function useConstFn<I extends Array<unknown>, O>(
	value: (...params: I) => O,
): (...params: I) => O {
	const [v] = useState(() => value);
	return v;
}

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
				const [counter, setCounter] = usePushObservable(observableCount);

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
				const [selectedId, setSelectedId] = usePushObservable(selectedIdStream);
				const [list, setList] = usePushObservable(listStream);
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
