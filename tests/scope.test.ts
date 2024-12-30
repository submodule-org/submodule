import { describe, expect, test, vi } from "vitest";
import { createScope, value, create, provide, map, scoper, } from "../src";

describe('scope', () => {
	const seed = value(5);
	const sourceMod = map(seed, (seed) => {
		let _seed = seed;
		return {
			plus: () => { _seed = _seed + 1; },
			get i() {
				return _seed;
			}
		};
	});

	const combineSourceMod = map({ seed, sourceMod }, (v) => v);

	test('scopes are isolated', async () => {
		const scope1 = createScope();
		const scope2 = createScope();
		const source1 = await scope1.resolve(sourceMod);
		expect(source1.i).toBe(5);
		source1.plus();
		expect(source1.i).toBe(6);
		const source2 = await scope2.resolve(sourceMod);
		expect(source2.i).toBe(5);
		source2.plus();
		expect(source2.i).toBe(6);
		expect(source1.i).toBe(6);
	});

	test('scope can be reset', async () => {
		const scope = createScope();
		let source = await scope.resolve(sourceMod);
		source.plus();
		expect(source.i).toBe(6);
		scope.dispose();
		source = await scope.resolve(sourceMod);
		expect(source.i).toBe(5);
	});

	test('scope can be hijacked', async () => {
		const scope = createScope();
		scope.set(seed, value(5));
		const source = await scope.resolve(sourceMod);
		expect(source.i).toBe(5);
		source.plus();
		expect(source.i).toBe(6);
	});

	test('scope can be combined', async () => {
		const parentScope = createScope();
		const childScope = createScope();
		let seed = 0;
		const plus = provide(() => { seed = seed + 1; return seed; });
		await parentScope.resolve(plus);
		expect(seed).toBe(1);
		const combinedScope = createScope(parentScope, childScope);
		await combinedScope.resolve(plus);
		expect(seed).toBe(1);
		expect(combinedScope.has(plus)).toBe(true);
		const reversedCombinedScope = createScope(childScope, parentScope);
		await reversedCombinedScope.resolve(plus);
		expect(seed).toBe(1);
		expect(childScope.has(plus)).toBe(false);
		await combinedScope.dispose();
		expect(combinedScope.has(plus)).toBe(true);
	});

	test('scope should return the same promise', async () => {
		const value = provide(() => 5);
		const scope = createScope()

		const p1 = scope.resolve(value)
		const p2 = scope.resolve(value)

		expect(p1 === p2).toBe(true)
	})

});

describe('scope lifecycle', () => {
	test('scope can be disposed', async () => {
		const v = provide(() => 5)
		const fn = vi.fn()

		const scope = createScope();
		await scope.resolve(v);
		expect(scope.has(v)).toBe(true);

		await scope.dispose();
		expect(scope.has(v)).toBe(false);

		// defer happened on dispose
		const def = map(scoper, scoper => {
			scoper.addDefer(fn)
			scoper.addOnResolves({
				filter: () => true,
				cb: fn
			})
		})

		const scope2 = createScope();
		await scope2.resolve(def);
		expect(fn).toBeCalledTimes(1)

		await scope2.dispose();
		expect(fn).toBeCalledTimes(2)
	})

})

describe('usage of preferred scope', () => {
	test('preferred scope will change the way its used', async () => {
		const intValue = provide(() => 5)
		const scope1 = createScope()

		const combinedValue = map({ intValue }, ({ intValue }) => String(intValue))
		combinedValue.perferredScope = scope1

		intValue.perferredScope = scope1

		const scope2 = createScope(scope1)

		await scope2.resolve(intValue)
		await scope2.resolve(combinedValue)

		expect(scope1.has(intValue, true)).toBe(true)
		expect(scope1.has(combinedValue, true)).toBe(true)

		expect(scope2.has(intValue, true)).toBe(false)
		expect(scope2.has(combinedValue, true)).toBe(false)

		await scope2.dispose()
		expect(scope1.has(intValue)).toBe(true)
	})

	test('can resolve even when the preferered scope is not in the list', async () => {
		const scope1 = createScope()
		const scope2 = createScope()

		const intValue = provide(() => 5)
		intValue.perferredScope = scope1

		await scope2.resolve(intValue)

		expect(scope1.has(intValue)).toBe(false)
		expect(scope2.has(intValue)).toBe(true)
	})
})