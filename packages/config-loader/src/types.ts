/**
 * @shinuan/config-loader 公開型別（S1-02 設計 §4.1、§4.3）。
 */
import type { ValidatedGameConfig } from '@shinuan/contracts';

/** 單筆驗證錯誤（零例外拋出設計，所有錯誤以資料回傳）。 */
export interface ConfigValidationError {
  /** 來源檔案或邏輯來源標籤（如 `genetics/breeds.v1.json`）。 */
  readonly file: string;
  /** 以 `$` 為根之 JSON 路徑（如 `$.breeds[0].id`）。 */
  readonly path: string;
  /** `UPPER_SNAKE_CASE` 錯誤碼。 */
  readonly code: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly errors: readonly ConfigValidationError[] };

export interface LoadGameConfigOptions {
  /** 專案 content 根目錄路徑（讀取 genetics/、traits/、products/ 子目錄）。 */
  readonly contentDir: string;
  /** 驗證或讀檔失敗時是否降級使用內建已驗證預設設定（預設 false：嚴格失敗）。 */
  readonly allowFallback?: boolean;
}

export type LoadGameConfigResult =
  | { readonly ok: true; readonly config: ValidatedGameConfig; readonly source: 'content' }
  | {
      readonly ok: true;
      readonly config: ValidatedGameConfig;
      readonly source: 'fallback';
      readonly fallbackReason: readonly ConfigValidationError[];
    }
  | { readonly ok: false; readonly errors: readonly ConfigValidationError[] };
