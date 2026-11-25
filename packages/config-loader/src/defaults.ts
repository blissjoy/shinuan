/**
 * 內建已驗證預設設定（S1-02 設計 §4.3、§5 第 3 點；Master PRD v2.1.29 §8.A.2、§8.A.3、§8.C.2、§10.2）。
 *
 * 供 `loadGameConfig({ allowFallback: true })` 降級使用。內容必須與專案 `content/` 4 份真實 JSON 逐值一致，
 * 由 `test/content-files.test.ts` 強制斷言；嚴禁單獨修改任何數值。
 */
import type {
  AppearanceCompatibilityConfig,
  BreedsConfig,
  FoodCatalogConfig,
  FoodCatalogItem,
  TraitsConfig,
  ValidatedGameConfig,
} from '@shinuan/contracts';
import { deepFreeze } from './validators/common';

const BUILT_IN_BREEDS: BreedsConfig = {
  version: 'v1',
  breeds: [
    {
      id: 'domestic',
      displayName: '米克斯',
      basePersonality: { affection: 60, laziness: 50, tsundere: 50, curiosity: 80 },
      colorPalette: [
        { primary: { kind: 'range', fromHex: '#E68A3E', toHex: '#F5C284' }, secondaryHex: null },
        { primary: { kind: 'range', fromHex: '#6E5D4F', toHex: '#A89888' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#2B2B2B' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#F8F8F8' }, secondaryHex: null },
      ],
    },
    {
      id: 'munchkin',
      displayName: '曼赤肯',
      basePersonality: { affection: 75, laziness: 45, tsundere: 40, curiosity: 85 },
      colorPalette: [
        { primary: { kind: 'single', hex: '#F5E6D3' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#D98245' }, secondaryHex: '#333333' },
        { primary: { kind: 'single', hex: '#7A8591' }, secondaryHex: null },
      ],
    },
    {
      id: 'ragdoll',
      displayName: '布偶貓',
      basePersonality: { affection: 90, laziness: 75, tsundere: 20, curiosity: 50 },
      colorPalette: [
        { primary: { kind: 'single', hex: '#FAF5EE' }, secondaryHex: '#4A3728' },
        { primary: { kind: 'single', hex: '#FAF5EE' }, secondaryHex: '#6B7A8F' },
      ],
    },
    {
      id: 'british_shorthair',
      displayName: '英國短毛貓',
      basePersonality: { affection: 55, laziness: 85, tsundere: 65, curiosity: 40 },
      colorPalette: [
        { primary: { kind: 'range', fromHex: '#6C7680', toHex: '#8C96A0' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#D8DEE3' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#D9A760' }, secondaryHex: null },
      ],
    },
    {
      id: 'exotic',
      displayName: '異國短/長毛 (加菲/喜馬拉雅)',
      basePersonality: { affection: 70, laziness: 80, tsundere: 55, curiosity: 45 },
      colorPalette: [
        { primary: { kind: 'single', hex: '#D97236' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#F2E4D5' }, secondaryHex: '#5C4033' },
      ],
    },
    {
      id: 'maine_coon',
      displayName: '緬因貓',
      basePersonality: { affection: 80, laziness: 50, tsundere: 35, curiosity: 75 },
      colorPalette: [
        { primary: { kind: 'range', fromHex: '#594636', toHex: '#8C735B' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#3A3D40' }, secondaryHex: null },
        { primary: { kind: 'single', hex: '#C86D3B' }, secondaryHex: null },
      ],
    },
  ],
};

const BUILT_IN_TRAITS: TraitsConfig = {
  version: 'v1',
  traitPools: {
    domestic: {
      head: [{ trait: 'standard_round', weight: 1 }],
      ears: [{ trait: 'pointed_medium', weight: 1 }],
      eyes: [{ trait: 'almond', weight: 1 }],
      pupilColor: [{ trait: 'amber', weight: 1 }],
      coatPattern: [
        { trait: 'tabby_mackerel', weight: 0.7 },
        { trait: 'calico', weight: 0.3 },
      ],
      tail: [{ trait: 'long_straight', weight: 1 }],
      body: [{ trait: 'normal', weight: 1 }],
    },
    munchkin: {
      head: [{ trait: 'standard_round', weight: 1 }],
      ears: [{ trait: 'small_round', weight: 1 }],
      eyes: [{ trait: 'big_round', weight: 1 }],
      pupilColor: [{ trait: 'copper', weight: 1 }],
      coatPattern: [
        { trait: 'bicolor_tuxedo', weight: 0.7 },
        { trait: 'calico', weight: 0.3 },
      ],
      tail: [{ trait: 'long_straight', weight: 1 }],
      body: [{ trait: 'short_legs', weight: 1 }],
    },
    ragdoll: {
      head: [{ trait: 'standard_round', weight: 1 }],
      ears: [{ trait: 'pointed_medium', weight: 1 }],
      eyes: [{ trait: 'big_round', weight: 1 }],
      pupilColor: [{ trait: 'sapphire', weight: 1 }],
      coatPattern: [
        { trait: 'colorpoint', weight: 0.7 },
        { trait: 'bicolor_tuxedo', weight: 0.3 },
      ],
      tail: [{ trait: 'fluffy_plume', weight: 1 }],
      body: [{ trait: 'large_fluffy', weight: 1 }],
    },
    british_shorthair: {
      head: [{ trait: 'chubby_round', weight: 1 }],
      ears: [{ trait: 'small_round', weight: 1 }],
      eyes: [{ trait: 'big_round', weight: 1 }],
      pupilColor: [{ trait: 'copper', weight: 1 }],
      coatPattern: [
        { trait: 'solid', weight: 0.7 },
        { trait: 'tabby_mackerel', weight: 0.3 },
      ],
      tail: [{ trait: 'short_bobtail', weight: 1 }],
      body: [{ trait: 'chubby', weight: 1 }],
    },
    exotic: {
      head: [{ trait: 'flat_face', weight: 1 }],
      ears: [{ trait: 'small_round', weight: 1 }],
      eyes: [{ trait: 'big_round', weight: 1 }],
      pupilColor: [{ trait: 'copper', weight: 1 }],
      coatPattern: [
        { trait: 'tabby_mackerel', weight: 0.7 },
        { trait: 'colorpoint', weight: 0.3 },
      ],
      tail: [{ trait: 'short_bobtail', weight: 1 }],
      body: [{ trait: 'chubby', weight: 1 }],
    },
    maine_coon: {
      head: [{ trait: 'square_muzzle', weight: 1 }],
      ears: [{ trait: 'tufted_large', weight: 1 }],
      eyes: [{ trait: 'almond', weight: 1 }],
      pupilColor: [{ trait: 'emerald', weight: 1 }],
      coatPattern: [
        { trait: 'tabby_mackerel', weight: 0.7 },
        { trait: 'tortoiseshell', weight: 0.3 },
      ],
      tail: [{ trait: 'fluffy_plume', weight: 1 }],
      body: [{ trait: 'giant_fluffy', weight: 1 }],
    },
  },
};

const BUILT_IN_APPEARANCE_COMPATIBILITY: AppearanceCompatibilityConfig = {
  version: 'v1',
  rules: [
    { id: 'flat_face_giant_body', order: 1, when: { head: 'flat_face', body: 'giant_fluffy' }, set: { body: 'chubby' } },
    {
      id: 'colorpoint_amber_pupil',
      order: 2,
      when: { coatPattern: 'colorpoint', pupilColor: 'amber' },
      set: { pupilColor: 'sapphire' },
    },
    {
      id: 'folded_ear_giant_body',
      order: 3,
      when: { ears: 'folded_tip', body: 'giant_fluffy' },
      set: { ears: 'tufted_large' },
    },
  ],
  safeDefaultAppearance: {
    head: 'standard_round',
    ears: 'pointed_medium',
    eyes: 'almond',
    pupilColor: 'amber',
    coatPattern: 'solid',
    tail: 'long_straight',
    body: 'normal',
  },
};

interface MockItemSpec {
  readonly itemId: string;
  readonly name: string;
  readonly productType: FoodCatalogItem['vendorInfo']['productType'];
  readonly nutrition: readonly [number, number, number];
  readonly ingredients: string;
  readonly category: FoodCatalogItem['gameBalance']['category'];
  readonly price: number;
  readonly effect: readonly [number, number, number];
}

/** 8 款 Phase A 模擬商品共同欄位（task-package §2.5）。 */
function mockItem(spec: MockItemSpec): FoodCatalogItem {
  return {
    itemId: spec.itemId,
    externalSource: { partnerId: null, externalSkuId: null, feedSourceType: 'manual', syncedAt: null },
    vendorInfo: {
      name: spec.name,
      productType: spec.productType,
      dataType: 'mock',
      imageUrl: null,
      purchaseUrl: null,
      promoCode: null,
      nutrition: {
        crudeProteinPercent: spec.nutrition[0],
        crudeFatPercent: spec.nutrition[1],
        moisturePercent: spec.nutrition[2],
      },
      ingredients: spec.ingredients,
      sourceName: 'MVP 模擬測試資料',
      sourceUrl: null,
      dataVerifiedAt: null,
      lastReviewedAt: '2026-11-25',
      disclaimer: 'MVP 測試模擬資料，實際成分以原廠包裝標示為準',
    },
    gameBalance: {
      category: spec.category,
      price: spec.price,
      gameEffect: { hunger: spec.effect[0], hydration: spec.effect[1], mood: spec.effect[2] },
      status: 'active',
    },
  };
}

const BUILT_IN_FOOD_CATALOG: FoodCatalogConfig = {
  version: 'v1',
  items: [
    mockItem({
      itemId: 'free_basic_kibble',
      name: '基礎日常乾糧',
      productType: 'free',
      nutrition: [28, 12, 10],
      ingredients: '穀物、家禽副產品粉、維生素',
      category: 'kibble',
      price: 0,
      effect: [25, -2, 2],
    }),
    mockItem({
      itemId: 'free_fresh_water',
      name: '過濾飲用水',
      productType: 'free',
      nutrition: [0, 0, 100],
      ingredients: '純淨過濾水 100%（建議每日更換維持新鮮）',
      category: 'water',
      price: 0,
      effect: [0, 32, 2],
    }),
    mockItem({
      itemId: 'shop_chicken_can',
      name: '鮮燉嫩雞主食罐',
      productType: 'regular',
      nutrition: [12.5, 4.5, 78],
      ingredients: '去骨雞胸肉、雞高湯、牛磺酸',
      category: 'wet_food',
      price: 60,
      effect: [25, 20, 5],
    }),
    mockItem({
      itemId: 'shop_salmon_mousse',
      name: '野生鮭魚慕斯罐',
      productType: 'regular',
      nutrition: [11.8, 5.2, 80],
      ingredients: '野生鮭魚、魚油、洋車前子膳食纖維',
      category: 'wet_food',
      price: 80,
      effect: [25, 22, 8],
    }),
    mockItem({
      itemId: 'brand_nu4pet_kitten',
      name: '【陪心】屁孩罐－葡聚醣雞肉',
      productType: 'sponsored',
      nutrition: [13.0, 5.0, 79],
      ingredients: '台灣鮮雞肉、β-葡聚醣、魚油、維生素 E',
      category: 'wet_food',
      price: 90,
      effect: [26, 21, 8],
    }),
    mockItem({
      itemId: 'brand_ziwi_venison',
      name: '【Ziwi 巔峰】紐西蘭鹿肉主食罐',
      productType: 'sponsored',
      nutrition: [12.0, 6.5, 78],
      ingredients: '紐西蘭放牧鹿肉、鹿肝、綠唇貝、海帶',
      category: 'wet_food',
      price: 110,
      effect: [28, 20, 9],
    }),
    mockItem({
      itemId: 'brand_rc_hairball',
      name: '【皇家】IH34 化毛配方乾糧',
      productType: 'sponsored',
      nutrition: [34, 15, 8],
      ingredients: '脫水禽肉蛋白、洋車前子殼、甜菜漿',
      category: 'kibble',
      price: 95,
      effect: [28, -1, 6],
    }),
    mockItem({
      itemId: 'shop_freeze_dried',
      name: '凍乾原肉丁零食',
      productType: 'regular',
      nutrition: [82, 8, 5],
      ingredients: '100% 冷凍乾燥雞胸肉丁',
      category: 'treat',
      price: 50,
      effect: [8, -1, 14],
    }),
  ],
};

/** 內建已驗證預設設定（深凍結；Fallback 使用前仍會再次執行完整驗證）。 */
export const BUILT_IN_DEFAULT_CONFIG: ValidatedGameConfig = deepFreeze({
  breeds: BUILT_IN_BREEDS,
  traits: BUILT_IN_TRAITS,
  appearanceCompatibility: BUILT_IN_APPEARANCE_COMPATIBILITY,
  foodCatalog: BUILT_IN_FOOD_CATALOG,
});
