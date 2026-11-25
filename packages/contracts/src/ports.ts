/**
 * 外部注入介面契約（Master PRD v2.1.29 §0、§5.1、§8.E.1）。
 *
 * Game Core 不得直接呼叫 Date.now()、Math.random() 或依賴執行環境時區／檔案系統，
 * 一律透過以下介面由外部注入。
 */

import type { GameState } from './save';

/** 時間與時區來源。 */
export interface Clock {
  /** 目前 Unix 時間戳 (ms)。 */
  now(): number;
  /** 目前本地時區偏移（分鐘）。 */
  getTimezoneOffsetMinutes(): number;
}

/** 確定性偽隨機數產生器。 */
export interface RandomGenerator {
  /** 回傳 [0, 1) 區間之數值。 */
  next(): number;
}

/** 存檔讀寫介面（由平台 Adapter 實作）。 */
export interface GameRepository {
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
}
