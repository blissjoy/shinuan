/**
 * 行為決策與呈現識別碼契約（Master PRD v2.1.29 §0、§4.3、§8.B.1、§8.B.3）。
 *
 * 本檔只定義型別與 PRD 原文列舉常數，不含 BehaviorEngine 仲裁邏輯。
 */

// ---------------------------------------------------------------------------
// AnimationId（PRD §8.B.3 唯一 15 支正式清單，不設別名）
// ---------------------------------------------------------------------------

/** Phase B 必備核心動畫（P0-B，共 6 支）。 */
export const P0_B_ANIMATION_IDS = Object.freeze([
  'idle',
  'walk',
  'sit',
  'sleep',
  'eat',
  'pet',
] as const);

/** Phase C 必備核心動畫（P0-C，共 2 支）。 */
export const P0_C_ANIMATION_IDS = Object.freeze(['cat_loaf', 'play'] as const);

/** Phase C 進階體驗動畫（P1，共 7 支）。 */
export const P1_ANIMATION_IDS = Object.freeze([
  'drag',
  'drop',
  'landing',
  'turn_back_angry',
  'sniff_and_turn_away',
  'crouch_alert',
  'side_sleep',
] as const);

/** 全部 15 支正式 AnimationId（P0-B ➔ P0-C ➔ P1）。 */
export const ANIMATION_IDS = Object.freeze([
  ...P0_B_ANIMATION_IDS,
  ...P0_C_ANIMATION_IDS,
  ...P1_ANIMATION_IDS,
] as const);

export type P0BAnimationId = (typeof P0_B_ANIMATION_IDS)[number];
export type P0CAnimationId = (typeof P0_C_ANIMATION_IDS)[number];
export type P1AnimationId = (typeof P1_ANIMATION_IDS)[number];
export type AnimationId = P0BAnimationId | P0CAnimationId | P1AnimationId;

// ---------------------------------------------------------------------------
// 尾巴、圖示、音效
// ---------------------------------------------------------------------------

/** 8 種尾巴情緒指標（PRD §4.3、§8.B.1）。 */
export const TAIL_STATES = Object.freeze([
  'neutral',
  'question_mark',
  'question_mark_tremble',
  'slow_sway',
  'fast_whip',
  'tucked_drooped',
  'curled_sleep',
  'puffed_alert',
] as const);
export type TailState = (typeof TAIL_STATES)[number];

/** 動態圖示（PRD §4.3、§8.B.1）。 */
export const ICON_IDS = Object.freeze([
  'fish',
  'water',
  'heart',
  'angry',
  'hospital',
  'sleep_zzz',
  'ball',
  'sweat',
] as const);
export type IconId = (typeof ICON_IDS)[number];

export const SOUND_IDS = Object.freeze([
  'meow_happy',
  'purr',
  'hiss',
  'eat_crunch',
  'drink_lap',
  'alert_meow',
  'play_chirp',
] as const);
export type SoundId = (typeof SOUND_IDS)[number];

// ---------------------------------------------------------------------------
// 優先級與狀態類別（PRD §8.B.1 表格）
// ---------------------------------------------------------------------------

export const BEHAVIOR_CATEGORIES = Object.freeze([
  'CRITICAL_NEEDS',
  'NEGATIVE_REACTION',
  'SLEEP_MODE',
  'MODERATE_NEEDS',
  'PLAYER_INTERACTION',
  'IDLE_AND_PATROL',
] as const);
export type BehaviorCategory = (typeof BEHAVIOR_CATEGORIES)[number];

export const BEHAVIOR_PRIORITIES = Object.freeze([100, 90, 80, 60, 40, 10] as const);
export type BehaviorPriority = (typeof BEHAVIOR_PRIORITIES)[number];

/** 各狀態類別對應之優先級。 */
export const BEHAVIOR_PRIORITY_BY_CATEGORY = Object.freeze({
  CRITICAL_NEEDS: 100,
  NEGATIVE_REACTION: 90,
  SLEEP_MODE: 80,
  MODERATE_NEEDS: 60,
  PLAYER_INTERACTION: 40,
  IDLE_AND_PATROL: 10,
} as const satisfies { readonly [K in BehaviorCategory]: BehaviorPriority });

// ---------------------------------------------------------------------------
// BehaviorDecision（PRD §0、§8.B.1）
// ---------------------------------------------------------------------------

/**
 * BehaviorEngine 輸出的完整行為決策。
 * `interruptible` 與 `cooldownMs` 僅供 Game Core 內部仲裁，不得拋出至 PetViewModel（PRD §5.2）。
 */
export interface BehaviorDecision {
  readonly animationId: AnimationId;
  readonly tailState: TailState;
  readonly iconIds: readonly IconId[];
  readonly soundId: SoundId | null;
  readonly durationMs: number;
  readonly interruptible: boolean;
  readonly cooldownMs: number;
}
