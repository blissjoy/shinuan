/**
 * 位元組 → 文字 → JSON 之嚴格解碼（內部共用：loader 與 CLI）。
 *
 * fail-closed：UTF-8 BOM、非法 UTF-8 一律拒絕（`INVALID_ENCODING`），JSON 語法錯誤回報 `INVALID_JSON`。
 */
import type { ValidationResult } from './types';

/** 嚴格 UTF-8（無 BOM）解碼。 */
export function decodeUtf8Text(bytes: Uint8Array, file: string): ValidationResult<string> {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return {
      ok: false,
      errors: [{ file, path: '$', code: 'INVALID_ENCODING', message: 'File must be UTF-8 without BOM.' }],
    };
  }
  try {
    return { ok: true, data: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return {
      ok: false,
      errors: [{ file, path: '$', code: 'INVALID_ENCODING', message: 'File is not valid UTF-8.' }],
    };
  }
}

/** 嚴格 UTF-8 解碼後以 `JSON.parse` 解析。 */
export function parseJsonBytes(bytes: Uint8Array, file: string): ValidationResult<unknown> {
  const text = decodeUtf8Text(bytes, file);
  if (!text.ok) return text;
  try {
    return { ok: true, data: JSON.parse(text.data) as unknown };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [{ file, path: '$', code: 'INVALID_JSON', message: `Invalid JSON: ${detail}` }] };
  }
}
