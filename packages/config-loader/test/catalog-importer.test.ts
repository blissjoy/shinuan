/**
 * SHINUAN-S1-02 商品批次匯入驗證核心與 CLI 測試（設計 §4.4、§4.5；PRD §2.2、§8.C.2）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FoodCatalogConfig, FoodCatalogItem } from '@shinuan/contracts';
import {
  CATALOG_CSV_COLUMNS,
  isValidIsoTimestamp,
  mergeCatalogFeed,
  parseCatalogCsv,
  parseCatalogJson,
  type MergeCatalogFeedInput,
} from '../src/index';
import { REPO_ROOT, errorCodes, makeItem, mutable, readContentJson } from './fixtures';

const SYNCED_AT = '2026-11-25T08:00:00.000Z';
const HEADER = CATALOG_CSV_COLUMNS.join(',');

type CsvRow = Record<(typeof CATALOG_CSV_COLUMNS)[number], string>;

function csvRow(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    itemId: 'p1_can',
    partnerId: 'p1',
    externalSkuId: 'SKU-1',
    feedSourceType: 'partner_csv',
    name: '夥伴主食罐',
    productType: 'sponsored',
    dataType: 'real',
    category: 'wet_food',
    price: '90',
    hunger: '26',
    hydration: '21',
    mood: '8',
    status: 'active',
    crudeProteinPercent: '13',
    crudeFatPercent: '5',
    moisturePercent: '79',
    ingredients: '雞肉',
    sourceName: '夥伴官方網站',
    sourceUrl: 'https://partner.example.com/p1',
    dataVerifiedAt: '2026-11-01',
    lastReviewedAt: '',
    disclaimer: '',
    imageUrl: '',
    purchaseUrl: '',
    promoCode: '',
    ...overrides,
  };
}

const quote = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toCsv = (rows: CsvRow[], eol = '\n') =>
  [HEADER, ...rows.map((r) => CATALOG_CSV_COLUMNS.map((c) => quote(r[c])).join(','))].join(eol) + eol;

/** 合作夥伴既有商品（同一 partner p1）。 */
function partnerItem(overrides: Parameters<typeof makeItem>[0] = {}): FoodCatalogItem {
  return makeItem({
    itemId: 'p1_can',
    ...overrides,
    externalSource: {
      partnerId: 'p1',
      externalSkuId: 'SKU-1',
      feedSourceType: 'partner_csv',
      syncedAt: '2026-01-01T00:00:00Z',
      ...overrides.externalSource,
    },
    vendorInfo: { productType: 'sponsored', ...overrides.vendorInfo },
    gameBalance: { price: 90, gameEffect: { hunger: 26, hydration: 21, mood: 8 }, ...overrides.gameBalance },
  });
}

function existingWith(...extra: FoodCatalogItem[]): FoodCatalogConfig {
  const base = readContentJson('products/food-catalog.v1.json') as FoodCatalogConfig;
  return { version: base.version, items: [...base.items, ...extra] };
}

function merge(partial: Partial<MergeCatalogFeedInput> & { incoming: unknown }) {
  return mergeCatalogFeed({ existing: existingWith(), mode: 'partner_csv', syncedAt: SYNCED_AT, ...partial });
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

describe('parseCatalogCsv', () => {
  it('解析合法 CSV 為三區塊結構，空字串可為 null 欄位轉 null，數值轉 number', () => {
    const result = parseCatalogCsv(toCsv([csvRow()]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      {
        itemId: 'p1_can',
        externalSource: { partnerId: 'p1', externalSkuId: 'SKU-1', feedSourceType: 'partner_csv', syncedAt: null },
        vendorInfo: {
          name: '夥伴主食罐',
          productType: 'sponsored',
          dataType: 'real',
          imageUrl: null,
          purchaseUrl: null,
          promoCode: null,
          nutrition: { crudeProteinPercent: 13, crudeFatPercent: 5, moisturePercent: 79 },
          ingredients: '雞肉',
          sourceName: '夥伴官方網站',
          sourceUrl: 'https://partner.example.com/p1',
          dataVerifiedAt: '2026-11-01',
          lastReviewedAt: null,
          disclaimer: null,
        },
        gameBalance: { category: 'wet_food', price: 90, gameEffect: { hunger: 26, hydration: 21, mood: 8 }, status: 'active' },
      },
    ]);
  });

  it('partnerId／externalSkuId 空字串解析為 null', () => {
    const result = parseCatalogCsv(toCsv([csvRow({ partnerId: '', externalSkuId: '' })]));
    expect(result.ok && (result.data[0] as FoodCatalogItem).externalSource).toMatchObject({
      partnerId: null,
      externalSkuId: null,
    });
  });

  it('RFC 4180：雙引號包覆、"" 跳脫、欄位內逗號與內嵌 CRLF/LF；CRLF 行尾', () => {
    const name = '【測試】"超級"罐, 雞肉口味';
    const ingredients = '雞肉\r\n魚油\n維生素';
    const result = parseCatalogCsv(toCsv([csvRow({ name, ingredients })], '\r\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const item = result.data[0] as FoodCatalogItem;
    expect(item.vendorInfo.name).toBe(name);
    expect(item.vendorInfo.ingredients).toBe(ingredients);
  });

  it('純空白行（含檔尾換行與多個空行）略過；檔尾無換行亦可', () => {
    const rows = toCsv([csvRow(), csvRow({ itemId: 'p1_b', externalSkuId: 'SKU-2' })]);
    const withBlanks = `\n  \n${rows.replace('\n', '\n\n \t \n')}\n\n`;
    const a = parseCatalogCsv(withBlanks);
    expect(a.ok && a.data.length).toBe(2);
    const b = parseCatalogCsv(rows.trimEnd());
    expect(b.ok && b.data.length).toBe(2);
    const headerOnly = parseCatalogCsv(`${HEADER}\r\n`);
    expect(headerOnly.ok && headerOnly.data.length).toBe(0);
  });

  it('標題列必填且 25 欄名稱與順序完全一致', () => {
    expect(errorCodes(parseCatalogCsv(''))).toEqual(['CSV_HEADER_MISSING']);
    expect(errorCodes(parseCatalogCsv(' \n\n'))).toEqual(['CSV_HEADER_MISSING']);
    const body = toCsv([csvRow()]).split('\n').slice(1).join('\n');
    expect(errorCodes(parseCatalogCsv(body))).toEqual(['CSV_HEADER_MISMATCH']);
    const swapped = [...CATALOG_CSV_COLUMNS];
    [swapped[1], swapped[2]] = [swapped[2]!, swapped[1]!];
    expect(errorCodes(parseCatalogCsv(`${swapped.join(',')}\n`))).toEqual(['CSV_HEADER_MISMATCH']);
    expect(errorCodes(parseCatalogCsv(`${HEADER},extra\n`))).toEqual(['CSV_HEADER_MISMATCH']);
    expect(errorCodes(parseCatalogCsv(`${CATALOG_CSV_COLUMNS.slice(0, 24).join(',')}\n`))).toEqual(['CSV_HEADER_MISMATCH']);
    expect(errorCodes(parseCatalogCsv(`${HEADER.replace('itemId', 'ItemId')}\n`))).toEqual(['CSV_HEADER_MISMATCH']);
  });

  it('itemId 為空（含純空白）即拒絕整批', () => {
    const result = parseCatalogCsv(toCsv([csvRow(), csvRow({ itemId: '' })]));
    expect(errorCodes(result)).toEqual(['ITEM_ID_REQUIRED']);
    expect(errorCodes(parseCatalogCsv(toCsv([csvRow({ itemId: '  ' })])))).toEqual(['ITEM_ID_REQUIRED']);
  });

  it('欄數不符、非法數值、未閉合引號、引號位置錯誤、單獨 CR、BOM 皆拒絕', () => {
    const short = `${HEADER}\n${CATALOG_CSV_COLUMNS.map((c) => csvRow()[c]).slice(0, 24).join(',')}\n`;
    expect(errorCodes(parseCatalogCsv(short))).toEqual(['CSV_COLUMN_COUNT_MISMATCH']);
    for (const bad of ['', 'abc', '1e2', '0x10', ' 90', '90 ', '9,0', 'NaN', 'Infinity']) {
      const codes = errorCodes(parseCatalogCsv(toCsv([csvRow({ price: bad })])));
      expect(codes, JSON.stringify(bad)).toEqual(['CSV_INVALID_NUMBER']);
    }
    expect(parseCatalogCsv(toCsv([csvRow({ hydration: '+21', hunger: '26.0' })])).ok).toBe(true);
    expect(errorCodes(parseCatalogCsv(`${HEADER}\n"p1_can,p1\n`))).toEqual(['CSV_UNTERMINATED_QUOTE']);
    expect(errorCodes(parseCatalogCsv(`${HEADER}\nab"c,${'x,'.repeat(23)}x\n`))).toEqual(['CSV_INVALID_QUOTE']);
    expect(errorCodes(parseCatalogCsv(`${HEADER}\n"ab"c,${'x,'.repeat(23)}x\n`))).toEqual(['CSV_INVALID_QUOTE']);
    expect(errorCodes(parseCatalogCsv(`${HEADER}\r${HEADER}`))).toEqual(['CSV_INVALID_LINE_BREAK']);
    expect(errorCodes(parseCatalogCsv(`﻿${toCsv([csvRow()])}`))).toEqual(['INVALID_ENCODING']);
  });
});

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

describe('parseCatalogJson', () => {
  it('同時接受 FoodCatalogConfig 與 FoodCatalogItem[]', () => {
    const items = [partnerItem()];
    expect(parseCatalogJson(items)).toEqual({ ok: true, data: items });
    expect(parseCatalogJson({ version: 'v1', items })).toEqual({ ok: true, data: items });
  });

  it('包裝物件未知欄位、缺欄位、非物件拒絕', () => {
    expect(errorCodes(parseCatalogJson({ version: 'v1', items: [], extra: 1 }))).toEqual(['UNKNOWN_FIELD']);
    expect(errorCodes(parseCatalogJson({ items: [] }))).toEqual(['MISSING_FIELD']);
    expect(errorCodes(parseCatalogJson({ version: '', items: [] }))).toEqual(['INVALID_VERSION']);
    expect(errorCodes(parseCatalogJson({ version: 'v1', items: {} }))).toEqual(['INVALID_TYPE']);
    for (const bad of [null, 'x', 1, undefined]) expect(errorCodes(parseCatalogJson(bad))).toEqual(['INVALID_TYPE']);
  });
});

// ---------------------------------------------------------------------------
// mergeCatalogFeed：共通
// ---------------------------------------------------------------------------

describe('mergeCatalogFeed 共通檢核', () => {
  it('syncedAt 須為有效完整 ISO-8601，否則拒絕整批', () => {
    for (const bad of ['2026-11-25', '2026-11-25T08:00:00', 'now', '']) {
      expect(errorCodes(merge({ incoming: [], syncedAt: bad })), bad).toEqual(['INVALID_ISO_TIMESTAMP']);
    }
  });

  it('mode 非法拒絕整批', () => {
    expect(errorCodes(merge({ incoming: [], mode: 'ftp' as never }))).toEqual(['INVALID_IMPORT_MODE']);
  });

  it('既有目錄合併前先驗證，不合法即拒絕整批', () => {
    const existing = mutable(existingWith());
    existing.items[2].gameBalance.gameEffect.mood = 50;
    expect(errorCodes(merge({ existing, incoming: [] }))).toEqual(['EFFECT_OUT_OF_TIER_RANGE']);
    expect(errorCodes(merge({ existing: [], incoming: [] }))).toEqual(['INVALID_TYPE']);
  });

  it('incoming 非陣列拒絕', () => {
    expect(errorCodes(merge({ incoming: { version: 'v1', items: [] } }))).toEqual(['INVALID_TYPE']);
  });

  it('每筆 feedSourceType 必須與 mode 一致', () => {
    const item = partnerItem({ externalSource: { feedSourceType: 'partner_api' } });
    expect(errorCodes(merge({ incoming: [item] }))).toEqual(['FEED_SOURCE_TYPE_MISMATCH']);
    expect(errorCodes(merge({ incoming: [makeItem({ itemId: 'x' })] }))).toContain('FEED_SOURCE_TYPE_MISMATCH');
  });

  it('同批重複 itemId 或重複 (partnerId, externalSkuId) 拒絕整批', () => {
    const a = partnerItem({ itemId: 'n1', externalSource: { externalSkuId: 'N-1' } });
    const b = partnerItem({ itemId: 'n1', externalSource: { externalSkuId: 'N-2' } });
    expect(errorCodes(merge({ incoming: [a, b] }))).toEqual(['DUPLICATE_ITEM_ID']);
    const c = partnerItem({ itemId: 'n2', externalSource: { externalSkuId: 'N-1' } });
    expect(errorCodes(merge({ incoming: [a, c] }))).toEqual(['DUPLICATE_EXTERNAL_KEY']);
  });

  it('來源未知欄位拒絕（JSON 嚴格結構）', () => {
    const item = mutable(partnerItem({ itemId: 'n1', externalSource: { externalSkuId: 'N-1' } }));
    item.gameBalance.sponsorBoost = 5;
    expect(errorCodes(merge({ incoming: [item] }))).toEqual(['UNKNOWN_FIELD']);
  });

  it('來源 itemId 為空拒絕整批', () => {
    const item = partnerItem({ itemId: '', externalSource: { externalSkuId: 'N-1' } });
    expect(errorCodes(merge({ incoming: [item] }))).toEqual(['EMPTY_STRING']);
  });
});

// ---------------------------------------------------------------------------
// mergeCatalogFeed：manual
// ---------------------------------------------------------------------------

describe('mergeCatalogFeed：manual 官方建檔（Q3-A、Q7-C）', () => {
  it('命中 itemId 整筆取代（允許更新 gameBalance），syncedAt 一律 null，順序與 version 保留', () => {
    const existing = existingWith();
    const replaced = mutable(existing.items[2]);
    replaced.gameBalance.price = 70;
    replaced.gameBalance.gameEffect.hydration = 21;
    replaced.gameBalance.status = 'discontinued';
    replaced.externalSource.syncedAt = '2026-11-25T00:00:00Z';
    const result = mergeCatalogFeed({ existing, incoming: [replaced], mode: 'manual', syncedAt: SYNCED_AT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.updated).toEqual(['shop_chicken_can']);
    expect(result.data.catalog.version).toBe('v1');
    expect(result.data.catalog.items.map((i) => i.itemId)).toEqual(existing.items.map((i) => i.itemId));
    const item = result.data.catalog.items[2]!;
    expect(item.gameBalance).toEqual({ ...replaced.gameBalance });
    expect(item.externalSource.syncedAt).toBeNull();
  });

  it('新品 status 採來源值（可為 active）並附加於尾端', () => {
    const item = makeItem({ itemId: 'new_manual', gameBalance: { status: 'active' }, externalSource: { syncedAt: SYNCED_AT } });
    const result = mergeCatalogFeed({ existing: existingWith(), incoming: [item], mode: 'manual', syncedAt: SYNCED_AT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const last = result.data.catalog.items.at(-1)!;
    expect(last.itemId).toBe('new_manual');
    expect(last.gameBalance.status).toBe('active');
    expect(last.externalSource.syncedAt).toBeNull();
    expect(result.data.added).toEqual(['new_manual']);
  });

  it('manual 同樣嚴格檢核 7 級距天花板，違規拒絕整批', () => {
    const item = makeItem({ itemId: 'too_strong', gameBalance: { gameEffect: { mood: 9 } } });
    const result = mergeCatalogFeed({ existing: existingWith(), incoming: [item], mode: 'manual', syncedAt: SYNCED_AT });
    expect(errorCodes(result)).toEqual(['EFFECT_OUT_OF_TIER_RANGE']);
  });

  it('manual 新品與既有商品 (partnerId, externalSkuId) 衝突 → 合併後驗證拒絕', () => {
    const existing = existingWith(partnerItem());
    const dup = makeItem({ itemId: 'other', externalSource: { partnerId: 'p1', externalSkuId: 'SKU-1' } });
    const result = mergeCatalogFeed({ existing, incoming: [dup], mode: 'manual', syncedAt: SYNCED_AT });
    expect(errorCodes(result)).toEqual(['DUPLICATE_EXTERNAL_KEY']);
  });
});

// ---------------------------------------------------------------------------
// mergeCatalogFeed：外部模式
// ---------------------------------------------------------------------------

describe.each(['partner_csv', 'partner_api'] as const)('mergeCatalogFeed：外部模式 %s', (mode) => {
  const src = (overrides: Parameters<typeof partnerItem>[0] = {}) =>
    partnerItem({ ...overrides, externalSource: { feedSourceType: mode, ...overrides.externalSource } });
  const run = (existing: unknown, incoming: unknown[]) => mergeCatalogFeed({ existing, incoming, mode, syncedAt: SYNCED_AT });

  it('partnerId 與 externalSkuId 皆必填', () => {
    expect(errorCodes(run(existingWith(), [src({ externalSource: { partnerId: null } })]))).toEqual(['EXTERNAL_ID_REQUIRED']);
    expect(errorCodes(run(existingWith(), [src({ externalSource: { externalSkuId: null } })]))).toEqual(['EXTERNAL_ID_REQUIRED']);
  });

  it('全新商品強制 pending_review 並寫入注入之 syncedAt', () => {
    const fresh = src({ itemId: 'p1_new', externalSource: { externalSkuId: 'SKU-NEW', syncedAt: null }, gameBalance: { status: 'active' } });
    const result = run(existingWith(), [fresh]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const last = result.data.catalog.items.at(-1)!;
    expect(last.itemId).toBe('p1_new');
    expect(last.gameBalance.status).toBe('pending_review');
    expect(last.externalSource).toEqual({ partnerId: 'p1', externalSkuId: 'SKU-NEW', feedSourceType: mode, syncedAt: SYNCED_AT });
    expect(result.data.added).toEqual(['p1_new']);
  });

  it('全新商品仍須通過 7 級距全檢（贊助商品突破天花板拒絕）', () => {
    const fresh = src({ itemId: 'p1_new', externalSource: { externalSkuId: 'SKU-NEW' }, gameBalance: { gameEffect: { hunger: 30, hydration: 21, mood: 8 } } });
    expect(errorCodes(run(existingWith(), [fresh]))).toEqual(['EFFECT_OUT_OF_TIER_RANGE']);
  });

  it('合法命中：只更新 vendorInfo（保留 productType）與 syncedAt，gameBalance 與 externalSource 其他欄位完全保留', () => {
    const current = partnerItem({ externalSource: { feedSourceType: 'manual' } });
    const existing = existingWith(current);
    const incoming = src({
      vendorInfo: { name: '夥伴主食罐（新包裝）', productType: 'free', ingredients: '雞肉、南瓜' },
      gameBalance: { category: 'treat', price: 999, gameEffect: { hunger: 99, hydration: 99, mood: 99 }, status: 'discontinued' },
    });
    const result = run(existing, [incoming]);
    expect(result.ok ? [] : result.errors).toEqual([]);
    if (!result.ok) return;
    expect(result.data.updated).toEqual(['p1_can']);
    const merged = result.data.catalog.items.find((i) => i.itemId === 'p1_can')!;
    expect(merged.gameBalance).toEqual(current.gameBalance);
    expect(merged.vendorInfo.productType).toBe('sponsored');
    expect(merged.vendorInfo.name).toBe('夥伴主食罐（新包裝）');
    expect(merged.vendorInfo.ingredients).toBe('雞肉、南瓜');
    expect(merged.externalSource).toEqual({ ...current.externalSource, syncedAt: SYNCED_AT });
    expect(result.data.catalog.items.map((i) => i.itemId)).toEqual(existing.items.map((i) => i.itemId));
  });

  it('合法命中但來源 gameBalance 結構／型別非法仍拒絕（Q15-B）', () => {
    const existing = existingWith(partnerItem());
    const badEnum = src({ gameBalance: { category: 'toy' as never } });
    expect(errorCodes(run(existing, [badEnum]))).toEqual(['INVALID_ENUM_VALUE']);
    const badType = mutable(src());
    badType.gameBalance.price = '90';
    expect(errorCodes(run(existing, [badType]))).toEqual(['INVALID_TYPE']);
    const badProductType = src({ vendorInfo: { productType: 'vip' as never } });
    expect(errorCodes(run(existing, [badProductType]))).toEqual(['INVALID_ENUM_VALUE']);
  });

  it('合法命中時新 vendorInfo 仍須通過完整驗證（如 real 缺 sourceUrl）', () => {
    const existing = existingWith(partnerItem());
    const incoming = src({ vendorInfo: { dataType: 'real', sourceUrl: null, dataVerifiedAt: '2026-11-01' } });
    expect(errorCodes(run(existing, [incoming]))).toEqual(['REAL_SOURCE_URL_REQUIRED']);
  });

  it('(partnerId, externalSkuId) 命中既有商品但 itemId 不同 → 拒絕整批', () => {
    const existing = existingWith(partnerItem());
    const incoming = src({ itemId: 'p1_renamed' });
    expect(errorCodes(run(existing, [incoming]))).toEqual(['EXTERNAL_KEY_ITEM_ID_CONFLICT']);
  });

  it('(partnerId, externalSkuId) 命中 X 而 itemId 命中另一既有商品 Y → 拒絕整批', () => {
    const x = partnerItem();
    const y = partnerItem({ itemId: 'p1_other', externalSource: { externalSkuId: 'SKU-2' } });
    const incoming = src({ itemId: 'p1_other', externalSource: { externalSkuId: 'SKU-1' } });
    expect(errorCodes(run(existingWith(x, y), [incoming]))).toEqual(['EXTERNAL_KEY_ITEM_ID_CONFLICT']);
  });

  it('itemId 命中官方商品（partnerId null）→ 拒絕整批', () => {
    const incoming = src({ itemId: 'free_basic_kibble', externalSource: { externalSkuId: 'SKU-X' } });
    expect(errorCodes(run(existingWith(), [incoming]))).toEqual(['OFFICIAL_ITEM_OVERWRITE_FORBIDDEN']);
  });

  it('itemId 命中其他品牌商品 → 拒絕整批', () => {
    const other = partnerItem({ itemId: 'p2_can', externalSource: { partnerId: 'p2', externalSkuId: 'SKU-1' } });
    const incoming = src({ itemId: 'p2_can', externalSource: { externalSkuId: 'SKU-9' } });
    expect(errorCodes(run(existingWith(other), [incoming]))).toEqual(['PARTNER_MISMATCH']);
  });

  it('itemId 命中同品牌既有商品但 SKU 不同或既有為 null → 拒絕整批（Q14-A）', () => {
    const existing = existingWith(partnerItem());
    expect(errorCodes(run(existing, [src({ externalSource: { externalSkuId: 'SKU-OTHER' } })]))).toEqual([
      'EXTERNAL_SKU_MISMATCH',
    ]);
    const nullSku = existingWith(partnerItem({ externalSource: { externalSkuId: null } }));
    expect(errorCodes(run(nullSku, [src()]))).toEqual(['EXTERNAL_SKU_MISMATCH']);
  });

  it('任一筆違規即整批拒絕（不回傳部分結果）', () => {
    const good = src({ itemId: 'p1_new', externalSource: { externalSkuId: 'SKU-NEW' } });
    const bad = src({ itemId: 'free_fresh_water', externalSource: { externalSkuId: 'SKU-W' } });
    const result = run(existingWith(), [good, bad]);
    expect(result.ok).toBe(false);
    expect('data' in result).toBe(false);
  });
});

describe('CSV → 合併端到端', () => {
  it('partner_csv：更新既有＋新增新品，gameBalance 不被覆寫、新品 pending_review', () => {
    const existing = existingWith(partnerItem());
    const csv = toCsv([
      csvRow({ name: '夥伴主食罐 v2', price: '120', hunger: '28', mood: '9', status: 'active' }),
      csvRow({ itemId: 'p1_new', externalSkuId: 'SKU-2', price: '60', hunger: '25', hydration: '20', mood: '5', productType: 'regular' }),
    ]);
    const parsed = parseCatalogCsv(csv, 'feed.csv');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = mergeCatalogFeed({ existing, incoming: parsed.data, mode: 'partner_csv', syncedAt: SYNCED_AT });
    expect(result.ok ? [] : result.errors).toEqual([]);
    if (!result.ok) return;
    const updated = result.data.catalog.items.find((i) => i.itemId === 'p1_can')!;
    expect(updated.vendorInfo.name).toBe('夥伴主食罐 v2');
    expect(updated.gameBalance).toEqual(partnerItem().gameBalance);
    const added = result.data.catalog.items.at(-1)!;
    expect(added.itemId).toBe('p1_new');
    expect(added.gameBalance.status).toBe('pending_review');
  });
});

// ---------------------------------------------------------------------------
// CLI 實跑（tsx 子行程，暫存檔寫入系統暫存目錄）
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const TSX_CLI = require.resolve('tsx/cli');
const SCRIPT = join(REPO_ROOT, 'scripts', 'import-catalog.mjs');

function runCli(args: string[]) {
  const r = spawnSync(process.execPath, [TSX_CLI, SCRIPT, ...args], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe('scripts/import-catalog.mjs CLI', () => {
  let tmp: string;
  const p = (name: string) => join(tmp, name);

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'shinuan-s1-02-cli-'));
    writeFileSync(p('existing.json'), JSON.stringify(existingWith(partnerItem()), null, 2));
    writeFileSync(
      p('feed.csv'),
      toCsv([
        csvRow({ name: '夥伴主食罐 v2', price: '120' }),
        csvRow({ itemId: 'p1_new', externalSkuId: 'SKU-2' }),
      ]),
    );
    writeFileSync(p('feed-new.csv'), toCsv([csvRow(), csvRow({ itemId: 'p1_new', externalSkuId: 'SKU-2' })]));
    writeFileSync(p('bad.csv'), toCsv([csvRow({ itemId: 'p1_new', externalSkuId: 'SKU-2', hunger: '40' })]));
    writeFileSync(
      p('official.json'),
      JSON.stringify([
        partnerItem({ itemId: 'free_basic_kibble', externalSource: { externalSkuId: 'SKU-K', feedSourceType: 'partner_api' } }),
      ]),
    );
    const manual = mutable(readContentJson('products/food-catalog.v1.json'));
    writeFileSync(p('manual.json'), JSON.stringify(manual));
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('合法 partner_csv 匯入：exit 0 並寫出合併結果（含開頭 -- 透傳與 --synced-at）', () => {
    const out = p('out.json');
    const r = runCli(['--', '--mode', 'partner_csv', '--input', p('feed.csv'), '--existing', p('existing.json'), '--output', out, '--synced-at', SYNCED_AT]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('added=1 updated=1');
    const written = JSON.parse(readFileSync(out, 'utf8')) as FoodCatalogConfig;
    const updated = written.items.find((i) => i.itemId === 'p1_can')!;
    expect(updated.gameBalance).toEqual(partnerItem().gameBalance);
    expect(updated.externalSource.syncedAt).toBe(SYNCED_AT);
    expect(written.items.at(-1)?.gameBalance.status).toBe('pending_review');
  }, 60_000);

  it('未給 --synced-at 時由 CLI 注入執行當下 ISO 時間；未給 --existing 以空白基準', () => {
    const out = p('out-now.json');
    const r = runCli(['--mode', 'partner_csv', '--input', p('feed-new.csv'), '--output', out]);
    expect(r.status, r.stderr).toBe(0);
    const written = JSON.parse(readFileSync(out, 'utf8')) as FoodCatalogConfig;
    expect(written.version).toBe('v1');
    expect(written.items.map((i) => i.itemId)).toEqual(['p1_can', 'p1_new']);
    for (const item of written.items) {
      expect(isValidIsoTimestamp(item.externalSource.syncedAt ?? '')).toBe(true);
      expect(item.gameBalance.status).toBe('pending_review');
    }
  }, 60_000);

  it('合法 manual JSON 僅檢核（無 --output）：exit 0 且不寫檔', () => {
    const r = runCli(['--mode', 'manual', '--input', p('manual.json')]);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('nothing written');
  }, 60_000);

  it('級距違規：exit 1 且不寫出輸出檔', () => {
    const out = p('should-not-exist.json');
    const r = runCli(['--mode', 'partner_csv', '--input', p('bad.csv'), '--existing', p('existing.json'), '--output', out]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('EFFECT_OUT_OF_TIER_RANGE');
    expect(existsSync(out)).toBe(false);
  }, 60_000);

  it('外部來源篡改官方商品：exit 1', () => {
    const r = runCli(['--mode', 'partner_api', '--input', p('official.json'), '--existing', p('existing.json')]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('OFFICIAL_ITEM_OVERWRITE_FORBIDDEN');
  }, 60_000);

  it('缺少或非法 --mode、未知參數、缺 --input、非法 --synced-at：exit 2', () => {
    expect(runCli(['--input', p('feed.csv')]).status).toBe(2);
    expect(runCli(['--mode', 'auto', '--input', p('feed.csv')]).status).toBe(2);
    expect(runCli(['--mode', 'manual', '--input', p('feed.csv'), '--force']).status).toBe(2);
    expect(runCli(['--mode', 'manual']).status).toBe(2);
    expect(runCli(['--mode', 'partner_csv', '--input', p('feed.csv'), '--synced-at', '2026-11-25']).status).toBe(2);
  }, 60_000);

  it('輸入檔不存在：exit 1', () => {
    const r = runCli(['--mode', 'manual', '--input', p('missing.json')]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('FILE_NOT_FOUND');
  }, 60_000);
});
