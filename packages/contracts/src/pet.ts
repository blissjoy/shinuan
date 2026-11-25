/**
 * 寵物狀態、人格、小怪癖、記憶與健康契約（Master PRD v2.1.29 §0、§3.1、§3.2、§8.A.1、§8.B.2）。
 *
 * 本檔只定義型別與 PRD 原文列舉常數，不含需求衰退、健康救援、人格重算等任何計算邏輯。
 */

import type { FoodCategory, ItemId } from './catalog';
import type { PetGenetics } from './genetics';

/** 外觀成長階段（PRD §3.1 第 5 點；MVP 固定為 "adult"）。 */
export const GROWTH_STAGES = Object.freeze(['kitten', 'young', 'adult', 'senior'] as const);
export type GrowthStage = (typeof GROWTH_STAGES)[number];

/** 基礎人格數值（範圍 0~100）。 */
export interface BasePersonality {
  readonly affection: number;
  readonly laziness: number;
  readonly tsundere: number;
  readonly curiosity: number;
}

// ---------------------------------------------------------------------------
// 小怪癖（PRD §3.2 第二層、§8.B.2 第 3 點）
// ---------------------------------------------------------------------------

/** Phase A MVP 小怪癖白名單（共 4 款）。 */
export const MVP_QUIRK_IDS = Object.freeze([
  'cursor_hunter',
  'sun_bather',
  'treat_lover',
  'shy_observer',
] as const);
export type QuirkId = (typeof MVP_QUIRK_IDS)[number];

export const QUIRK_MODIFIER_TYPES = Object.freeze([
  'additiveProbabilityModifier',
  'multiplicativeWeightModifier',
] as const);
export type QuirkModifierType = (typeof QUIRK_MODIFIER_TYPES)[number];

export interface QuirkDefinition {
  readonly id: QuirkId;
  readonly name: string;
  readonly modifierType: QuirkModifierType;
  readonly value: number;
  readonly targetBehavior: string;
}

// ---------------------------------------------------------------------------
// 記憶（PRD §8.A.1 `memories`）
// ---------------------------------------------------------------------------

export interface DailyMemoryBucket {
  readonly pets: number;
  readonly plays: number;
  readonly wetFoods: number;
  readonly premiumFoods: number;
  readonly totalInteractions: number;
}

export interface PetMemories {
  readonly totalPets: number;
  readonly totalPlays: number;
  readonly foodCategoryCounts: Readonly<Partial<Record<FoodCategory, number>>>;
  /** 以本地日期 YYYY-MM-DD 為鍵，保留最近 30 個本地日期。 */
  readonly dailyBuckets: Readonly<Record<string, DailyMemoryBucket>>;
}

// ---------------------------------------------------------------------------
// 需求、健康與救援狀態（PRD §0、§8.A.1）
// ---------------------------------------------------------------------------

/** 即時需求數值（嚴格限制 0~100）。 */
export interface PetNeeds {
  readonly hunger: number;
  readonly hydration: number;
  readonly mood: number;
}

/** 健康救援狀態機狀態枚舉。 */
export const RECOVERY_STATES = Object.freeze([
  'NORMAL',
  'CRITICAL',
  'RECOVERY_BOOST',
  'NATURAL_RECOVERY',
] as const);
export type RecoveryState = (typeof RECOVERY_STATES)[number];

/** 連續低心情持續時間（小時）。 */
export interface LowMoodDuration {
  readonly below40Hours: number;
  readonly below20Hours: number;
}

// ---------------------------------------------------------------------------
// PetState（PRD §8.A.1 第 2 點）
// ---------------------------------------------------------------------------

export interface PetState {
  readonly id: string;
  readonly name: string;
  readonly microchipId: string | null;
  readonly ageInDays: number;
  readonly growthStage: GrowthStage;
  readonly genetics: PetGenetics;
  readonly basePersonality: BasePersonality;
  /** 最多 2 個。 */
  readonly quirks: readonly QuirkId[];
  readonly memories: PetMemories;
  readonly needs: PetNeeds;
  /** 嚴格限制 10~100。 */
  readonly health: number;
  readonly recoveryState: RecoveryState;
  /** 上限 2.0 小時。 */
  readonly recoveryBoostAccumulatedHours: number;
  readonly lowMoodDuration: LowMoodDuration;
  readonly isCarePaused: boolean;
  /** 不得為負數。 */
  readonly coins: number;
  readonly inventory: Readonly<Record<ItemId, number>>;
  /** 最後模擬結算 Unix 時間戳 (ms)，時間單一權威來源。 */
  readonly lastSimulatedAt: number;
}
