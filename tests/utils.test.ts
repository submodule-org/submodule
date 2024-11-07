import { describe, expect, it } from 'vitest';
import { sortedStringifyKeyBuilder } from '../src/index';

describe('sortedStringifyKeyBuilder', () => {
  it('should stringify primitive values correctly', () => {
    expect(sortedStringifyKeyBuilder(42)).toBe('42');
    expect(sortedStringifyKeyBuilder('test')).toBe('"test"');
    expect(sortedStringifyKeyBuilder(null)).toBe('null');
    expect(sortedStringifyKeyBuilder(true)).toBe('true');
  });

  it('should stringify objects with sorted keys', () => {
    const obj = { b: 2, a: 1 };
    expect(sortedStringifyKeyBuilder(obj)).toBe('{"a":1,"b":2}');
  });

  it('should handle nested objects correctly', () => {
    const obj = { b: { d: 4, c: 3 }, a: 1 };
    expect(sortedStringifyKeyBuilder(obj)).toBe('{"a":1,"b":{"c":3,"d":4}}');
  });

  it('should handle objects with id property correctly', () => {
    const obj = { id: 123, name: 'test' };
    expect(sortedStringifyKeyBuilder(obj)).toBe('123');
  });

  it('should handle arrays correctly', () => {
    const arr = [1, 2, 3];
    expect(sortedStringifyKeyBuilder(arr)).toBe('[1,2,3]');
  });

  it('should handle complex nested structures', () => {
    const obj = { b: { d: [4, 5], c: 3 }, a: 1 };
    expect(sortedStringifyKeyBuilder(obj)).toBe('{"a":1,"b":{"c":3,"d":[4,5]}}');
  });

  it('should handle arrays of objects correctly', () => {
    const arr = [{ b: 2, a: 1 }, { d: 4, c: 3 }];
    expect(sortedStringifyKeyBuilder(arr)).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });

  it('should handle objects with id property as a symbol correctly', () => {
    const symbolId = Symbol('id');
    const obj = { id: symbolId, name: 'test' };
    expect(sortedStringifyKeyBuilder(obj)).toBe("Symbol(id)");
  });

  it('should handle functions correctly', () => {
    const func = function testFunc() { return 'test'; };
    expect(sortedStringifyKeyBuilder(func)).toBe(func.toString());
  });
});
