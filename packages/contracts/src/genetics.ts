/**
 * 遺傳與外觀契約（Master PRD v2.1.29 §0、§3.1、§8.A.1～§8.A.3）。
 *
 * 本檔只定義型別與 PRD 原文列舉常數，不含任何遺傳抽選或相容修正邏輯
 * （相關計算屬 game-core GeneticsEngine，由後續任務實作）。
 */

// ---------------------------------------------------------------------------
// 品種（PRD §3.1 第 1 點、§8.A.2）
// ---------------------------------------------------------------------------

/** 6 大基礎品種識別碼。 */
export const BREED_IDS = Object.freeze([
  'domestic',
  'munchkin',
  'ragdoll',
  'british_shorthair',
  'exotic',
  'maine_coon',
] as const);

export type BreedId = (typeof BREED_IDS)[number];

// ---------------------------------------------------------------------------
// 七大外觀圖層枚舉（PRD §8.A.3 第 1 點）
// ---------------------------------------------------------------------------

export const HEAD_TRAITS = Object.freeze([
  'standard_round',
  'chubby_round',
  'flat_face',
  'square_muzzle',
] as const);
export type HeadTrait = (typeof HEAD_TRAITS)[number];

export const EARS_TRAITS = Object.freeze([
  'pointed_medium',
  'small_round',
  'tufted_large',
  'folded_tip',
] as const);
export type EarsTrait = (typeof EARS_TRAITS)[number];

export const EYES_TRAITS = Object.freeze(['almond', 'big_round', 'droopy_cute'] as const);
export type EyesTrait = (typeof EYES_TRAITS)[number];

export const PUPIL_COLOR_TRAITS = Object.freeze([
  'amber',
  'emerald',
  'sapphire',
  'copper',
  'heterochromia_blue_gold',
] as const);
export type PupilColorTrait = (typeof PUPIL_COLOR_TRAITS)[number];

export const COAT_PATTERN_TRAITS = Object.freeze([
  'solid',
  'tabby_mackerel',
  'bicolor_tuxedo',
  'colorpoint',
  'calico',
  'tortoiseshell',
  'starry_rare',
] as const);
export type CoatPatternTrait = (typeof COAT_PATTERN_TRAITS)[number];

export const TAIL_TRAITS = Object.freeze([
  'long_straight',
  'fluffy_plume',
  'short_bobtail',
  'kinked_kirin',
] as const);
export type TailTrait = (typeof TAIL_TRAITS)[number];

export const BODY_TRAITS = Object.freeze([
  'normal',
  'chubby',
  'short_legs',
  'large_fluffy',
  'giant_fluffy',
] as const);
export type BodyTrait = (typeof BODY_TRAITS)[number];

// ---------------------------------------------------------------------------
// 圖層組合
// ---------------------------------------------------------------------------

/** 七大外觀圖層組合（PRD §3.1 第 2 點）。 */
export interface AppearanceLayers {
  readonly head: HeadTrait;
  readonly ears: EarsTrait;
  readonly eyes: EyesTrait;
  readonly pupilColor: PupilColorTrait;
  readonly coatPattern: CoatPatternTrait;
  readonly tail: TailTrait;
  readonly body: BodyTrait;
}

export type AppearanceLayerName = keyof AppearanceLayers;

/** 七大圖層名稱，依 PRD §8.A.4 步驟 2 之固定抽選順序排列（head ➔ ears ➔ eyes ➔ pupilColor ➔ coatPattern ➔ tail ➔ body）。 */
export const APPEARANCE_LAYER_NAMES = Object.freeze([
  'head',
  'ears',
  'eyes',
  'pupilColor',
  'coatPattern',
  'tail',
  'body',
] as const satisfies readonly AppearanceLayerName[]);

/** 各圖層合法枚舉值（含稀有突變）。 */
export const APPEARANCE_LAYER_TRAITS = Object.freeze({
  head: HEAD_TRAITS,
  ears: EARS_TRAITS,
  eyes: EYES_TRAITS,
  pupilColor: PUPIL_COLOR_TRAITS,
  coatPattern: COAT_PATTERN_TRAITS,
  tail: TAIL_TRAITS,
  body: BODY_TRAITS,
} as const satisfies { readonly [K in AppearanceLayerName]: readonly AppearanceLayers[K][] });

// ---------------------------------------------------------------------------
// 稀有突變標記（PRD §3.1 第 3 點、§8.A.2、§8.A.3）
// ---------------------------------------------------------------------------

/** 設有稀有突變之 4 個圖層。 */
export const RARE_MUTATION_LAYER_NAMES = Object.freeze([
  'ears',
  'pupilColor',
  'coatPattern',
  'tail',
] as const satisfies readonly AppearanceLayerName[]);
export type RareMutationLayerName = (typeof RARE_MUTATION_LAYER_NAMES)[number];

/** 無稀有突變之 3 個圖層。 */
export const NON_RARE_MUTATION_LAYER_NAMES = Object.freeze([
  'head',
  'eyes',
  'body',
] as const satisfies readonly AppearanceLayerName[]);

/** 各稀有突變圖層之稀有突變值（折耳、異色瞳、星空斑紋、麒麟尾）。 */
export const RARE_MUTATION_TRAITS = Object.freeze({
  ears: 'folded_tip',
  pupilColor: 'heterochromia_blue_gold',
  coatPattern: 'starry_rare',
  tail: 'kinked_kirin',
} as const satisfies { readonly [K in RareMutationLayerName]: AppearanceLayers[K] });

export type RareEarsTrait = (typeof RARE_MUTATION_TRAITS)['ears'];
export type RarePupilColorTrait = (typeof RARE_MUTATION_TRAITS)['pupilColor'];
export type RareCoatPatternTrait = (typeof RARE_MUTATION_TRAITS)['coatPattern'];
export type RareTailTrait = (typeof RARE_MUTATION_TRAITS)['tail'];

// ---------------------------------------------------------------------------
// 安全預設外觀（PRD §8.A.3 規則 4）
// ---------------------------------------------------------------------------

/** 終極安全回退 SAFE_DEFAULT_APPEARANCE 之完整七層組合。 */
export const SAFE_DEFAULT_APPEARANCE_LAYERS: AppearanceLayers = Object.freeze({
  head: 'standard_round',
  ears: 'pointed_medium',
  eyes: 'almond',
  pupilColor: 'amber',
  coatPattern: 'solid',
  tail: 'long_straight',
  body: 'normal',
} as const);

// ---------------------------------------------------------------------------
// 色彩參數與最終外觀（PRD §8.A.1）
// ---------------------------------------------------------------------------

export interface ColorParams {
  /** 調整後主毛色 HEX（如 "#E89246"）。 */
  readonly primaryHex: string;
  /** 調整後重點色／輔色 HEX（無輔色時為 null）。 */
  readonly secondaryHex: string | null;
  /** HSL 明度微調係數，範圍 [-0.08, +0.08]。 */
  readonly lightnessDelta: number;
  /** HSL 飽和度微調係數，範圍 [-0.08, +0.08]。 */
  readonly saturationDelta: number;
}

/** colorParams 明度／飽和度微調係數之合法範圍（PRD §8.A.1）。 */
export const COLOR_PARAMS_DELTA_RANGE = Object.freeze({ min: -0.08, max: 0.08 } as const);

/** 經相容性驗證後之最終外觀（唯一渲染依據）。 */
export type PetAppearance = AppearanceLayers & { readonly colorParams: ColorParams };

/** 生成後永久鎖定之遺傳資料（PRD §8.A.1 第 1 點）。 */
export interface PetGenetics {
  readonly seed: string;
  readonly prngAlgorithmVersion: string;
  readonly geneticsVersion: string;
  readonly rulesVersion: string;
  readonly fatherBreed: BreedId;
  readonly motherBreed: BreedId;
  readonly fatherPetId: string | null;
  readonly motherPetId: string | null;
  readonly appearance: PetAppearance;
}
