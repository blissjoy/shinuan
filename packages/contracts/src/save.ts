/**
 * 存檔與每日上限契約（Master PRD v2.1.29 §0、§8.C.3、§8.E.1）。
 *
 * 本檔只定義存檔結構型別；v1 -> v2 遷移邏輯屬後續任務（S3-02），不在本套件實作。
 */

import type { ItemId } from './catalog';
import type { PetGenetics } from './genetics';
import type { LowMoodDuration, PetState } from './pet';

/** 目前存檔 Schema 版本（PRD §8.E.1）。 */
export const CURRENT_SCHEMA_VERSION = 2 as const;

/** 依裝置本地日期記錄之當日領取上限與已探索商品清單（PRD §0、§8.C.3）。 */
export interface DailyLimits {
  /** 本地日期 YYYY-MM-DD。 */
  readonly localDate: string;
  /** 最後一次領取每日簽到之本地日期 YYYY-MM-DD。 */
  readonly lastClaimedLocalDate: string | null;
  /** 最後一次領取每日簽到之 Unix 時間戳 (ms)。 */
  readonly lastClaimedTimestamp: number | null;
  /** 最後活躍本地日期 YYYY-MM-DD（跨日結算判定用）。 */
  readonly lastActiveLocalDate: string;
  readonly claimedRewardIds: readonly string[];
  readonly exploredProductIds: readonly ItemId[];
  readonly shopOpenedToday: boolean;
  readonly explorationCoinsEarned: number;
  readonly interactionCoinsEarned: number;
  readonly dailyHighHealthRewardClaimed: boolean;
}

/** 完整存檔狀態（schemaVersion 2）。 */
export interface GameState {
  readonly schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  readonly gameCoreVersion: string;
  readonly pet: PetState;
  readonly dailyLimits: DailyLimits;
}

// ---------------------------------------------------------------------------
// Legacy v1（預留給 S3-02 v1 -> v2 遷移）
// ---------------------------------------------------------------------------

/** v2 於 PetGenetics 新增、v1 可能缺少之欄位。 */
export const V2_ADDED_GENETICS_FIELDS = Object.freeze(['fatherPetId', 'motherPetId'] as const);

/** v2 於 PetState 新增、v1 可能缺少之欄位（PRD §8.E.1 第 4 點）。 */
export const V2_ADDED_PET_STATE_FIELDS = Object.freeze([
  'microchipId',
  'recoveryBoostAccumulatedHours',
  'lowMoodDuration',
  'isCarePaused',
] as const);

type V2AddedGeneticsField = (typeof V2_ADDED_GENETICS_FIELDS)[number];
type V2AddedPetStateField = (typeof V2_ADDED_PET_STATE_FIELDS)[number];

/** v1 遺傳資料：允許缺少 fatherPetId / motherPetId。 */
export type LegacyPetGeneticsV1 = Omit<PetGenetics, V2AddedGeneticsField> & {
  readonly fatherPetId?: string | null;
  readonly motherPetId?: string | null;
};

/** v1 寵物狀態：允許缺少 v2 新增欄位。 */
export type LegacyPetStateV1 = Omit<PetState, V2AddedPetStateField | 'genetics'> & {
  readonly genetics: LegacyPetGeneticsV1;
  readonly microchipId?: string | null;
  readonly recoveryBoostAccumulatedHours?: number;
  readonly lowMoodDuration?: LowMoodDuration;
  readonly isCarePaused?: boolean;
};

/** schemaVersion 1 舊存檔。 */
export interface LegacyGameStateV1 {
  readonly schemaVersion: 1;
  readonly gameCoreVersion: string;
  readonly pet: LegacyPetStateV1;
  readonly dailyLimits: DailyLimits;
}
