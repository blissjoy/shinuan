/**
 * 商品目錄與三區塊商業化商品契約（Master PRD v2.1.29 §8.A.1、§8.C.2）。
 *
 * 本檔只定義型別與 PRD 原文常數；商品定價級距驗證邏輯屬 config-loader，
 * 經濟結算屬 game-core EconomyEngine，均不在本套件實作。
 */

/** 背包與商品目錄使用之商品識別碼（PRD §8.A.1 `inventory: Record<ItemId, number>`）。 */
export type ItemId = string;

/** Phase A 預設 8 款商品 ID（PRD §8.C.2「Phase A 預設商品清單」）。 */
export const BUILT_IN_ITEM_IDS = Object.freeze([
  'free_basic_kibble',
  'free_fresh_water',
  'shop_chicken_can',
  'shop_salmon_mousse',
  'brand_nu4pet_kitten',
  'brand_ziwi_venison',
  'brand_rc_hairball',
  'shop_freeze_dried',
] as const);
export type BuiltInItemId = (typeof BUILT_IN_ITEM_IDS)[number];

export const FOOD_CATEGORIES = Object.freeze(['water', 'kibble', 'wet_food', 'treat'] as const);
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const PRODUCT_TYPES = Object.freeze(['regular', 'sponsored', 'free'] as const);
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_DATA_TYPES = Object.freeze(['real', 'mock'] as const);
export type ProductDataType = (typeof PRODUCT_DATA_TYPES)[number];

export const FEED_SOURCE_TYPES = Object.freeze(['manual', 'partner_api', 'partner_csv'] as const);
export type FeedSourceType = (typeof FEED_SOURCE_TYPES)[number];

export const PRODUCT_STATUSES = Object.freeze(['active', 'pending_review', 'discontinued'] as const);
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

// ---------------------------------------------------------------------------
// 三區塊結構
// ---------------------------------------------------------------------------

/** 外部同步識別區塊（支援冪等更新）。 */
export interface ExternalSource {
  readonly partnerId: string | null;
  readonly externalSkuId: string | null;
  readonly feedSourceType: FeedSourceType;
  /** ISO-8601 時間戳，最後同步匯入時間。 */
  readonly syncedAt: string | null;
}

/**
 * 營養分析（PRD §8.C.2：粗蛋白、粗脂肪、水分等分析）。
 * 百分比以數值表示（如 28 代表 28%）。
 */
export interface FoodNutrition {
  readonly crudeProteinPercent: number;
  readonly crudeFatPercent: number;
  readonly moisturePercent: number;
}

/** 廠商可維護之商品資訊區塊。 */
export interface VendorInfo {
  readonly name: string;
  readonly productType: ProductType;
  readonly dataType: ProductDataType;
  readonly imageUrl: string | null;
  readonly purchaseUrl: string | null;
  readonly promoCode: string | null;
  readonly nutrition: FoodNutrition;
  readonly ingredients: string;
  readonly sourceName: string;
  readonly sourceUrl: string | null;
  /** 官方資料核實日期 YYYY-MM-DD；mock 為 null。 */
  readonly dataVerifiedAt: string | null;
  /** 內部審查日期 YYYY-MM-DD。 */
  readonly lastReviewedAt: string | null;
  readonly disclaimer: string | null;
}

/** 商品使用時之遊戲效果（PRD §8.C.2 `gameEffect`）。 */
export interface FoodGameEffect {
  readonly hunger: number;
  readonly hydration: number;
  readonly mood: number;
}

/** 僅拾暖官方可設定之遊戲平衡區塊。 */
export interface GameBalance {
  readonly category: FoodCategory;
  /** 免費品為 0。 */
  readonly price: number;
  readonly gameEffect: FoodGameEffect;
  readonly status: ProductStatus;
}

/** 三區塊商業化商品項目。 */
export interface FoodCatalogItem {
  readonly itemId: ItemId;
  readonly externalSource: ExternalSource;
  readonly vendorInfo: VendorInfo;
  readonly gameBalance: GameBalance;
}

// ---------------------------------------------------------------------------
// 商品定價級距與固定效果白名單（PRD §8.C.2，嚴禁修改任何區間數值）
// ---------------------------------------------------------------------------

/** 閉區間 [min, max]；單一值以 min === max 表示。 */
export interface InclusiveRange {
  readonly min: number;
  readonly max: number;
}

export const PRICE_TIER_IDS = Object.freeze([
  'free_basic',
  'paid_advanced',
  'entry',
  'standard',
  'premium',
] as const);
/** 定價級距識別：免費基礎、付費進階、入門級、標準級、頂級。 */
export type PriceTierId = (typeof PRICE_TIER_IDS)[number];

export interface PriceTierRule {
  readonly category: FoodCategory;
  readonly tier: PriceTierId;
  readonly price: InclusiveRange;
  readonly hunger: InclusiveRange;
  readonly hydration: InclusiveRange;
  readonly mood: InclusiveRange;
}

const range = (min: number, max: number = min): InclusiveRange => Object.freeze({ min, max });

const tier = (rule: PriceTierRule): PriceTierRule => Object.freeze(rule);

/** PRD §8.C.2「商品定價級距與固定效果白名單驗證準則」表，逐列對應 7 個級距。 */
export const FOOD_PRICE_TIER_RULES: readonly PriceTierRule[] = Object.freeze([
  tier({
    category: 'water',
    tier: 'free_basic',
    price: range(0),
    hunger: range(0),
    hydration: range(32),
    mood: range(2),
  }),
  tier({
    category: 'kibble',
    tier: 'free_basic',
    price: range(0),
    hunger: range(25),
    hydration: range(-2),
    mood: range(2),
  }),
  tier({
    category: 'kibble',
    tier: 'paid_advanced',
    price: range(80, 110),
    hunger: range(26, 28),
    hydration: range(-2, -1),
    mood: range(5, 6),
  }),
  tier({
    category: 'wet_food',
    tier: 'entry',
    price: range(50, 70),
    hunger: range(25),
    hydration: range(20, 21),
    mood: range(5, 6),
  }),
  tier({
    category: 'wet_food',
    tier: 'standard',
    price: range(71, 95),
    hunger: range(25, 27),
    hydration: range(20, 22),
    mood: range(7, 8),
  }),
  tier({
    category: 'wet_food',
    tier: 'premium',
    price: range(96, 120),
    hunger: range(27, 28),
    hydration: range(20, 22),
    mood: range(8, 9),
  }),
  tier({
    category: 'treat',
    tier: 'standard',
    price: range(40, 60),
    hunger: range(8),
    hydration: range(-1),
    mood: range(14),
  }),
]);
