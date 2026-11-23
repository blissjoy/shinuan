// TEAM-001 T4-R1 QA 獨立測試
// 預期值依據：docs/architecture/team-validation-smoke-test-spec.md §2～§8.1（以 Manager 派工附錄原文為準）
// 只使用 Node.js 內建 node:test 與 node:assert/strict（規格 §9.1、§11.1）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { add } from '../../.ai-team-smoke-test/add.mjs';
import * as mod from '../../.ai-team-smoke-test/add.mjs';

// 正向比對：typeof 必須為 'number'，且以 Object.is 語意比對（規格 §5）
function expectValue(actual, expected) {
  assert.strictEqual(typeof actual, 'number', `回傳型別應為 number，實際為 ${typeof actual}`);
  assert.strictEqual(actual, expected);
}

// 負向比對：assert.throws(fn, 建構子)，另外確認 err.instanceof 與 err.name（規格 §4.2、§5）
function expectThrow(fn, Ctor, name) {
  assert.throws(fn, Ctor);
  let threw = false;
  let caught;
  let returned;
  try {
    returned = fn();
  } catch (e) {
    threw = true;
    caught = e;
  }
  assert.ok(threw, `應同步丟出 ${name}，實際回傳 ${String(returned)}`);
  assert.ok(caught instanceof Ctor, `錯誤應為 ${name} 的實例`);
  assert.strictEqual(caught.name, name);
}

// ---- 介面案例（規格 §6.1）----
test('I-01 具名匯入 add 成功且 typeof add 為 function', () => {
  assert.strictEqual(typeof add, 'function');
});

test('I-02 模組命名空間的 default 為 undefined', () => {
  assert.strictEqual(mod.default, undefined);
});

test('I-03 Object.keys(mod) 完全等於 [\'add\']', () => {
  assert.deepStrictEqual(Object.keys(mod), ['add']);
});

// ---- 正向案例（規格 §6）----
test('P-01 add(1, 2) 回傳 3', () => {
  expectValue(add(1, 2), 3);
});

test('P-02 add(-5, 3) 回傳 -2', () => {
  expectValue(add(-5, 3), -2);
});

test('P-03 add(0, 0) 回傳 +0', () => {
  expectValue(add(0, 0), 0);
});

test('P-04 add(0.1, 0.2) 回傳 0.30000000000000004', () => {
  expectValue(add(0.1, 0.2), 0.30000000000000004);
});

test('P-05 add(-0, -0) 回傳 -0', () => {
  expectValue(add(-0, -0), -0);
});

test('P-06 add(-0, 0) 回傳 +0', () => {
  expectValue(add(-0, 0), 0);
});

test('P-07 add(1.5, -1.5) 回傳 +0', () => {
  expectValue(add(1.5, -1.5), 0);
});

test('P-08 add(Number.MAX_SAFE_INTEGER, 1) 回傳 9007199254740992', () => {
  expectValue(add(Number.MAX_SAFE_INTEGER, 1), 9007199254740992);
});

test('P-09 add(Number.MIN_VALUE, 0) 回傳 Number.MIN_VALUE (5e-324)', () => {
  expectValue(add(Number.MIN_VALUE, 0), 5e-324);
});

test('P-10 add(Number.MAX_VALUE, Number.MAX_VALUE) 回傳 Infinity', () => {
  expectValue(add(Number.MAX_VALUE, Number.MAX_VALUE), Infinity);
});

test('P-11 add(-Number.MAX_VALUE, -Number.MAX_VALUE) 回傳 -Infinity', () => {
  expectValue(add(-Number.MAX_VALUE, -Number.MAX_VALUE), -Infinity);
});

test('P-12 add(1, 2, 3) 回傳 3（第三個參數被忽略）', () => {
  expectValue(add(1, 2, 3), 3);
});

test('P-13 連續呼叫 add(1, 2) 三次皆回傳 3（確定性）', () => {
  const r1 = add(1, 2);
  const r2 = add(1, 2);
  const r3 = add(1, 2);
  expectValue(r1, 3);
  expectValue(r2, 3);
  expectValue(r3, 3);
});

// ---- 負向案例（規格 §7）----
test('N-01 add(\'1\', 2) 丟出 TypeError', () => {
  expectThrow(() => add('1', 2), TypeError, 'TypeError');
});

test('N-02 add(1, \'2\') 丟出 TypeError', () => {
  expectThrow(() => add(1, '2'), TypeError, 'TypeError');
});

test('N-03 add(true, 1) 丟出 TypeError', () => {
  expectThrow(() => add(true, 1), TypeError, 'TypeError');
});

test('N-04 add(null, 1) 丟出 TypeError', () => {
  expectThrow(() => add(null, 1), TypeError, 'TypeError');
});

test('N-05 add(1, undefined) 丟出 TypeError', () => {
  expectThrow(() => add(1, undefined), TypeError, 'TypeError');
});

test('N-06 add(1) 丟出 TypeError', () => {
  expectThrow(() => add(1), TypeError, 'TypeError');
});

test('N-07 add() 丟出 TypeError', () => {
  expectThrow(() => add(), TypeError, 'TypeError');
});

test('N-08 add(1n, 2) 丟出 TypeError', () => {
  expectThrow(() => add(1n, 2), TypeError, 'TypeError');
});

test('N-09 add(new Number(1), 2) 丟出 TypeError', () => {
  expectThrow(() => add(new Number(1), 2), TypeError, 'TypeError');
});

test('N-10 add([1], 2) 丟出 TypeError', () => {
  expectThrow(() => add([1], 2), TypeError, 'TypeError');
});

test('N-11 add({}, 1) 丟出 TypeError', () => {
  expectThrow(() => add({}, 1), TypeError, 'TypeError');
});

test('N-12 add(NaN, 1) 丟出 RangeError', () => {
  expectThrow(() => add(NaN, 1), RangeError, 'RangeError');
});

test('N-13 add(1, NaN) 丟出 RangeError', () => {
  expectThrow(() => add(1, NaN), RangeError, 'RangeError');
});

test('N-14 add(Infinity, 1) 丟出 RangeError', () => {
  expectThrow(() => add(Infinity, 1), RangeError, 'RangeError');
});

test('N-15 add(1, Infinity) 丟出 RangeError', () => {
  expectThrow(() => add(1, Infinity), RangeError, 'RangeError');
});

test('N-16 add(-Infinity, 1) 丟出 RangeError', () => {
  expectThrow(() => add(-Infinity, 1), RangeError, 'RangeError');
});

test('N-17 add(1, -Infinity) 丟出 RangeError', () => {
  expectThrow(() => add(1, -Infinity), RangeError, 'RangeError');
});

test('N-18 add(\'1\', NaN) 丟出 TypeError（驗證順序 a 先於 b）', () => {
  expectThrow(() => add('1', NaN), TypeError, 'TypeError');
});

test('N-19 add(NaN, \'1\') 丟出 RangeError（驗證順序 a 先於 b）', () => {
  expectThrow(() => add(NaN, '1'), RangeError, 'RangeError');
});

