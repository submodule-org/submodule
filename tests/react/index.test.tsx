import { renderHook, configure, waitFor, act } from "@testing-library/react";
import { combineObservables, provideObservable } from "../../src";
import {
	ScopeProvider,
	useObservable,
	useResolve,
	useTransformedObservable,
	useTransformFn,
} from "../../src/react";
import type { PropsWithChildren } from "react";
import React, { Suspense } from "react";
import "@testing-library/jest-dom";

configure({ reactStrictMode: true });

const [count, setCount] = provideObservable(0);
const [list, setList] = provideObservable([
	{ id: 1, value: "1" },
	{ id: 2, value: "2" },
	{ id: 3, value: "3" },
]);
const [selectedId, setSelectedId] = provideObservable(
	undefined as number | undefined,
);

const combinedSelectedIdAndList = combineObservables({ list, selectedId });

const selectedItemStream = combineObservables(
	{ list, selectedId },
	({ list, selectedId }) => list.find((item) => item.id === selectedId),
	undefined,
);

const wrapper = ({ children }: PropsWithChildren) => (
	<ScopeProvider>
		<Suspense>{children}</Suspense>
	</ScopeProvider>
);

test("render observable", async () => {
	const { result } = renderHook(
		() => {
			const counter = useObservable(count);
			const controller = useResolve(setCount);

			return { counter, controller } as const;
		},
		{ wrapper },
	);

	await waitFor(() => {
		expect(result.current.counter).toBe(0);
	});

	await waitFor(() => {
		act(() => {
			result.current.controller(1);
		});

		expect(result.current.counter).toBe(1);
	});
});

test("render transformed observable", async () => {
	const { result, rerender } = renderHook(
		() => {
			const selectedItem = useTransformedObservable(
				combinedSelectedIdAndList,
				({ list, selectedId }) => list.find((item) => item.id === selectedId),

				undefined,
			);
			const controller = useResolve(setSelectedId);

			return { selectedItem, controller } as const;
		},
		{ wrapper },
	);

	await waitFor(() => {
		expect(result.current.selectedItem).toBe(undefined);
	});

	await waitFor(() => {
		act(() => {
			result.current.controller(1);
		});

		expect(result.current.selectedItem).toStrictEqual({ id: 1, value: "1" });
	});

	act(() => {
		rerender();
	});

	await waitFor(() => {
		expect(result.current.selectedItem).toStrictEqual({ id: 1, value: "1" });
	});
});

test("render combines", async () => {
	const { result } = renderHook(
		() => {
			const selectedItem = useObservable(selectedItemStream);
			const changeSelectedId = useResolve(setSelectedId);
			const changeList = useResolve(setList);

			return { selectedItem, changeSelectedId, changeList } as const;
		},
		{ wrapper },
	);

	await waitFor(() => {
		expect(result.current).toBeDefined();
		expect(result.current.selectedItem).toEqual(undefined);
	});

	act(() => {
		result.current.changeSelectedId(2);
	});

	await waitFor(() => {
		expect(result.current.selectedItem).toEqual({ id: 2, value: "2" });
	});

	act(() => {
		result.current.changeList([
			{ id: 1, value: "1" },
			{ id: 2, value: "3" },
		]);
	});

	await waitFor(() => {
		expect(result.current.selectedItem).toEqual({ id: 2, value: "3" });
	});

	act(() => {
		result.current.changeList([{ id: 1, value: "1" }]);
	});

	await waitFor(() => {
		expect(result.current.selectedItem).toEqual(undefined);
	});
});
