/**
 * 驗證器共用工具（內部模組）。
 *
 * 所有檢查皆以「收集錯誤、不拋例外」方式進行；未定義之多餘欄位一律回報 `UNKNOWN_FIELD`
 * （S1-02 設計 §4.5 第 1 點），未明列之異常輸入一律 fail-closed（§4.5 第 7 點）。
 */
import type { ConfigValidationError, ValidationResult } from '../types';

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** 錯誤收集器：綁定單一來源檔案標籤。 */
export class ErrorCollector {
  readonly errors: ConfigValidationError[] = [];

  constructor(readonly file: string) {}

  add(path: string, code: string, message: string): void {
    this.errors.push({ file: this.file, path, code, message });
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }
}

export function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  return typeof value;
}

/** 僅接受一般物件（原型為 Object.prototype 或 null），排除陣列、類別實例等。 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 檢查物件結構：必須為一般物件、只含 `keys` 所列欄位且全部存在（值為 undefined 視同缺漏）。
 * 只要是一般物件即回傳該物件（即使有缺漏或多餘欄位），供呼叫端繼續檢查既有欄位。
 */
export function expectObject(
  c: ErrorCollector,
  value: unknown,
  path: string,
  keys: readonly string[],
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined; // 缺漏已由上層回報 MISSING_FIELD
  if (!isPlainObject(value)) {
    c.add(path, 'INVALID_TYPE', `Expected object but got ${describeValue(value)}.`);
    return undefined;
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      c.add(`${path}.${key}`, 'UNKNOWN_FIELD', `Unknown field "${key}" is not allowed.`);
    }
  }
  for (const key of keys) {
    if (value[key] === undefined) {
      c.add(`${path}.${key}`, 'MISSING_FIELD', `Required field "${key}" is missing.`);
    }
  }
  return value;
}

/**
 * 允許部分欄位之物件（用於相容規則 when/set）：只檢查型別與未知欄位。
 * 允許之鍵若「存在但值為 undefined」（如 `{ head: undefined }`）一律回報 `INVALID_TYPE`，
 * 不得視同未提供而靜默略過（S1-02B DEF-01）。
 */
export function expectPartialObject(
  c: ErrorCollector,
  value: unknown,
  path: string,
  keys: readonly string[],
): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    c.add(path, 'INVALID_TYPE', `Expected object but got ${describeValue(value)}.`);
    return undefined;
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      c.add(`${path}.${key}`, 'UNKNOWN_FIELD', `Unknown field "${key}" is not allowed.`);
    } else if (value[key] === undefined) {
      c.add(`${path}.${key}`, 'INVALID_TYPE', `Field "${key}" must not be explicitly undefined.`);
    }
  }
  return value;
}

/**
 * 頂層輸入為 `undefined` 時回報 `$` 之 `INVALID_TYPE` 並回傳 true（呼叫端應立即結束驗證）。
 * 用於各 `validateXxxConfig`，避免依賴 `expectObject` 對 `undefined` 之靜默略過（S1-02B DEF-01）。
 */
export function rejectUndefinedRoot(c: ErrorCollector, input: unknown): boolean {
  if (input !== undefined) return false;
  c.add('$', 'INVALID_TYPE', 'Expected object but got undefined.');
  return true;
}

/**
 * 以索引式走訪陣列（含稀疏陣列空洞）：
 * 空洞（`!(i in arr)`）或值為 `undefined` 之元素一律回報 `${basePath}[i]` 之 `INVALID_TYPE` 且不呼叫 `visit`；
 * 其餘元素依序呼叫 `visit(value, index, path)`。回傳是否所有元素皆存在且非 `undefined`（S1-02B DEF-01／OBS-01）。
 */
export function forEachArrayElement(
  c: ErrorCollector,
  arr: readonly unknown[],
  basePath: string,
  visit: (value: unknown, index: number, path: string) => void,
): boolean {
  let allPresent = true;
  for (let i = 0; i < arr.length; i += 1) {
    const path = `${basePath}[${i}]`;
    if (!(i in arr) || arr[i] === undefined) {
      c.add(path, 'INVALID_TYPE', !(i in arr) ? 'Sparse array hole is not allowed.' : 'Expected a value but got undefined.');
      allPresent = false;
      continue;
    }
    visit(arr[i], i, path);
  }
  return allPresent;
}

export function expectArray(c: ErrorCollector, value: unknown, path: string): readonly unknown[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    c.add(path, 'INVALID_TYPE', `Expected array but got ${describeValue(value)}.`);
    return undefined;
  }
  return value;
}

/** 字串檢查；`nonEmpty` 時去除前後空白後不得為空（回報 `EMPTY_STRING`）。 */
export function expectString(
  c: ErrorCollector,
  value: unknown,
  path: string,
  options: { readonly nonEmpty?: boolean } = {},
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    c.add(path, 'INVALID_TYPE', `Expected string but got ${describeValue(value)}.`);
    return undefined;
  }
  if (options.nonEmpty === true && value.trim() === '') {
    c.add(path, 'EMPTY_STRING', 'Value must be a non-empty string.');
    return undefined;
  }
  return value;
}

/** `string | null` 檢查；回傳 `null`、字串或 `undefined`（型別錯誤）。 */
export function expectNullableString(
  c: ErrorCollector,
  value: unknown,
  path: string,
  options: { readonly nonEmpty?: boolean } = {},
): string | null | undefined {
  if (value === null) return null;
  return expectString(c, value, path, options);
}

/** 有限數值檢查（拒絕 NaN / Infinity）。 */
export function expectFiniteNumber(c: ErrorCollector, value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number') {
    c.add(path, 'INVALID_TYPE', `Expected number but got ${describeValue(value)}.`);
    return undefined;
  }
  if (!Number.isFinite(value)) {
    c.add(path, 'NOT_FINITE_NUMBER', `Expected a finite number but got ${String(value)}.`);
    return undefined;
  }
  return value;
}

export function expectEnum<T extends string>(
  c: ErrorCollector,
  value: unknown,
  path: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    c.add(path, 'INVALID_TYPE', `Expected string but got ${describeValue(value)}.`);
    return undefined;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    c.add(path, 'INVALID_ENUM_VALUE', `"${value}" is not one of: ${allowed.join(', ')}.`);
    return undefined;
  }
  return value as T;
}

export function expectHex(c: ErrorCollector, value: unknown, path: string): string | undefined {
  const s = expectString(c, value, path);
  if (s === undefined) return undefined;
  if (!HEX_COLOR_PATTERN.test(s)) {
    c.add(path, 'INVALID_HEX_COLOR', `"${s}" is not a #RRGGBB hex color.`);
    return undefined;
  }
  return s;
}

/** 共通 `version` 檢查：非空字串（設計 §4.2）。 */
export function checkVersion(c: ErrorCollector, value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value !== 'string' || value.trim() === '') {
    c.add(path, 'INVALID_VERSION', 'version must be a non-empty string.');
  }
}

// ---------------------------------------------------------------------------
// 日期與時間格式
// ---------------------------------------------------------------------------

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 有效 `YYYY-MM-DD` 日曆日期。 */
export function isValidIsoDate(value: string): boolean {
  const m = DATE_PATTERN.exec(value);
  if (m === null) return false;
  return isValidCalendarDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/;

/**
 * 有效完整 ISO-8601 時間戳：日期、`T`、時分秒、可選小數秒、時區 `Z` 或 `±HH:MM`；
 * 日曆日期須有效，時 00–23、分 00–59、秒 00–59（不接受閏秒 60），偏移時 00–23、分 00–59。
 */
export function isValidIsoTimestamp(value: string): boolean {
  const m = TIMESTAMP_PATTERN.exec(value);
  if (m === null) return false;
  if (!isValidCalendarDate(Number(m[1]), Number(m[2]), Number(m[3]))) return false;
  if (Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6]) > 59) return false;
  if (m[8] !== 'Z' && (Number(m[10]) > 23 || Number(m[11]) > 59)) return false;
  return true;
}

/** `http://` 或 `https://` 開頭且可解析、具主機名稱之 URL。 */
export function isValidHttpUrl(value: string): boolean {
  if (!/^https?:\/\//.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 結果封裝
// ---------------------------------------------------------------------------

/** 遞迴凍結（回傳之驗證後資料一律不可變）。 */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

/** 驗證通過時回傳深複製且深凍結之資料，避免呼叫端後續修改來源物件影響已驗證設定。 */
export function finish<T>(c: ErrorCollector, input: unknown): ValidationResult<T> {
  if (c.hasErrors) return { ok: false, errors: [...c.errors] };
  return { ok: true, data: deepFreeze(structuredClone(input) as T) };
}
