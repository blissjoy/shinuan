/**
 * 外部設定檔契約（Master PRD v2.1.29 §5.1、§8.A.2、§8.A.3、§8.C.2）。
 *
 * 供 config-loader（S1-02）完成 Schema 驗證後注入 game-core 使用。
 * 本檔只定義結構型別；讀檔、JSON 驗證與設定內容（breeds.v1.json 等）均不在本套件實作。
 */

import type { FoodCatalogItem } from './catalog';
import type { AppearanceLayerName, AppearanceLayers, BreedId } from './genetics';
import type { BasePersonality } from './pet';

// ---------------------------------------------------------------------------
// breeds.v1.json（PRD §8.A.2 品種表）
// ---------------------------------------------------------------------------

/** 單一 HEX 色碼或 HEX 區間色（區間色於區間內線性插值取基準色，PRD §8.A.4 步驟 4）。 */
export type HexColorSpec =
  | { readonly kind: 'single'; readonly hex: string }
  | { readonly kind: 'range'; readonly fromHex: string; readonly toHex: string };

/** 品種合法毛色色盤中的一組色碼（主色＋可選重點色／輔色）。 */
export interface BreedColorSwatch {
  readonly primary: HexColorSpec;
  readonly secondaryHex: string | null;
}

export interface BreedDefinition {
  readonly id: BreedId;
  readonly displayName: string;
  /** 品種基礎性格傾向（0~100）。 */
  readonly basePersonality: BasePersonality;
  /** 合法毛色 HEX 色碼區間（Shader 基準）。 */
  readonly colorPalette: readonly BreedColorSwatch[];
}

export interface BreedsConfig {
  readonly version: string;
  readonly breeds: readonly BreedDefinition[];
}

// ---------------------------------------------------------------------------
// traits.v1.json（PRD §8.A.2 第 1 點權重池配置）
// ---------------------------------------------------------------------------

export interface WeightedTrait<T extends string> {
  readonly trait: T;
  /** 池內權重（如 0.7 / 0.3）。 */
  readonly weight: number;
}

/** 單一品種在七大圖層上之預設候選特徵池。 */
export type BreedTraitPool = {
  readonly [K in AppearanceLayerName]: readonly WeightedTrait<AppearanceLayers[K]>[];
};

export interface TraitsConfig {
  readonly version: string;
  readonly traitPools: Readonly<Record<BreedId, BreedTraitPool>>;
}

// ---------------------------------------------------------------------------
// appearance-compatibility.v1.json（PRD §8.A.3 第 2 點）
// ---------------------------------------------------------------------------

/** 確定性相容修正規則：符合 `when` 全部條件時，套用 `set` 之修正值。 */
export interface CompatibilityRule {
  readonly id: string;
  /** 固定執行順序（規則 1 ➔ 2 ➔ 3）。 */
  readonly order: number;
  readonly when: Partial<AppearanceLayers>;
  readonly set: Partial<AppearanceLayers>;
}

export interface AppearanceCompatibilityConfig {
  readonly version: string;
  readonly rules: readonly CompatibilityRule[];
  /** 規則 4 終極安全回退組合。 */
  readonly safeDefaultAppearance: AppearanceLayers;
}

// ---------------------------------------------------------------------------
// food-catalog.v1.json（PRD §8.C.2）
// ---------------------------------------------------------------------------

export interface FoodCatalogConfig {
  readonly version: string;
  readonly items: readonly FoodCatalogItem[];
}

// ---------------------------------------------------------------------------
// 驗證後注入 game-core 之完整設定
// ---------------------------------------------------------------------------

export interface ValidatedGameConfig {
  readonly breeds: BreedsConfig;
  readonly traits: TraitsConfig;
  readonly appearanceCompatibility: AppearanceCompatibilityConfig;
  readonly foodCatalog: FoodCatalogConfig;
}
