/**
 * SHINUAN-S1-02B（Issue #7）Fail-Closed 邊界回歸測試：
 * - DEF-01：顯式 `undefined`（when/set 欄位、頂層輸入、陣列元素）不得靜默通過。
 * - OBS-01：稀疏陣列空洞不得被 `forEach`／`map` 略過。
 * - OBS-02：`validateGameConfig`／`mergeCatalogFeed` 頂層 `null`／非物件輸入以資料回報、零例外。
 */
import { describe, expect, it } from 'vitest';
import type { FoodCatalogConfig } from '@shinuan/contracts';
import {
  BUILT_IN_DEFAULT_CONFIG,
  mergeCatalogFeed,
  parseCatalogJson,
  validateAppearanceCompatibilityConfig,
  validateBreedsConfig,
  validateFoodCatalogConfig,
  validateGameConfig,
  validateTraitsConfig,
  type ValidationResult,
} from '../src/index';
import { errorCodes, makeItem, mutable, readContentJson } from './fixtures';

const breeds = () => mutable(readContentJson('genetics/breeds.v1.json'));
const traits = () => mutable(readContentJson('traits/traits.v1.json'));
const compat = () => mutable(readContentJson('genetics/appearance-compatibility.v1.json'));
const catalog = () => mutable(readContentJson('products/food-catalog.v1.json'));

const SYNCED_AT = '2026-11-25T08:00:00.000Z';

/** 回傳錯誤之 [path, code] 配對，便於精準斷言。 */
function errorPairs(result: ValidationResult<unknown>): [string, string][] {
  return result.ok ? [] : result.errors.map((e) => [e.path, e.code]);
}

/** 於陣列尾端製造稀疏空洞（`!(i in arr)`）。 */
function appendHole(arr: unknown[]): number {
  const index = arr.length;
  arr.length = index + 1;
  expect(index in arr).toBe(false);
  return index;
}

/** 於陣列中間製造稀疏空洞。 */
function punchHole(arr: unknown[], index: number): void {
  delete arr[index];
  expect(index in arr).toBe(false);
}

// ---------------------------------------------------------------------------
// 頂層 undefined（DEF-01）
// ---------------------------------------------------------------------------

describe('頂層 validateXxxConfig(undefined) 明確回報 INVALID_TYPE', () => {
  it.each([
    ['breeds', validateBreedsConfig],
    ['traits', validateTraitsConfig],
    ['compat', validateAppearanceCompatibilityConfig],
    ['catalog', validateFoodCatalogConfig],
  ] as const)('%s', (_name, validate) => {
    const result = validate(undefined);
    expect(result.ok).toBe(false);
    expect(errorPairs(result)).toEqual([['$', 'INVALID_TYPE']]);
  });
});

// ---------------------------------------------------------------------------
// when/set 顯式 undefined（DEF-01）
// ---------------------------------------------------------------------------

describe('相容規則 when/set 之顯式 undefined 欄位', () => {
  it('when: { head: undefined } 回報 INVALID_TYPE', () => {
    const data = compat();
    data.rules[0].when = { head: undefined };
    expect(errorPairs(validateAppearanceCompatibilityConfig(data))).toEqual([['$.rules[0].when.head', 'INVALID_TYPE']]);
  });

  it('set: { body: undefined } 回報 INVALID_TYPE', () => {
    const data = compat();
    data.rules[0].set = { body: undefined };
    expect(errorPairs(validateAppearanceCompatibilityConfig(data))).toEqual([['$.rules[0].set.body', 'INVALID_TYPE']]);
  });

  it('合法鍵混入顯式 undefined 鍵亦拒絕（不得只採計合法部分）', () => {
    const data = compat();
    data.rules[1].when = { coatPattern: 'colorpoint', pupilColor: undefined };
    expect(errorPairs(validateAppearanceCompatibilityConfig(data))).toEqual([
      ['$.rules[1].when.pupilColor', 'INVALID_TYPE'],
    ]);
  });

  it('未知鍵即使值為 undefined 仍回報 UNKNOWN_FIELD（不重複回報 INVALID_TYPE）', () => {
    const data = compat();
    data.rules[0].when.whiskers = undefined;
    expect(errorPairs(validateAppearanceCompatibilityConfig(data))).toEqual([
      ['$.rules[0].when.whiskers', 'UNKNOWN_FIELD'],
    ]);
  });
});

// ---------------------------------------------------------------------------
// 陣列 undefined 元素與稀疏空洞（DEF-01 ＋ OBS-01）
// ---------------------------------------------------------------------------

describe('breeds：breeds／colorPalette 之 undefined 元素與空洞', () => {
  it('breeds 尾端 undefined 元素 → $.breeds[6] INVALID_TYPE', () => {
    const data = breeds();
    data.breeds.push(undefined);
    expect(errorPairs(validateBreedsConfig(data))).toEqual([['$.breeds[6]', 'INVALID_TYPE']]);
  });

  it('breeds 尾端稀疏空洞 → $.breeds[6] INVALID_TYPE', () => {
    const data = breeds();
    expect(appendHole(data.breeds)).toBe(6);
    expect(errorPairs(validateBreedsConfig(data))).toEqual([['$.breeds[6]', 'INVALID_TYPE']]);
  });

  it('breeds 中間空洞 → 該索引 INVALID_TYPE 且缺少之品種仍回報 BREED_MISSING', () => {
    const data = breeds();
    const missingId: string = data.breeds[2].id;
    punchHole(data.breeds, 2);
    const result = validateBreedsConfig(data);
    expect(errorPairs(result)).toEqual([
      ['$.breeds[2]', 'INVALID_TYPE'],
      ['$.breeds', 'BREED_MISSING'],
    ]);
    expect(result.ok ? '' : result.errors[1]?.message).toContain(missingId);
  });

  it('colorPalette undefined 元素與空洞 → 對應索引 INVALID_TYPE', () => {
    const withUndefined = breeds();
    const len: number = withUndefined.breeds[0].colorPalette.length;
    withUndefined.breeds[0].colorPalette.push(undefined);
    expect(errorPairs(validateBreedsConfig(withUndefined))).toEqual([
      [`$.breeds[0].colorPalette[${len}]`, 'INVALID_TYPE'],
    ]);

    const withHole = breeds();
    punchHole(withHole.breeds[1].colorPalette, 0);
    expect(errorPairs(validateBreedsConfig(withHole))).toEqual([['$.breeds[1].colorPalette[0]', 'INVALID_TYPE']]);
  });

  it('colorPalette 僅含空洞（length 1）不得視為非空色盤而通過', () => {
    const data = breeds();
    data.breeds[0].colorPalette = [];
    data.breeds[0].colorPalette.length = 1;
    expect(errorPairs(validateBreedsConfig(data))).toEqual([['$.breeds[0].colorPalette[0]', 'INVALID_TYPE']]);
  });
});

describe('traits：圖層 pool 之 undefined 元素與空洞不得繞過權重總和檢查', () => {
  it('weight 0.5 ＋ undefined 元素 → INVALID_TYPE（不得 ok: true）', () => {
    const data = traits();
    data.traitPools.domestic.coatPattern = [{ trait: 'tabby_mackerel', weight: 0.5 }, undefined];
    const result = validateTraitsConfig(data);
    expect(result.ok).toBe(false);
    expect(errorPairs(result)).toEqual([['$.traitPools.domestic.coatPattern[1]', 'INVALID_TYPE']]);
  });

  it('weight 0.5 ＋ 稀疏空洞 → INVALID_TYPE（不得 ok: true）', () => {
    const data = traits();
    data.traitPools.domestic.coatPattern = [{ trait: 'tabby_mackerel', weight: 0.5 }];
    appendHole(data.traitPools.domestic.coatPattern);
    const result = validateTraitsConfig(data);
    expect(result.ok).toBe(false);
    expect(errorPairs(result)).toEqual([['$.traitPools.domestic.coatPattern[1]', 'INVALID_TYPE']]);
  });

  it('單一權重 1.0 項目之前置空洞亦拒絕', () => {
    const data = traits();
    const pool: unknown[] = [];
    pool[1] = { trait: 'standard_round', weight: 1 };
    data.traitPools.domestic.head = pool;
    expect(errorPairs(validateTraitsConfig(data))).toEqual([['$.traitPools.domestic.head[0]', 'INVALID_TYPE']]);
  });

  it('僅含空洞之 pool（length 1）不得視為非空而通過', () => {
    const data = traits();
    data.traitPools.domestic.body = [];
    data.traitPools.domestic.body.length = 1;
    expect(errorPairs(validateTraitsConfig(data))).toEqual([['$.traitPools.domestic.body[0]', 'INVALID_TYPE']]);
  });

  it('對照組：undefined 以外之 0.5 單項仍回報 WEIGHT_SUM_MISMATCH', () => {
    const data = traits();
    data.traitPools.domestic.coatPattern = [{ trait: 'tabby_mackerel', weight: 0.5 }];
    expect(errorPairs(validateTraitsConfig(data))).toEqual([['$.traitPools.domestic.coatPattern', 'WEIGHT_SUM_MISMATCH']]);
  });
});

describe('compatibility：rules 之 undefined 元素與空洞', () => {
  it('rules 尾端 undefined → $.rules[3] INVALID_TYPE', () => {
    const data = compat();
    data.rules.push(undefined);
    expect(errorPairs(validateAppearanceCompatibilityConfig(data))).toEqual([['$.rules[3]', 'INVALID_TYPE']]);
  });

  it('rules 中間空洞 → $.rules[1] INVALID_TYPE', () => {
    const data = compat();
    punchHole(data.rules, 1);
    expect(errorPairs(validateAppearanceCompatibilityConfig(data))).toEqual([['$.rules[1]', 'INVALID_TYPE']]);
  });

  it('rules 僅含空洞（length 1）不得視為非空而通過，亦不得繞過 safeDefaultAppearance 檢查', () => {
    const data = compat();
    data.rules = [];
    data.rules.length = 1;
    expect(errorPairs(validateAppearanceCompatibilityConfig(data))).toEqual([['$.rules[0]', 'INVALID_TYPE']]);
  });
});

describe('food catalog：items 之 undefined 元素與空洞', () => {
  it('items 尾端 undefined → $.items[8] INVALID_TYPE', () => {
    const data = catalog();
    expect(data.items.length).toBe(8);
    data.items.push(undefined);
    expect(errorPairs(validateFoodCatalogConfig(data))).toEqual([['$.items[8]', 'INVALID_TYPE']]);
  });

  it('items 尾端稀疏空洞 → $.items[8] INVALID_TYPE', () => {
    const data = catalog();
    expect(appendHole(data.items)).toBe(8);
    expect(errorPairs(validateFoodCatalogConfig(data))).toEqual([['$.items[8]', 'INVALID_TYPE']]);
  });

  it('items 中間空洞 → 該索引 INVALID_TYPE，其餘項目唯一性索引不位移', () => {
    const data = catalog();
    data.items.push(mutable(data.items[0]));
    punchHole(data.items, 3);
    expect(errorPairs(validateFoodCatalogConfig(data))).toEqual([
      ['$.items[3]', 'INVALID_TYPE'],
      ['$.items[8].itemId', 'DUPLICATE_ITEM_ID'],
    ]);
  });

  it('validateGameConfig：catalog 含空洞時整體拒絕', () => {
    const foodCatalog = mutable(BUILT_IN_DEFAULT_CONFIG.foodCatalog);
    appendHole(foodCatalog.items);
    const result = validateGameConfig({ ...BUILT_IN_DEFAULT_CONFIG, foodCatalog });
    expect(result.ok).toBe(false);
    expect(errorCodes(result)).toEqual(['INVALID_TYPE']);
  });
});

// ---------------------------------------------------------------------------
// validateGameConfig 頂層（OBS-02）
// ---------------------------------------------------------------------------

describe('validateGameConfig 頂層非物件輸入零例外', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['array', []],
    ['string', 'config'],
    ['number', 1],
    ['boolean', true],
  ])('%s → <config> $ INVALID_TYPE', (_name, bad) => {
    let result: ReturnType<typeof validateGameConfig> | undefined;
    expect(() => {
      result = validateGameConfig(bad as never);
    }).not.toThrow();
    expect(result?.ok).toBe(false);
    if (result === undefined || result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ file: '<config>', path: '$', code: 'INVALID_TYPE' });
  });

  it('空物件 → 4 份設定各自回報頂層 INVALID_TYPE', () => {
    const result = validateGameConfig({} as never);
    expect(errorPairs(result)).toEqual([
      ['$', 'INVALID_TYPE'],
      ['$', 'INVALID_TYPE'],
      ['$', 'INVALID_TYPE'],
      ['$', 'INVALID_TYPE'],
    ]);
  });

  it('對照組：內建預設設定仍通過', () => {
    expect(validateGameConfig(BUILT_IN_DEFAULT_CONFIG).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mergeCatalogFeed 頂層與 incoming（OBS-02、DEF-01、OBS-01）
// ---------------------------------------------------------------------------

describe('mergeCatalogFeed 頂層非物件輸入零例外', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['array', []],
    ['string', 'feed'],
    ['number', 0],
  ])('%s → <import> $ INVALID_TYPE', (_name, bad) => {
    let result: ReturnType<typeof mergeCatalogFeed> | undefined;
    expect(() => {
      result = mergeCatalogFeed(bad as never);
    }).not.toThrow();
    expect(result?.ok).toBe(false);
    if (result === undefined || result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ file: '<import>', path: '$', code: 'INVALID_TYPE' });
  });
});

describe('mergeCatalogFeed：incoming 之 undefined 元素與空洞拒絕整批', () => {
  const existing = () => readContentJson('products/food-catalog.v1.json') as FoodCatalogConfig;
  const manualItem = () => makeItem({ itemId: 'manual_new' });

  it('incoming 含 undefined 元素 → $[1] INVALID_TYPE', () => {
    const result = mergeCatalogFeed({
      existing: existing(),
      incoming: [manualItem(), undefined],
      mode: 'manual',
      syncedAt: SYNCED_AT,
    });
    expect(errorPairs(result)).toEqual([['$[1]', 'INVALID_TYPE']]);
  });

  it('incoming 含稀疏空洞 → $[0] INVALID_TYPE', () => {
    const incoming: unknown[] = [];
    incoming[1] = manualItem();
    const result = mergeCatalogFeed({ existing: existing(), incoming, mode: 'manual', syncedAt: SYNCED_AT });
    expect(errorPairs(result)).toEqual([['$[0]', 'INVALID_TYPE']]);
  });

  it('incoming 僅含空洞（length 1）不得視為空批次成功', () => {
    const incoming: unknown[] = [];
    incoming.length = 1;
    const result = mergeCatalogFeed({ existing: existing(), incoming, mode: 'manual', syncedAt: SYNCED_AT });
    expect(errorPairs(result)).toEqual([['$[0]', 'INVALID_TYPE']]);
  });

  it('外部模式 incoming 含空洞亦拒絕（不額外誤報 EXTERNAL_ID_REQUIRED）', () => {
    const incoming: unknown[] = [];
    incoming.length = 1;
    const result = mergeCatalogFeed({ existing: existing(), incoming, mode: 'partner_csv', syncedAt: SYNCED_AT });
    expect(errorPairs(result)).toEqual([['$[0]', 'INVALID_TYPE']]);
  });

  it('parseCatalogJson 傳回之含空洞陣列經合併後拒絕', () => {
    const raw: unknown[] = [manualItem()];
    appendHole(raw);
    const parsed = parseCatalogJson(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = mergeCatalogFeed({ existing: existing(), incoming: parsed.data, mode: 'manual', syncedAt: SYNCED_AT });
    expect(errorPairs(result)).toEqual([['$[1]', 'INVALID_TYPE']]);
  });

  it('existing.items 含空洞 → 既有目錄驗證拒絕', () => {
    const data = mutable(existing());
    appendHole(data.items);
    const result = mergeCatalogFeed({ existing: data, incoming: [], mode: 'manual', syncedAt: SYNCED_AT });
    expect(errorPairs(result)).toEqual([['$.items[8]', 'INVALID_TYPE']]);
  });

  it('對照組：合法 manual 新品仍可合併', () => {
    const result = mergeCatalogFeed({
      existing: existing(),
      incoming: [manualItem()],
      mode: 'manual',
      syncedAt: SYNCED_AT,
    });
    expect(result.ok).toBe(true);
  });
});
