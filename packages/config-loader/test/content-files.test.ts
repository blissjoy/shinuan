/**
 * SHINUAN-S1-02 真實 content/ 4 檔驗證與 PRD 逐值核對（Master PRD v2.1.29 §8.A.2、§8.A.3、§8.C.2）。
 *
 * 本檔預期值逐字取自 PRD 表格（task-package §2.2～§2.5），刻意不引用 src/defaults.ts，
 * 再另行斷言 BUILT_IN_DEFAULT_CONFIG 與真實檔案逐值一致（設計 §5 第 3 點）。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_DEFAULT_CONFIG,
  loadGameConfig,
  validateAppearanceCompatibilityConfig,
  validateBreedsConfig,
  validateFoodCatalogConfig,
  validateTraitsConfig,
} from '../src/index';
import { REPO_CONTENT_DIR, readContentJson } from './fixtures';

const FILES = {
  breeds: 'genetics/breeds.v1.json',
  traits: 'traits/traits.v1.json',
  compat: 'genetics/appearance-compatibility.v1.json',
  catalog: 'products/food-catalog.v1.json',
} as const;

const single = (hex: string, secondaryHex: string | null = null) => ({ primary: { kind: 'single', hex }, secondaryHex });
const range = (fromHex: string, toHex: string) => ({ primary: { kind: 'range', fromHex, toHex }, secondaryHex: null });
const p = (affection: number, laziness: number, tsundere: number, curiosity: number) => ({
  affection,
  laziness,
  tsundere,
  curiosity,
});

const EXPECTED_BREEDS = {
  version: 'v1',
  breeds: [
    {
      id: 'domestic',
      displayName: '米克斯',
      basePersonality: p(60, 50, 50, 80),
      colorPalette: [range('#E68A3E', '#F5C284'), range('#6E5D4F', '#A89888'), single('#2B2B2B'), single('#F8F8F8')],
    },
    {
      id: 'munchkin',
      displayName: '曼赤肯',
      basePersonality: p(75, 45, 40, 85),
      colorPalette: [single('#F5E6D3'), single('#D98245', '#333333'), single('#7A8591')],
    },
    {
      id: 'ragdoll',
      displayName: '布偶貓',
      basePersonality: p(90, 75, 20, 50),
      colorPalette: [single('#FAF5EE', '#4A3728'), single('#FAF5EE', '#6B7A8F')],
    },
    {
      id: 'british_shorthair',
      displayName: '英國短毛貓',
      basePersonality: p(55, 85, 65, 40),
      colorPalette: [range('#6C7680', '#8C96A0'), single('#D8DEE3'), single('#D9A760')],
    },
    {
      id: 'exotic',
      displayName: '異國短/長毛 (加菲/喜馬拉雅)',
      basePersonality: p(70, 80, 55, 45),
      colorPalette: [single('#D97236'), single('#F2E4D5', '#5C4033')],
    },
    {
      id: 'maine_coon',
      displayName: '緬因貓',
      basePersonality: p(80, 50, 35, 75),
      colorPalette: [range('#594636', '#8C735B'), single('#3A3D40'), single('#C86D3B')],
    },
  ],
};

const one = (trait: string) => [{ trait, weight: 1 }];
const coat = (main: string, sub: string) => [
  { trait: main, weight: 0.7 },
  { trait: sub, weight: 0.3 },
];
const pool = (
  head: string,
  ears: string,
  eyes: string,
  pupilColor: string,
  coatPattern: ReturnType<typeof coat>,
  tail: string,
  body: string,
) => ({
  head: one(head),
  ears: one(ears),
  eyes: one(eyes),
  pupilColor: one(pupilColor),
  coatPattern,
  tail: one(tail),
  body: one(body),
});

const EXPECTED_TRAITS = {
  version: 'v1',
  traitPools: {
    domestic: pool('standard_round', 'pointed_medium', 'almond', 'amber', coat('tabby_mackerel', 'calico'), 'long_straight', 'normal'),
    munchkin: pool('standard_round', 'small_round', 'big_round', 'copper', coat('bicolor_tuxedo', 'calico'), 'long_straight', 'short_legs'),
    ragdoll: pool('standard_round', 'pointed_medium', 'big_round', 'sapphire', coat('colorpoint', 'bicolor_tuxedo'), 'fluffy_plume', 'large_fluffy'),
    british_shorthair: pool('chubby_round', 'small_round', 'big_round', 'copper', coat('solid', 'tabby_mackerel'), 'short_bobtail', 'chubby'),
    exotic: pool('flat_face', 'small_round', 'big_round', 'copper', coat('tabby_mackerel', 'colorpoint'), 'short_bobtail', 'chubby'),
    maine_coon: pool('square_muzzle', 'tufted_large', 'almond', 'emerald', coat('tabby_mackerel', 'tortoiseshell'), 'fluffy_plume', 'giant_fluffy'),
  },
};

const EXPECTED_COMPAT = {
  version: 'v1',
  rules: [
    { id: 'flat_face_giant_body', order: 1, when: { head: 'flat_face', body: 'giant_fluffy' }, set: { body: 'chubby' } },
    { id: 'colorpoint_amber_pupil', order: 2, when: { coatPattern: 'colorpoint', pupilColor: 'amber' }, set: { pupilColor: 'sapphire' } },
    { id: 'folded_ear_giant_body', order: 3, when: { ears: 'folded_tip', body: 'giant_fluffy' }, set: { ears: 'tufted_large' } },
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

type Row = [string, string, string, string, number, [number, number, number], string, [number, number, number]];
/** [itemId, name, category, productType, price, nutrition, ingredients, gameEffect]（PRD §8.C.2 Phase A 預設商品清單）。 */
const ROWS: Row[] = [
  ['free_basic_kibble', '基礎日常乾糧', 'kibble', 'free', 0, [28, 12, 10], '穀物、家禽副產品粉、維生素', [25, -2, 2]],
  ['free_fresh_water', '過濾飲用水', 'water', 'free', 0, [0, 0, 100], '純淨過濾水 100%（建議每日更換維持新鮮）', [0, 32, 2]],
  ['shop_chicken_can', '鮮燉嫩雞主食罐', 'wet_food', 'regular', 60, [12.5, 4.5, 78], '去骨雞胸肉、雞高湯、牛磺酸', [25, 20, 5]],
  ['shop_salmon_mousse', '野生鮭魚慕斯罐', 'wet_food', 'regular', 80, [11.8, 5.2, 80], '野生鮭魚、魚油、洋車前子膳食纖維', [25, 22, 8]],
  ['brand_nu4pet_kitten', '【陪心】屁孩罐－葡聚醣雞肉', 'wet_food', 'sponsored', 90, [13.0, 5.0, 79], '台灣鮮雞肉、β-葡聚醣、魚油、維生素 E', [26, 21, 8]],
  ['brand_ziwi_venison', '【Ziwi 巔峰】紐西蘭鹿肉主食罐', 'wet_food', 'sponsored', 110, [12.0, 6.5, 78], '紐西蘭放牧鹿肉、鹿肝、綠唇貝、海帶', [28, 20, 9]],
  ['brand_rc_hairball', '【皇家】IH34 化毛配方乾糧', 'kibble', 'sponsored', 95, [34, 15, 8], '脫水禽肉蛋白、洋車前子殼、甜菜漿', [28, -1, 6]],
  ['shop_freeze_dried', '凍乾原肉丁零食', 'treat', 'regular', 50, [82, 8, 5], '100% 冷凍乾燥雞胸肉丁', [8, -1, 14]],
];

const EXPECTED_CATALOG = {
  version: 'v1',
  items: ROWS.map(([itemId, name, category, productType, price, n, ingredients, e]) => ({
    itemId,
    externalSource: { partnerId: null, externalSkuId: null, feedSourceType: 'manual', syncedAt: null },
    vendorInfo: {
      name,
      productType,
      dataType: 'mock',
      imageUrl: null,
      purchaseUrl: null,
      promoCode: null,
      nutrition: { crudeProteinPercent: n[0], crudeFatPercent: n[1], moisturePercent: n[2] },
      ingredients,
      sourceName: 'MVP 模擬測試資料',
      sourceUrl: null,
      dataVerifiedAt: null,
      lastReviewedAt: '2026-11-25',
      disclaimer: 'MVP 測試模擬資料，實際成分以原廠包裝標示為準',
    },
    gameBalance: { category, price, gameEffect: { hunger: e[0], hydration: e[1], mood: e[2] }, status: 'active' },
  })),
};

describe('content/ 真實設定檔（PRD v2.1.29 逐值核對）', () => {
  it('4 檔皆為 UTF-8 無 BOM 且可解析', () => {
    for (const rel of Object.values(FILES)) {
      const bytes = readFileSync(`${REPO_CONTENT_DIR}${rel}`);
      expect(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, rel).toBe(false);
      expect(() => JSON.parse(bytes.toString('utf8')) as unknown, rel).not.toThrow();
    }
  });

  it('breeds.v1.json 通過驗證且逐值吻合 PRD §8.A.2', () => {
    const raw = readContentJson(FILES.breeds);
    const result = validateBreedsConfig(raw);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(raw).toStrictEqual(EXPECTED_BREEDS);
  });

  it('breeds.v1.json 內建色碼統一為大寫', () => {
    const text = readFileSync(`${REPO_CONTENT_DIR}${FILES.breeds}`, 'utf8');
    const hexes = text.match(/#[0-9A-Fa-f]{6}/g) ?? [];
    expect(hexes.length).toBeGreaterThan(0);
    for (const hex of hexes) expect(hex).toBe(hex.toUpperCase());
  });

  it('traits.v1.json 通過驗證且逐值吻合 PRD §8.A.2 權重池', () => {
    const raw = readContentJson(FILES.traits);
    const result = validateTraitsConfig(raw);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(raw).toStrictEqual(EXPECTED_TRAITS);
  });

  it('appearance-compatibility.v1.json 通過驗證且規則 1～4 與固定 id 逐值吻合 PRD §8.A.3（Q1-B、Q17-A）', () => {
    const raw = readContentJson(FILES.compat);
    const result = validateAppearanceCompatibilityConfig(raw);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(raw).toStrictEqual(EXPECTED_COMPAT);
  });

  it('food-catalog.v1.json 通過驗證且 8 款商品逐值吻合 PRD §8.C.2', () => {
    const raw = readContentJson(FILES.catalog);
    const result = validateFoodCatalogConfig(raw);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(raw).toStrictEqual(EXPECTED_CATALOG);
  });

  it('BUILT_IN_DEFAULT_CONFIG 與真實 content/ 4 檔逐值一致（設計 §5 第 3 點）', () => {
    expect(BUILT_IN_DEFAULT_CONFIG.breeds).toStrictEqual(readContentJson(FILES.breeds));
    expect(BUILT_IN_DEFAULT_CONFIG.traits).toStrictEqual(readContentJson(FILES.traits));
    expect(BUILT_IN_DEFAULT_CONFIG.appearanceCompatibility).toStrictEqual(readContentJson(FILES.compat));
    expect(BUILT_IN_DEFAULT_CONFIG.foodCatalog).toStrictEqual(readContentJson(FILES.catalog));
  });

  it('BUILT_IN_DEFAULT_CONFIG 深凍結不可變', () => {
    expect(Object.isFrozen(BUILT_IN_DEFAULT_CONFIG)).toBe(true);
    expect(Object.isFrozen(BUILT_IN_DEFAULT_CONFIG.foodCatalog.items)).toBe(true);
    expect(Object.isFrozen(BUILT_IN_DEFAULT_CONFIG.foodCatalog.items[0]?.gameBalance.gameEffect)).toBe(true);
    expect(Object.isFrozen(BUILT_IN_DEFAULT_CONFIG.traits.traitPools.domestic.coatPattern)).toBe(true);
  });

  it('loadGameConfig 以真實 content/ 載入成功（source: content，不含 fallbackReason）', async () => {
    const result = await loadGameConfig({ contentDir: REPO_CONTENT_DIR });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('content');
    expect('fallbackReason' in result).toBe(false);
    expect(result.config).toStrictEqual(BUILT_IN_DEFAULT_CONFIG);
  });
});
