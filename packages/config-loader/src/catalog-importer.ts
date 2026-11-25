/**
 * 商業化商品批次匯入驗證核心（Master PRD v2.1.29 §2.2、§5.1 第 5 點、§8.C.2；S1-02 設計 §4.4、§4.5）。
 *
 * 純函式：不讀寫檔案、不呼叫系統時間（`syncedAt` 由呼叫端顯式注入）。
 * 任何違規一律拒絕整批（fail-closed），絕不回傳部分合併結果。
 */
import {
  FEED_SOURCE_TYPES,
  type FeedSourceType,
  type FoodCatalogConfig,
  type FoodCatalogItem,
} from '@shinuan/contracts';
import type { ConfigValidationError, ValidationResult } from './types';
import { ErrorCollector, checkVersion, describeValue, expectArray, expectObject, isValidIsoTimestamp } from './validators/common';
import { checkFoodCatalogItem, checkItemUniqueness, validateFoodCatalogConfig } from './validators/food-catalog';

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** CSV 標題列（25 欄，名稱與順序必須完全一致；設計 §4.4、§4.5 第 5 點）。 */
export const CATALOG_CSV_COLUMNS = Object.freeze([
  'itemId',
  'partnerId',
  'externalSkuId',
  'feedSourceType',
  'name',
  'productType',
  'dataType',
  'category',
  'price',
  'hunger',
  'hydration',
  'mood',
  'status',
  'crudeProteinPercent',
  'crudeFatPercent',
  'moisturePercent',
  'ingredients',
  'sourceName',
  'sourceUrl',
  'dataVerifiedAt',
  'lastReviewedAt',
  'disclaimer',
  'imageUrl',
  'purchaseUrl',
  'promoCode',
] as const);

type CsvColumn = (typeof CATALOG_CSV_COLUMNS)[number];

/** 空字串儲存格解析為 `null` 之欄位。 */
const NULLABLE_CSV_COLUMNS: ReadonlySet<CsvColumn> = new Set<CsvColumn>([
  'partnerId',
  'externalSkuId',
  'sourceUrl',
  'dataVerifiedAt',
  'lastReviewedAt',
  'disclaimer',
  'imageUrl',
  'purchaseUrl',
  'promoCode',
]);

const NUMERIC_CSV_COLUMNS: ReadonlySet<CsvColumn> = new Set<CsvColumn>([
  'price',
  'hunger',
  'hydration',
  'mood',
  'crudeProteinPercent',
  'crudeFatPercent',
  'moisturePercent',
]);

/** 十進位數值（可帶正負號與小數；拒絕空白、指數、十六進位等寬鬆寫法）。 */
const CSV_NUMBER_PATTERN = /^[+-]?\d+(?:\.\d+)?$/;

interface CsvRecord {
  readonly fields: string[];
  readonly line: number;
  /** 是否為未加引號之單一空白欄位（純空白行）。 */
  readonly blank: boolean;
}

/** RFC 4180 記錄切分（支援雙引號包覆、`""` 跳脫、欄位內逗號與 CRLF/LF）。 */
function splitCsvRecords(text: string, c: ErrorCollector): CsvRecord[] | undefined {
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false; // 目前欄位是否以引號開始
  let inQuotes = false;
  let afterClosingQuote = false;
  let anyQuoted = false;
  let line = 1;
  let recordLine = 1;
  const n = text.length;

  const endRecord = (): void => {
    fields.push(field);
    const blank = !anyQuoted && fields.length === 1 && (fields[0] ?? '').trim() === '';
    records.push({ fields, line: recordLine, blank });
    fields = [];
    field = '';
    quoted = false;
    afterClosingQuote = false;
    anyQuoted = false;
  };

  for (let i = 0; i < n; i += 1) {
    const ch = text[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
          afterClosingQuote = true;
        }
      } else {
        if (ch === '\n') line += 1;
        field += ch;
      }
      continue;
    }
    if (ch === ',') {
      fields.push(field);
      field = '';
      quoted = false;
      afterClosingQuote = false;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r') {
        if (text[i + 1] !== '\n') {
          c.add(`$line[${line}]`, 'CSV_INVALID_LINE_BREAK', 'Bare CR line break is not allowed (use CRLF or LF).');
          return undefined;
        }
        i += 1;
      }
      endRecord();
      line += 1;
      recordLine = line;
      continue;
    }
    if (afterClosingQuote) {
      c.add(`$line[${line}]`, 'CSV_INVALID_QUOTE', 'Unexpected character after closing quote.');
      return undefined;
    }
    if (ch === '"') {
      if (quoted || field !== '') {
        c.add(`$line[${line}]`, 'CSV_INVALID_QUOTE', 'Quote character inside an unquoted field.');
        return undefined;
      }
      quoted = true;
      inQuotes = true;
      anyQuoted = true;
      continue;
    }
    field += ch;
  }
  if (inQuotes) {
    c.add(`$line[${recordLine}]`, 'CSV_UNTERMINATED_QUOTE', 'Quoted field is not terminated.');
    return undefined;
  }
  // 檔尾無換行時收尾最後一筆；檔尾換行後之空字串不產生記錄
  if (field !== '' || fields.length > 0 || anyQuoted) endRecord();
  return records;
}

function csvValueToJson(column: CsvColumn, raw: string, c: ErrorCollector, path: string): unknown {
  if (NULLABLE_CSV_COLUMNS.has(column) && raw === '') return null;
  if (NUMERIC_CSV_COLUMNS.has(column)) {
    if (!CSV_NUMBER_PATTERN.test(raw)) {
      c.add(path, 'CSV_INVALID_NUMBER', `"${raw}" is not a valid decimal number.`);
      return undefined;
    }
    return Number(raw);
  }
  return raw;
}

/**
 * 解析商品 CSV 為三區塊商品原始物件陣列（尚未做結構／業務驗證，交由 `mergeCatalogFeed` 檢核）。
 * - 標題列必填，25 欄名稱與順序完全一致；純空白行（含檔尾換行）略過。
 * - 可為 null 欄位之空字串解析為 `null`；數值欄位須為十進位數字。
 * - `itemId` 為空（含純空白）即拒絕整批；`externalSource.syncedAt` 一律先填 `null`（由合併時注入）。
 */
export function parseCatalogCsv(text: string, file: string = '<csv>'): ValidationResult<readonly unknown[]> {
  const c = new ErrorCollector(file);
  if (typeof text !== 'string') {
    c.add('$', 'INVALID_TYPE', `Expected string but got ${describeValue(text)}.`);
    return { ok: false, errors: c.errors };
  }
  if (text.startsWith('﻿')) {
    c.add('$', 'INVALID_ENCODING', 'CSV text must not start with a BOM.');
    return { ok: false, errors: c.errors };
  }
  const records = splitCsvRecords(text, c);
  if (records === undefined) return { ok: false, errors: c.errors };
  const nonBlank = records.filter((r) => !r.blank);
  const header = nonBlank[0];
  if (header === undefined) {
    c.add('$', 'CSV_HEADER_MISSING', 'CSV header row is required.');
    return { ok: false, errors: c.errors };
  }
  const headerMatches =
    header.fields.length === CATALOG_CSV_COLUMNS.length &&
    header.fields.every((name, i) => name === CATALOG_CSV_COLUMNS[i]);
  if (!headerMatches) {
    c.add(
      `$line[${header.line}]`,
      'CSV_HEADER_MISMATCH',
      `CSV header must be exactly: ${CATALOG_CSV_COLUMNS.join(',')}`,
    );
    return { ok: false, errors: c.errors };
  }

  const items: unknown[] = [];
  nonBlank.slice(1).forEach((record, rowIndex) => {
    const rowPath = `$rows[${rowIndex}]`;
    if (record.fields.length !== CATALOG_CSV_COLUMNS.length) {
      c.add(
        `${rowPath}(line ${record.line})`,
        'CSV_COLUMN_COUNT_MISMATCH',
        `Expected ${CATALOG_CSV_COLUMNS.length} columns but got ${record.fields.length}.`,
      );
      return;
    }
    const v: Partial<Record<CsvColumn, unknown>> = {};
    CATALOG_CSV_COLUMNS.forEach((column, i) => {
      v[column] = csvValueToJson(column, record.fields[i] ?? '', c, `${rowPath}.${column}`);
    });
    if (typeof v.itemId !== 'string' || v.itemId.trim() === '') {
      c.add(`${rowPath}.itemId`, 'ITEM_ID_REQUIRED', 'itemId must not be empty.');
    }
    items.push({
      itemId: v.itemId,
      externalSource: {
        partnerId: v.partnerId,
        externalSkuId: v.externalSkuId,
        feedSourceType: v.feedSourceType,
        syncedAt: null,
      },
      vendorInfo: {
        name: v.name,
        productType: v.productType,
        dataType: v.dataType,
        imageUrl: v.imageUrl,
        purchaseUrl: v.purchaseUrl,
        promoCode: v.promoCode,
        nutrition: {
          crudeProteinPercent: v.crudeProteinPercent,
          crudeFatPercent: v.crudeFatPercent,
          moisturePercent: v.moisturePercent,
        },
        ingredients: v.ingredients,
        sourceName: v.sourceName,
        sourceUrl: v.sourceUrl,
        dataVerifiedAt: v.dataVerifiedAt,
        lastReviewedAt: v.lastReviewedAt,
        disclaimer: v.disclaimer,
      },
      gameBalance: {
        category: v.category,
        price: v.price,
        gameEffect: { hunger: v.hunger, hydration: v.hydration, mood: v.mood },
        status: v.status,
      },
    });
  });
  if (c.hasErrors) return { ok: false, errors: c.errors };
  return { ok: true, data: items };
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * 解析 JSON 匯入資料：接受 `FoodCatalogConfig`（`{ version, items }`，嚴格鍵值）或 `FoodCatalogItem[]`。
 * 回傳原始項目陣列（尚未做結構／業務驗證，交由 `mergeCatalogFeed` 檢核）。
 */
export function parseCatalogJson(value: unknown, file: string = '<json>'): ValidationResult<readonly unknown[]> {
  const c = new ErrorCollector(file);
  if (Array.isArray(value)) return { ok: true, data: value };
  const root = expectObject(c, value, '$', ['version', 'items']);
  if (root === undefined) {
    if (value === undefined) c.add('$', 'INVALID_TYPE', 'Expected object or array but got undefined.');
    return { ok: false, errors: c.errors };
  }
  checkVersion(c, root['version'], '$.version');
  const items = expectArray(c, root['items'], '$.items');
  if (c.hasErrors || items === undefined) return { ok: false, errors: c.errors };
  return { ok: true, data: items };
}

// ---------------------------------------------------------------------------
// 合併
// ---------------------------------------------------------------------------

export interface MergeCatalogFeedInput {
  /** 既有目錄（須為 `FoodCatalogConfig`，合併前完整驗證；不合法即拒絕整批）。 */
  readonly existing: unknown;
  /** 來源項目（`parseCatalogCsv`／`parseCatalogJson` 之結果或 `FoodCatalogItem[]`）。 */
  readonly incoming: unknown;
  /** 匯入模式（CLI `--mode`）；每筆來源 `feedSourceType` 必須與之一致。 */
  readonly mode: FeedSourceType;
  /** 顯式注入之同步時間（有效完整 ISO-8601，含時區）。 */
  readonly syncedAt: string;
  /** 錯誤標籤（選填）。 */
  readonly existingFile?: string;
  readonly incomingFile?: string;
}

export interface MergeCatalogFeedResult {
  readonly catalog: FoodCatalogConfig;
  /** 新增之 itemId（依輸入順序）。 */
  readonly added: readonly string[];
  /** 更新之 itemId（依輸入順序）。 */
  readonly updated: readonly string[];
}

const EXTERNAL_MODES: ReadonlySet<string> = new Set<FeedSourceType>(['partner_csv', 'partner_api']);

function externalKey(partnerId: string | null, externalSkuId: string | null): string | undefined {
  return partnerId !== null && externalSkuId !== null ? JSON.stringify([partnerId, externalSkuId]) : undefined;
}

/**
 * 將來源項目合併至既有目錄（設計 §4.4、§4.5 第 4、6 點）。
 *
 * - `manual`：以 itemId 比對，命中整筆取代（含 gameBalance）；新品 status 採來源值；syncedAt 一律 null。
 * - `partner_csv`／`partner_api`：partnerId 與 externalSkuId 必填；僅允許命中同 partnerId 且 SKU 相符之既有商品，
 *   合法命中僅更新 vendorInfo（保留既有 productType）與 syncedAt，保留既有 gameBalance 與 externalSource 其他欄位；
 *   全新商品強制 `pending_review` 並寫入 syncedAt；任何鍵值衝突拒絕整批。
 * - 合併結果必須通過 `validateFoodCatalogConfig`（7 級距全檢），否則拒絕整批。
 */
export function mergeCatalogFeed(input: MergeCatalogFeedInput): ValidationResult<MergeCatalogFeedResult> {
  const incomingFile = input.incomingFile ?? '<incoming>';
  const existingFile = input.existingFile ?? '<existing>';
  const c = new ErrorCollector(incomingFile);

  // 1. 模式與 syncedAt
  const mode: unknown = input.mode;
  if (typeof mode !== 'string' || !(FEED_SOURCE_TYPES as readonly string[]).includes(mode)) {
    c.add('$mode', 'INVALID_IMPORT_MODE', `mode must be one of: ${FEED_SOURCE_TYPES.join(', ')}.`);
  }
  const syncedAt: unknown = input.syncedAt;
  if (typeof syncedAt !== 'string' || !isValidIsoTimestamp(syncedAt)) {
    c.add('$syncedAt', 'INVALID_ISO_TIMESTAMP', `syncedAt must be a valid full ISO-8601 timestamp (got ${JSON.stringify(syncedAt) ?? 'undefined'}).`);
  }

  // 2. 既有目錄
  const existingResult = validateFoodCatalogConfig(input.existing, existingFile);
  const errors: ConfigValidationError[] = [];
  if (!existingResult.ok) errors.push(...existingResult.errors);

  // 3. 來源結構（gameBalance／productType 僅驗結構與型別，Q15-B）
  const incoming = expectArray(c, input.incoming, '$');
  if (input.incoming === undefined) c.add('$', 'INVALID_TYPE', 'Expected array but got undefined.');
  if (incoming !== undefined) {
    const keys = incoming.map((item, index) =>
      checkFoodCatalogItem(c, item, `$[${index}]`, { enforceGameBalanceRules: false }),
    );
    checkItemUniqueness(c, keys, '$');
    incoming.forEach((raw, index) => {
      const fst = (raw as { externalSource?: { feedSourceType?: unknown } } | null)?.externalSource?.feedSourceType;
      if (typeof mode === 'string' && typeof fst === 'string' && fst !== mode) {
        c.add(
          `$[${index}].externalSource.feedSourceType`,
          'FEED_SOURCE_TYPE_MISMATCH',
          `feedSourceType "${fst}" does not match import mode "${mode}".`,
        );
      }
      const k = keys[index];
      if (k !== undefined && typeof mode === 'string' && EXTERNAL_MODES.has(mode)) {
        if (k.partnerId === null) {
          c.add(`$[${index}].externalSource.partnerId`, 'EXTERNAL_ID_REQUIRED', 'partnerId is required in external modes.');
        }
        if (k.externalSkuId === null) {
          c.add(
            `$[${index}].externalSource.externalSkuId`,
            'EXTERNAL_ID_REQUIRED',
            'externalSkuId is required in external modes.',
          );
        }
      }
    });
  }
  errors.push(...c.errors);
  if (errors.length > 0 || !existingResult.ok || incoming === undefined) return { ok: false, errors };

  // 以下所有輸入皆已通過結構驗證
  const existing = existingResult.data;
  const sources = incoming as readonly FoodCatalogItem[];
  const importMode = mode as FeedSourceType;
  const injectedSyncedAt = syncedAt as string;
  const merged: FoodCatalogItem[] = [...existing.items];
  const indexById = new Map<string, number>();
  const indexByKey = new Map<string, number>();
  existing.items.forEach((item, i) => {
    indexById.set(item.itemId, i);
    const key = externalKey(item.externalSource.partnerId, item.externalSource.externalSkuId);
    if (key !== undefined) indexByKey.set(key, i);
  });
  const added: string[] = [];
  const updated: string[] = [];
  const conflict = new ErrorCollector(incomingFile);

  sources.forEach((src, index) => {
    const path = `$[${index}]`;
    const byIdIndex = indexById.get(src.itemId);

    if (importMode === 'manual') {
      const item: FoodCatalogItem = { ...src, externalSource: { ...src.externalSource, syncedAt: null } };
      if (byIdIndex !== undefined) {
        merged[byIdIndex] = item;
        updated.push(src.itemId);
      } else {
        merged.push(item);
        added.push(src.itemId);
      }
      return;
    }

    const key = externalKey(src.externalSource.partnerId, src.externalSource.externalSkuId);
    const byKeyIndex = key === undefined ? undefined : indexByKey.get(key);
    if (byKeyIndex !== undefined) {
      const byKey = existing.items[byKeyIndex] as FoodCatalogItem;
      if (byKey.itemId !== src.itemId) {
        conflict.add(
          `${path}.itemId`,
          'EXTERNAL_KEY_ITEM_ID_CONFLICT',
          `(partnerId, externalSkuId) already belongs to existing item "${byKey.itemId}", not "${src.itemId}".`,
        );
        return;
      }
    }
    if (byIdIndex !== undefined) {
      const current = existing.items[byIdIndex] as FoodCatalogItem;
      if (current.externalSource.partnerId === null) {
        conflict.add(
          `${path}.itemId`,
          'OFFICIAL_ITEM_OVERWRITE_FORBIDDEN',
          `Existing item "${src.itemId}" is an official item (partnerId null) and cannot be updated by external feeds.`,
        );
        return;
      }
      if (current.externalSource.partnerId !== src.externalSource.partnerId) {
        conflict.add(
          `${path}.externalSource.partnerId`,
          'PARTNER_MISMATCH',
          `Existing item "${src.itemId}" belongs to partner "${current.externalSource.partnerId}".`,
        );
        return;
      }
      if (current.externalSource.externalSkuId !== src.externalSource.externalSkuId) {
        conflict.add(
          `${path}.externalSource.externalSkuId`,
          'EXTERNAL_SKU_MISMATCH',
          `Existing item "${src.itemId}" has externalSkuId ${JSON.stringify(current.externalSource.externalSkuId)}.`,
        );
        return;
      }
      merged[byIdIndex] = {
        itemId: current.itemId,
        externalSource: { ...current.externalSource, syncedAt: injectedSyncedAt },
        vendorInfo: { ...src.vendorInfo, productType: current.vendorInfo.productType },
        gameBalance: current.gameBalance,
      };
      updated.push(src.itemId);
      return;
    }
    merged.push({
      itemId: src.itemId,
      externalSource: { ...src.externalSource, syncedAt: injectedSyncedAt },
      vendorInfo: src.vendorInfo,
      gameBalance: { ...src.gameBalance, status: 'pending_review' },
    });
    added.push(src.itemId);
  });
  if (conflict.hasErrors) return { ok: false, errors: conflict.errors };

  // 4. 合併結果完整驗證（7 級距全檢）
  const final = validateFoodCatalogConfig({ version: existing.version, items: merged }, '<merged>');
  if (!final.ok) return { ok: false, errors: final.errors };
  return { ok: true, data: Object.freeze({ catalog: final.data, added: Object.freeze(added), updated: Object.freeze(updated) }) };
}

/** 合法匯入模式（與 `FeedSourceType` 相同；供 CLI `--mode` 檢核）。 */
export const CATALOG_IMPORT_MODES: readonly FeedSourceType[] = FEED_SOURCE_TYPES;

/** 未指定 `--existing` 時之空白合併基準（設計 §4.4）。 */
export function emptyCatalog(): FoodCatalogConfig {
  return { version: 'v1', items: [] };
}
