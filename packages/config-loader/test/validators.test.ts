/**
 * SHINUAN-S1-02 驗證器單元測試（設計 §4.2、§4.5；PRD §8.A.2、§8.A.3、§8.C.2）。
 */
import { describe, expect, it } from 'vitest';
import { FOOD_PRICE_TIER_RULES, RARE_MUTATION_TRAITS, type FoodCatalogItem } from '@shinuan/contracts';
import {
  isValidIsoDate,
  isValidIsoTimestamp,
  validateAppearanceCompatibilityConfig,
  validateBreedsConfig,
  validateFoodCatalogConfig,
  validateTraitsConfig,
} from '../src/index';
import { errorCodes, makeItem, mutable, readContentJson } from './fixtures';

const breeds = () => mutable(readContentJson('genetics/breeds.v1.json'));
const traits = () => mutable(readContentJson('traits/traits.v1.json'));
const compat = () => mutable(readContentJson('genetics/appearance-compatibility.v1.json'));
const catalogOf = (...items: FoodCatalogItem[]) => ({ version: 'v1', items });

// ---------------------------------------------------------------------------
// 共通
// ---------------------------------------------------------------------------

describe('共通 version 與根結構', () => {
  it.each([
    ['breeds', validateBreedsConfig, breeds],
    ['traits', validateTraitsConfig, traits],
    ['compat', validateAppearanceCompatibilityConfig, compat],
    ['catalog', validateFoodCatalogConfig, () => mutable(readContentJson('products/food-catalog.v1.json'))],
  ] as const)('%s：version 須為非空字串、未知欄位拒絕、非物件拒絕', (_name, validate, load) => {
    for (const bad of ['', '   ', 1, null]) {
      const data = load();
      data.version = bad;
      expect(errorCodes(validate(data))).toContain('INVALID_VERSION');
    }
    const extra = load();
    extra.extraField = true;
    expect(errorCodes(validate(extra))).toEqual(['UNKNOWN_FIELD']);
    const v2 = load();
    v2.version = 'v2';
    expect(validate(v2).ok).toBe(true);
    for (const bad of [null, [], 'x', 1, undefined]) {
      expect(errorCodes(validate(bad))).toEqual(['INVALID_TYPE']);
    }
  });

  it('驗證通過之資料為深凍結複本，不受來源後續修改影響', () => {
    const data = breeds();
    const result = validateBreedsConfig(data);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    data.breeds[0].displayName = 'changed';
    expect(result.data.breeds[0]?.displayName).toBe('米克斯');
    expect(Object.isFrozen(result.data.breeds[0]?.basePersonality)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// breeds
// ---------------------------------------------------------------------------

describe('validateBreedsConfig', () => {
  it('缺少品種回報 BREED_MISSING、重複回報 DUPLICATE_BREED', () => {
    const missing = breeds();
    missing.breeds.pop();
    expect(errorCodes(validateBreedsConfig(missing))).toEqual(['BREED_MISSING']);
    const dup = breeds();
    dup.breeds[5] = structuredClone(dup.breeds[0]);
    expect(errorCodes(validateBreedsConfig(dup)).sort()).toEqual(['BREED_MISSING', 'DUPLICATE_BREED']);
  });

  it('非法品種 id 回報 INVALID_ENUM_VALUE', () => {
    const data = breeds();
    data.breeds[0].id = 'sphynx';
    expect(errorCodes(validateBreedsConfig(data))).toContain('INVALID_ENUM_VALUE');
  });

  it('basePersonality 邊界 0／100 合法，越界與非有限數值拒絕', () => {
    const ok = breeds();
    ok.breeds[0].basePersonality = { affection: 0, laziness: 100, tsundere: 0, curiosity: 100 };
    expect(validateBreedsConfig(ok).ok).toBe(true);
    for (const [value, code] of [
      [-0.1, 'PERSONALITY_OUT_OF_RANGE'],
      [100.1, 'PERSONALITY_OUT_OF_RANGE'],
      [Number.NaN, 'NOT_FINITE_NUMBER'],
      [Number.POSITIVE_INFINITY, 'NOT_FINITE_NUMBER'],
      ['50', 'INVALID_TYPE'],
    ] as const) {
      const data = breeds();
      data.breeds[1].basePersonality.tsundere = value;
      expect(errorCodes(validateBreedsConfig(data))).toEqual([code]);
    }
    const missingKey = breeds();
    delete missingKey.breeds[0].basePersonality.curiosity;
    expect(errorCodes(validateBreedsConfig(missingKey))).toEqual(['MISSING_FIELD']);
  });

  it('colorPalette 不得為空', () => {
    const data = breeds();
    data.breeds[2].colorPalette = [];
    expect(errorCodes(validateBreedsConfig(data))).toEqual(['EMPTY_COLOR_PALETTE']);
  });

  it('HEX 允許大小寫，格式錯誤拒絕（含 secondaryHex、range 兩端）', () => {
    const lower = breeds();
    lower.breeds[0].colorPalette[2].primary.hex = '#2b2b2b';
    lower.breeds[1].colorPalette[1].secondaryHex = '#abcdef';
    expect(validateBreedsConfig(lower).ok).toBe(true);
    for (const bad of ['2B2B2B', '#2B2B2', '#2B2B2BF', '#GGGGGG', '']) {
      const a = breeds();
      a.breeds[0].colorPalette[2].primary.hex = bad;
      expect(errorCodes(validateBreedsConfig(a))).toEqual(['INVALID_HEX_COLOR']);
      const b = breeds();
      b.breeds[1].colorPalette[1].secondaryHex = bad;
      expect(errorCodes(validateBreedsConfig(b))).toEqual(['INVALID_HEX_COLOR']);
      const c = breeds();
      c.breeds[0].colorPalette[0].primary.toHex = bad;
      expect(errorCodes(validateBreedsConfig(c))).toEqual(['INVALID_HEX_COLOR']);
    }
  });

  it('色碼 kind 非法、single/range 多餘欄位拒絕', () => {
    const kind = breeds();
    kind.breeds[0].colorPalette[2].primary.kind = 'gradient';
    expect(errorCodes(validateBreedsConfig(kind))).toEqual(['INVALID_ENUM_VALUE']);
    const noKind = breeds();
    delete noKind.breeds[0].colorPalette[2].primary.kind;
    expect(errorCodes(validateBreedsConfig(noKind))).toEqual(['MISSING_FIELD']);
    const extra = breeds();
    extra.breeds[0].colorPalette[2].primary.fromHex = '#000000';
    expect(errorCodes(validateBreedsConfig(extra))).toEqual(['UNKNOWN_FIELD']);
    const rangeMissing = breeds();
    delete rangeMissing.breeds[0].colorPalette[0].primary.toHex;
    expect(errorCodes(validateBreedsConfig(rangeMissing))).toEqual(['MISSING_FIELD']);
  });

  it('品種物件未知欄位拒絕（UNKNOWN_FIELD）', () => {
    const data = breeds();
    data.breeds[0].rarity = 'common';
    expect(errorCodes(validateBreedsConfig(data))).toEqual(['UNKNOWN_FIELD']);
  });
});

// ---------------------------------------------------------------------------
// traits
// ---------------------------------------------------------------------------

describe('validateTraitsConfig', () => {
  it.each(Object.entries(RARE_MUTATION_TRAITS))('預設特徵池禁止放入稀有突變 %s: %s', (layer, rare) => {
    const data = traits();
    data.traitPools.domestic[layer] = [
      { trait: rare, weight: 0.5 },
      { trait: data.traitPools.domestic[layer][0].trait, weight: 0.5 },
    ];
    expect(errorCodes(validateTraitsConfig(data))).toEqual(['RARE_MUTATION_IN_DEFAULT_POOL']);
  });

  it('權重加總須為 1.0（誤差 < 1e-9）', () => {
    const off = traits();
    off.traitPools.munchkin.coatPattern[1].weight = 0.31;
    expect(errorCodes(validateTraitsConfig(off))).toEqual(['WEIGHT_SUM_MISMATCH']);
    const tiny = traits();
    tiny.traitPools.munchkin.coatPattern[1].weight = 0.3 + 2e-9;
    expect(errorCodes(validateTraitsConfig(tiny))).toEqual(['WEIGHT_SUM_MISMATCH']);
    const fp = traits();
    // 0.1 + 0.2 + 0.7 之浮點加總 ≠ 1 但誤差 < 1e-9，應通過
    fp.traitPools.ragdoll.coatPattern = [
      { trait: 'colorpoint', weight: 0.1 },
      { trait: 'bicolor_tuxedo', weight: 0.2 },
      { trait: 'solid', weight: 0.7 },
    ];
    expect(validateTraitsConfig(fp).ok).toBe(true);
  });

  it('權重須 > 0 且為有限數值', () => {
    for (const [w, code] of [
      [0, 'NON_POSITIVE_WEIGHT'],
      [-0.3, 'NON_POSITIVE_WEIGHT'],
      [Number.NaN, 'NOT_FINITE_NUMBER'],
      ['0.3', 'INVALID_TYPE'],
    ] as const) {
      const data = traits();
      data.traitPools.exotic.coatPattern[1].weight = w;
      expect(errorCodes(validateTraitsConfig(data))).toEqual([code]);
    }
  });

  it('同池重複特徵拒絕（DUPLICATE_TRAIT）', () => {
    const data = traits();
    data.traitPools.domestic.head = [
      { trait: 'standard_round', weight: 0.5 },
      { trait: 'standard_round', weight: 0.5 },
    ];
    expect(errorCodes(validateTraitsConfig(data))).toEqual(['DUPLICATE_TRAIT']);
  });

  it('特徵須屬該圖層合法枚舉', () => {
    const data = traits();
    data.traitPools.domestic.head[0].trait = 'almond';
    expect(errorCodes(validateTraitsConfig(data))).toEqual(['INVALID_ENUM_VALUE']);
  });

  it('缺品種、缺圖層、空池、未知品種／圖層鍵拒絕', () => {
    const noBreed = traits();
    delete noBreed.traitPools.maine_coon;
    expect(errorCodes(validateTraitsConfig(noBreed))).toEqual(['MISSING_FIELD']);
    const noLayer = traits();
    delete noLayer.traitPools.maine_coon.tail;
    expect(errorCodes(validateTraitsConfig(noLayer))).toEqual(['MISSING_FIELD']);
    const empty = traits();
    empty.traitPools.maine_coon.tail = [];
    expect(errorCodes(validateTraitsConfig(empty))).toEqual(['EMPTY_TRAIT_POOL']);
    const unknownBreed = traits();
    unknownBreed.traitPools.sphynx = structuredClone(unknownBreed.traitPools.domestic);
    expect(errorCodes(validateTraitsConfig(unknownBreed))).toEqual(['UNKNOWN_FIELD']);
    const unknownLayer = traits();
    unknownLayer.traitPools.domestic.whiskers = [{ trait: 'long', weight: 1 }];
    expect(errorCodes(validateTraitsConfig(unknownLayer))).toEqual(['UNKNOWN_FIELD']);
    const extraKey = traits();
    extraKey.traitPools.domestic.head[0].note = 'x';
    expect(errorCodes(validateTraitsConfig(extraKey))).toEqual(['UNKNOWN_FIELD']);
  });
});

// ---------------------------------------------------------------------------
// appearance-compatibility
// ---------------------------------------------------------------------------

describe('validateAppearanceCompatibilityConfig', () => {
  it('safeDefaultAppearance 不可觸發規則 1～3', () => {
    const r1 = compat();
    r1.safeDefaultAppearance.head = 'flat_face';
    r1.safeDefaultAppearance.body = 'giant_fluffy';
    expect(errorCodes(validateAppearanceCompatibilityConfig(r1))).toEqual(['SAFE_DEFAULT_TRIGGERS_RULE']);
    const r2 = compat();
    r2.safeDefaultAppearance.coatPattern = 'colorpoint';
    expect(errorCodes(validateAppearanceCompatibilityConfig(r2))).toEqual(['SAFE_DEFAULT_TRIGGERS_RULE']);
    const r3 = compat();
    r3.safeDefaultAppearance.ears = 'folded_tip';
    r3.safeDefaultAppearance.body = 'giant_fluffy';
    expect(errorCodes(validateAppearanceCompatibilityConfig(r3))).toEqual(['SAFE_DEFAULT_TRIGGERS_RULE']);
  });

  it('safeDefaultAppearance 須完整 7 層合法值', () => {
    const missing = compat();
    delete missing.safeDefaultAppearance.tail;
    expect(errorCodes(validateAppearanceCompatibilityConfig(missing))).toEqual(['MISSING_FIELD']);
    const bad = compat();
    bad.safeDefaultAppearance.tail = 'curly';
    expect(errorCodes(validateAppearanceCompatibilityConfig(bad))).toEqual(['INVALID_ENUM_VALUE']);
  });

  it('規則 id 唯一、order 正整數且嚴格遞增', () => {
    const dupId = compat();
    dupId.rules[2].id = dupId.rules[0].id;
    expect(errorCodes(validateAppearanceCompatibilityConfig(dupId))).toEqual(['DUPLICATE_RULE_ID']);
    for (const bad of [0, -1, 1.5, '2', null]) {
      const data = compat();
      data.rules[0].order = bad;
      expect(errorCodes(validateAppearanceCompatibilityConfig(data))).toContain('INVALID_RULE_ORDER');
    }
    const same = compat();
    same.rules[2].order = 2;
    expect(errorCodes(validateAppearanceCompatibilityConfig(same))).toEqual(['RULE_ORDER_NOT_INCREASING']);
    const swapped = compat();
    [swapped.rules[0], swapped.rules[1]] = [swapped.rules[1], swapped.rules[0]];
    expect(errorCodes(validateAppearanceCompatibilityConfig(swapped))).toEqual(['RULE_ORDER_NOT_INCREASING']);
    const gaps = compat();
    gaps.rules[1].order = 5;
    gaps.rules[2].order = 10;
    expect(validateAppearanceCompatibilityConfig(gaps).ok).toBe(true);
  });

  it('when/set 至少 1 個合法圖層鍵且值合法', () => {
    const emptyWhen = compat();
    emptyWhen.rules[0].when = {};
    expect(errorCodes(validateAppearanceCompatibilityConfig(emptyWhen))).toEqual(['EMPTY_RULE_CONDITION']);
    const emptySet = compat();
    emptySet.rules[0].set = {};
    expect(errorCodes(validateAppearanceCompatibilityConfig(emptySet))).toEqual(['EMPTY_RULE_ACTION']);
    const badKey = compat();
    badKey.rules[1].when.whiskers = 'long';
    expect(errorCodes(validateAppearanceCompatibilityConfig(badKey))).toEqual(['UNKNOWN_FIELD']);
    const badValue = compat();
    badValue.rules[1].set.pupilColor = 'violet';
    expect(errorCodes(validateAppearanceCompatibilityConfig(badValue))).toEqual(['INVALID_ENUM_VALUE']);
    const crossLayer = compat();
    crossLayer.rules[0].set.body = 'flat_face';
    expect(errorCodes(validateAppearanceCompatibilityConfig(crossLayer))).toEqual(['INVALID_ENUM_VALUE']);
  });

  it('rules 不得為空、規則未知欄位拒絕', () => {
    const empty = compat();
    empty.rules = [];
    expect(errorCodes(validateAppearanceCompatibilityConfig(empty))).toEqual(['EMPTY_RULES']);
    const extra = compat();
    extra.rules[0].priority = 1;
    expect(errorCodes(validateAppearanceCompatibilityConfig(extra))).toEqual(['UNKNOWN_FIELD']);
  });

  it('通用約束（Q17-A）：非 Phase A 固定 id 之合法規則仍通過驗證器', () => {
    const data = compat();
    data.rules[0].id = 'custom_rule';
    expect(validateAppearanceCompatibilityConfig(data).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// food catalog
// ---------------------------------------------------------------------------

const EFFECT_KEYS = ['hunger', 'hydration', 'mood'] as const;

function tierItem(
  ruleIndex: number,
  price: number,
  effect: { hunger: number; hydration: number; mood: number },
  productType?: FoodCatalogItem['vendorInfo']['productType'],
): FoodCatalogItem {
  const rule = FOOD_PRICE_TIER_RULES[ruleIndex]!;
  return makeItem({
    itemId: `tier_${ruleIndex}_${price}`,
    vendorInfo: { productType: productType ?? (rule.price.max === 0 ? 'free' : 'regular') },
    gameBalance: { category: rule.category, price, gameEffect: effect },
  });
}

describe('validateFoodCatalogConfig：7 級距天花板硬檢核（PRD §8.C.2）', () => {
  it('7 個級距之價格與效果上下限邊界全部合法（regular 與 sponsored 同表）', () => {
    expect(FOOD_PRICE_TIER_RULES).toHaveLength(7);
    FOOD_PRICE_TIER_RULES.forEach((rule, i) => {
      const types = rule.price.max === 0 ? (['free'] as const) : (['regular', 'sponsored'] as const);
      for (const productType of types) {
        for (const price of [rule.price.min, rule.price.max]) {
          for (const bound of ['min', 'max'] as const) {
            const item = tierItem(
              i,
              price,
              { hunger: rule.hunger[bound], hydration: rule.hydration[bound], mood: rule.mood[bound] },
              productType,
            );
            const result = validateFoodCatalogConfig(catalogOf(item));
            expect(result.ok ? [] : result.errors, `${rule.category}/${rule.tier} ${productType} ${price} ${bound}`).toEqual([]);
          }
        }
      }
    });
  });

  it('任一維度越界（上限＋1、下限－1）皆回報 EFFECT_OUT_OF_TIER_RANGE', () => {
    FOOD_PRICE_TIER_RULES.forEach((rule, i) => {
      for (const key of EFFECT_KEYS) {
        for (const delta of [1, -1]) {
          const effect = { hunger: rule.hunger.min, hydration: rule.hydration.min, mood: rule.mood.min };
          effect[key] = delta > 0 ? rule[key].max + 1 : rule[key].min - 1;
          const result = validateFoodCatalogConfig(catalogOf(tierItem(i, rule.price.min, effect)));
          expect(errorCodes(result), `${rule.category}/${rule.tier} ${key} ${delta}`).toEqual(['EFFECT_OUT_OF_TIER_RANGE']);
        }
      }
    });
  });

  it('sponsored 品牌商品嘗試突破天花板一律阻擋（無品牌特權）', () => {
    const premium = FOOD_PRICE_TIER_RULES.findIndex((r) => r.category === 'wet_food' && r.tier === 'premium');
    for (const effect of [
      { hunger: 29, hydration: 22, mood: 9 },
      { hunger: 28, hydration: 23, mood: 9 },
      { hunger: 28, hydration: 22, mood: 10 },
    ]) {
      const result = validateFoodCatalogConfig(catalogOf(tierItem(premium, 120, effect, 'sponsored')));
      expect(errorCodes(result)).toEqual(['EFFECT_OUT_OF_TIER_RANGE']);
    }
    // 超出最高級距價格上限 → 無級距可匹配
    const over = validateFoodCatalogConfig(catalogOf(tierItem(premium, 121, { hunger: 28, hydration: 22, mood: 9 }, 'sponsored')));
    expect(errorCodes(over)).toEqual(['PRICE_TIER_NOT_FOUND']);
  });

  it('價格落於級距間隙或類別無對應級距 → PRICE_TIER_NOT_FOUND', () => {
    for (const [category, price] of [
      ['wet_food', 49],
      ['wet_food', 70.5],
      ['kibble', 50],
      ['kibble', 111],
      ['treat', 61],
      ['water', 10],
    ] as const) {
      const item = makeItem({ gameBalance: { category, price } });
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(item))), `${category} ${price}`).toContain('PRICE_TIER_NOT_FOUND');
    }
  });

  it('free 必有 price 0；regular／sponsored 必有 price > 0', () => {
    const freePaid = makeItem({ vendorInfo: { productType: 'free' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(freePaid)))).toEqual(['FREE_ITEM_PRICE_NOT_ZERO']);
    for (const productType of ['regular', 'sponsored'] as const) {
      const zero = makeItem({
        vendorInfo: { productType },
        gameBalance: { category: 'water', price: 0, gameEffect: { hunger: 0, hydration: 32, mood: 2 } },
      });
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(zero)))).toEqual(['PAID_ITEM_PRICE_NOT_POSITIVE']);
    }
    const freeWet = makeItem({
      vendorInfo: { productType: 'free' },
      gameBalance: { category: 'wet_food', price: 0 },
    });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(freeWet)))).toEqual(['PRICE_TIER_NOT_FOUND']);
  });

  it('price／gameEffect 須為有限數值（不強制整數）', () => {
    const decimal = makeItem({ gameBalance: { price: 60.5, gameEffect: { hydration: 20.5 } } });
    expect(validateFoodCatalogConfig(catalogOf(decimal)).ok).toBe(true);
    const nan = makeItem({ gameBalance: { price: Number.NaN } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(nan)))).toEqual(['NOT_FINITE_NUMBER']);
    const str = makeItem({ gameBalance: { gameEffect: { mood: '5' as unknown as number } } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(str)))).toEqual(['INVALID_TYPE']);
  });
});

describe('validateFoodCatalogConfig：來源欄位規則（real／mock）', () => {
  it('real 商品必填 sourceUrl（http/https）與 dataVerifiedAt（YYYY-MM-DD）', () => {
    const noUrl = makeItem({ vendorInfo: { dataType: 'real', dataVerifiedAt: '2026-11-01' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(noUrl)))).toEqual(['REAL_SOURCE_URL_REQUIRED']);
    const noDate = makeItem({ vendorInfo: { dataType: 'real', sourceUrl: 'https://example.com/p' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(noDate)))).toEqual(['REAL_DATA_VERIFIED_AT_REQUIRED']);
    const both = makeItem({ vendorInfo: { dataType: 'real' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(both))).sort()).toEqual([
      'REAL_DATA_VERIFIED_AT_REQUIRED',
      'REAL_SOURCE_URL_REQUIRED',
    ]);
    for (const url of ['http://example.com', 'https://example.com/a?b=c']) {
      const ok = makeItem({ vendorInfo: { dataType: 'real', sourceUrl: url, dataVerifiedAt: '2024-02-29' } });
      expect(validateFoodCatalogConfig(catalogOf(ok)).ok).toBe(true);
    }
    for (const url of ['ftp://example.com', 'example.com', 'https://', '']) {
      const bad = makeItem({ vendorInfo: { dataType: 'real', sourceUrl: url, dataVerifiedAt: '2026-11-01' } });
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(bad))), url).toEqual(['INVALID_URL']);
    }
    const badDate = makeItem({
      vendorInfo: { dataType: 'real', sourceUrl: 'https://example.com', dataVerifiedAt: '2026-02-29' },
    });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(badDate)))).toEqual(['INVALID_DATE']);
  });

  it('mock 允許 sourceUrl／dataVerifiedAt 為 null，但非 null 時仍檢查格式', () => {
    expect(validateFoodCatalogConfig(catalogOf(makeItem())).ok).toBe(true);
    const badUrl = makeItem({ vendorInfo: { sourceUrl: 'not a url' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(badUrl)))).toEqual(['INVALID_URL']);
    const badDate = makeItem({ vendorInfo: { dataVerifiedAt: '2026/11/25' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(badDate)))).toEqual(['INVALID_DATE']);
  });

  it('lastReviewedAt 非 null 時須為有效 YYYY-MM-DD', () => {
    expect(validateFoodCatalogConfig(catalogOf(makeItem({ vendorInfo: { lastReviewedAt: null } }))).ok).toBe(true);
    for (const bad of ['2026-13-01', '2026-11-31', '26-11-25', '2026-11-25T00:00:00Z']) {
      const item = makeItem({ vendorInfo: { lastReviewedAt: bad } });
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(item))), bad).toEqual(['INVALID_DATE']);
    }
  });

  it('name／ingredients／sourceName／itemId 不得為空，nutrition 須在 [0,100]', () => {
    for (const key of ['name', 'ingredients', 'sourceName'] as const) {
      const item = makeItem({ vendorInfo: { [key]: '  ' } });
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(item))), key).toEqual(['EMPTY_STRING']);
    }
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(makeItem({ itemId: '' }))))).toEqual(['EMPTY_STRING']);
    for (const v of [-1, 100.5]) {
      const item = makeItem({ vendorInfo: { nutrition: { crudeFatPercent: v } } });
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(item)))).toEqual(['PERCENT_OUT_OF_RANGE']);
    }
  });
});

describe('validateFoodCatalogConfig：唯一性、外部識別與結構', () => {
  it('itemId 全目錄唯一', () => {
    const result = validateFoodCatalogConfig(catalogOf(makeItem(), makeItem()));
    expect(errorCodes(result)).toEqual(['DUPLICATE_ITEM_ID']);
  });

  it('(partnerId, externalSkuId) 皆非 null 時不得重複；任一為 null 不比對', () => {
    const a = makeItem({ itemId: 'a', externalSource: { partnerId: 'p1', externalSkuId: 's1' } });
    const b = makeItem({ itemId: 'b', externalSource: { partnerId: 'p1', externalSkuId: 's1' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(a, b)))).toEqual(['DUPLICATE_EXTERNAL_KEY']);
    const c = makeItem({ itemId: 'c', externalSource: { partnerId: 'p1', externalSkuId: null } });
    const d = makeItem({ itemId: 'd', externalSource: { partnerId: 'p1', externalSkuId: null } });
    expect(validateFoodCatalogConfig(catalogOf(c, d)).ok).toBe(true);
    const e = makeItem({ itemId: 'e', externalSource: { partnerId: 'p2', externalSkuId: 's1' } });
    expect(validateFoodCatalogConfig(catalogOf(a, e)).ok).toBe(true);
  });

  it('partnerId／externalSkuId 非 null 時不得為空字串', () => {
    const item = makeItem({ externalSource: { partnerId: '', externalSkuId: 's' } });
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(item)))).toEqual(['EMPTY_STRING']);
  });

  it('syncedAt 非 null 時須為有效完整 ISO-8601 時間戳', () => {
    for (const ok of ['2026-11-25T08:00:00Z', '2026-11-25T08:00:00.123Z', '2026-11-25T16:00:00+08:00', '2024-02-29T23:59:59-05:30']) {
      const item = makeItem({ externalSource: { syncedAt: ok } });
      expect(validateFoodCatalogConfig(catalogOf(item)).ok, ok).toBe(true);
    }
    for (const bad of ['2026-11-25', '2026-11-25T08:00:00', '2026-11-25 08:00:00Z', '2026-02-30T00:00:00Z']) {
      const item = makeItem({ externalSource: { syncedAt: bad } });
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(item))), bad).toEqual(['INVALID_ISO_TIMESTAMP']);
    }
  });

  it('枚舉欄位非法值拒絕', () => {
    const cases: [string, FoodCatalogItem][] = [
      ['feedSourceType', makeItem({ externalSource: { feedSourceType: 'ftp' as never } })],
      ['productType', makeItem({ vendorInfo: { productType: 'vip' as never } })],
      ['dataType', makeItem({ vendorInfo: { dataType: 'fake' as never } })],
      ['category', makeItem({ gameBalance: { category: 'toy' as never } })],
      ['status', makeItem({ gameBalance: { status: 'hidden' as never } })],
    ];
    for (const [name, item] of cases) {
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(item))), name).toContain('INVALID_ENUM_VALUE');
    }
  });

  it('任一區塊未知欄位或缺欄位拒絕', () => {
    const blocks = ['externalSource', 'vendorInfo', 'gameBalance'] as const;
    for (const block of blocks) {
      const extra = mutable(makeItem());
      extra[block].bonus = 1;
      expect(errorCodes(validateFoodCatalogConfig(catalogOf(extra))), block).toEqual(['UNKNOWN_FIELD']);
    }
    const nested = mutable(makeItem());
    nested.gameBalance.gameEffect.health = 5;
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(nested)))).toEqual(['UNKNOWN_FIELD']);
    const top = mutable(makeItem());
    top.sponsorBoost = 10;
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(top)))).toEqual(['UNKNOWN_FIELD']);
    const missing = mutable(makeItem());
    delete missing.vendorInfo.disclaimer;
    expect(errorCodes(validateFoodCatalogConfig(catalogOf(missing)))).toEqual(['MISSING_FIELD']);
  });

  it('items 可為空陣列（空白基準）', () => {
    expect(validateFoodCatalogConfig({ version: 'v1', items: [] }).ok).toBe(true);
  });
});

describe('日期／時間格式工具', () => {
  it('isValidIsoTimestamp 範圍檢查（不接受閏秒 60、非法偏移）', () => {
    expect(isValidIsoTimestamp(new Date(0).toISOString())).toBe(true);
    for (const bad of [
      '2026-11-25T24:00:00Z',
      '2026-11-25T23:60:00Z',
      '2026-11-25T23:59:60Z',
      '2026-11-25T08:00:00+24:00',
      '2026-11-25T08:00:00+08:60',
      '2026-11-25T08:00:00+0800',
      '2026-11-25T08:00Z',
      '2023-02-29T00:00:00Z',
    ]) {
      expect(isValidIsoTimestamp(bad), bad).toBe(false);
    }
  });

  it('isValidIsoDate 閏年規則', () => {
    expect(isValidIsoDate('2000-02-29')).toBe(true);
    expect(isValidIsoDate('1900-02-29')).toBe(false);
    expect(isValidIsoDate('2026-04-31')).toBe(false);
  });
});
