// TEAM-001 Developer 開發測試（node:test + node:assert）。
// 規格：docs/architecture/team-validation-smoke-test-spec.md 第 6、7 節。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { add } from './add.mjs';
import * as mod from './add.mjs';

function expectValue(actual, expected) {
  assert.equal(typeof actual, 'number');
  assert.strictEqual(actual, expected);
}

function expectThrow(fn, Ctor) {
  let caught;
  assert.throws(() => {
    try {
      fn();
    } catch (err) {
      caught = err;
      throw err;
    }
  }, Ctor);
  assert.ok(caught instanceof Ctor);
  assert.strictEqual(caught.name, Ctor.name);
}

// 6.1 介面案例
test('I-01 具名匯出 add 為函式', () => {
  assert.strictEqual(typeof add, 'function');
});
test('I-02 沒有預設匯出', () => {
  assert.strictEqual(mod.default, undefined);
});
test('I-03 匯出項目只有 add', () => {
  assert.deepStrictEqual(Object.keys(mod), ['add']);
});

// 6 正向案例
test('P-01 add(1, 2) 回傳 3', () => expectValue(add(1, 2), 3));
test('P-02 add(-5, 3) 回傳 -2', () => expectValue(add(-5, 3), -2));
test('P-03 add(0, 0) 回傳 +0', () => expectValue(add(0, 0), 0));
test('P-04 add(0.1, 0.2) 回傳 0.30000000000000004', () =>
  expectValue(add(0.1, 0.2), 0.30000000000000004));
test('P-05 add(-0, -0) 回傳 -0', () => expectValue(add(-0, -0), -0));
test('P-06 add(-0, 0) 回傳 +0', () => expectValue(add(-0, 0), 0));
test('P-07 add(1.5, -1.5) 回傳 +0', () => expectValue(add(1.5, -1.5), 0));
test('P-08 add(Number.MAX_SAFE_INTEGER, 1) 回傳 9007199254740992', () =>
  expectValue(add(Number.MAX_SAFE_INTEGER, 1), 9007199254740992));
test('P-09 add(Number.MIN_VALUE, 0) 回傳 Number.MIN_VALUE', () =>
  expectValue(add(Number.MIN_VALUE, 0), Number.MIN_VALUE));
test('P-10 add(Number.MAX_VALUE, Number.MAX_VALUE) 回傳 Infinity', () =>
  expectValue(add(Number.MAX_VALUE, Number.MAX_VALUE), Infinity));
test('P-11 add(-Number.MAX_VALUE, -Number.MAX_VALUE) 回傳 -Infinity', () =>
  expectValue(add(-Number.MAX_VALUE, -Number.MAX_VALUE), -Infinity));
test('P-12 add(1, 2, 3) 回傳 3', () => expectValue(add(1, 2, 3), 3));
test('P-13 連續呼叫 add(1, 2) 三次皆為 3', () => {
  expectValue(add(1, 2), 3);
  expectValue(add(1, 2), 3);
  expectValue(add(1, 2), 3);
});

// 7 負向案例
test("N-01 add('1', 2) 丟出 TypeError", () => expectThrow(() => add('1', 2), TypeError));
test("N-02 add(1, '2') 丟出 TypeError", () => expectThrow(() => add(1, '2'), TypeError));
test('N-03 add(true, 1) 丟出 TypeError', () => expectThrow(() => add(true, 1), TypeError));
test('N-04 add(null, 1) 丟出 TypeError', () => expectThrow(() => add(null, 1), TypeError));
test('N-05 add(1, undefined) 丟出 TypeError', () =>
  expectThrow(() => add(1, undefined), TypeError));
test('N-06 add(1) 丟出 TypeError', () => expectThrow(() => add(1), TypeError));
test('N-07 add() 丟出 TypeError', () => expectThrow(() => add(), TypeError));
test('N-08 add(1n, 2) 丟出 TypeError', () => expectThrow(() => add(1n, 2), TypeError));
test('N-09 add(new Number(1), 2) 丟出 TypeError', () =>
  expectThrow(() => add(new Number(1), 2), TypeError));
test('N-10 add([1], 2) 丟出 TypeError', () => expectThrow(() => add([1], 2), TypeError));
test('N-11 add({}, 1) 丟出 TypeError', () => expectThrow(() => add({}, 1), TypeError));
test('N-12 add(NaN, 1) 丟出 RangeError', () => expectThrow(() => add(NaN, 1), RangeError));
test('N-13 add(1, NaN) 丟出 RangeError', () => expectThrow(() => add(1, NaN), RangeError));
test('N-14 add(Infinity, 1) 丟出 RangeError', () =>
  expectThrow(() => add(Infinity, 1), RangeError));
test('N-15 add(1, Infinity) 丟出 RangeError', () =>
  expectThrow(() => add(1, Infinity), RangeError));
test('N-16 add(-Infinity, 1) 丟出 RangeError', () =>
  expectThrow(() => add(-Infinity, 1), RangeError));
test('N-17 add(1, -Infinity) 丟出 RangeError', () =>
  expectThrow(() => add(1, -Infinity), RangeError));
test("N-18 add('1', NaN) 丟出 TypeError", () =>
  expectThrow(() => add('1', NaN), TypeError));
test("N-19 add(NaN, '1') 丟出 RangeError", () =>
  expectThrow(() => add(NaN, '1'), RangeError));

