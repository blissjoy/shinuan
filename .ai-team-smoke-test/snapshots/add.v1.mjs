/**
 * TEAM-001 能力驗證受測模組（非產品程式碼）。
 * 規格：docs/architecture/team-validation-smoke-test-spec.md
 */

/**
 * 驗證單一參數。
 * @param {unknown} x
 * @param {string} label
 */
function assertValidOperand(x, label) {
  if (typeof x !== 'number') {
    throw new TypeError(`${label} must be a number`);
  }
  if (Number.isNaN(x)) {
    throw new RangeError(`${label} must be a finite number`);
  }
}

/**
 * 回傳兩個有限數值相加的結果。
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function add(a, b) {
  assertValidOperand(a, 'a');
  assertValidOperand(b, 'b');
  return a + b;
}

