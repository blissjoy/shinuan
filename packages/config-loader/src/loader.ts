/**
 * 本機設定載入器與可控 Fallback（Master PRD v2.1.29 §5.1 第 2、5 點、§10.2 第 1 點；S1-02 設計 §4.3）。
 *
 * 嚴格模式絕不回傳部分或未驗證設定；`allowFallback: true` 時改用已再次驗證之內建預設。
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FoodCatalogConfig, ValidatedGameConfig } from '@shinuan/contracts';
import { BUILT_IN_DEFAULT_CONFIG } from './defaults';
import { parseJsonBytes } from './json-text';
import type { ConfigValidationError, LoadGameConfigOptions, LoadGameConfigResult, ValidationResult } from './types';
import { BREEDS_FILE, validateBreedsConfig } from './validators/breeds';
import { COMPATIBILITY_FILE, validateAppearanceCompatibilityConfig } from './validators/compatibility';
import { FOOD_CATALOG_FILE, validateFoodCatalogConfig } from './validators/food-catalog';
import { TRAITS_FILE, validateTraitsConfig } from './validators/traits';

/** 4 份設定檔相對於 contentDir 之路徑（POSIX 形式，亦作為錯誤之 file 標籤）。 */
export const CONTENT_FILES = Object.freeze({
  breeds: BREEDS_FILE,
  traits: TRAITS_FILE,
  appearanceCompatibility: COMPATIBILITY_FILE,
  foodCatalog: FOOD_CATALOG_FILE,
} as const);

/** 玩家免費照護底線必備品（PRD §2.1 第 1 點）與其應屬類別。 */
export const REQUIRED_FREE_ITEMS = Object.freeze([
  Object.freeze({ itemId: 'free_basic_kibble', category: 'kibble' }),
  Object.freeze({ itemId: 'free_fresh_water', category: 'water' }),
] as const);

/** 檢查免費基礎糧水存在且 `status === "active"`、`productType === "free"`、類別正確。 */
export function checkRequiredFreeItems(
  catalog: FoodCatalogConfig,
  file: string = FOOD_CATALOG_FILE,
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  for (const required of REQUIRED_FREE_ITEMS) {
    const index = catalog.items.findIndex((item) => item.itemId === required.itemId);
    const item = catalog.items[index];
    if (item === undefined) {
      errors.push({
        file,
        path: '$.items',
        code: 'REQUIRED_FREE_ITEM_MISSING',
        message: `Required free item "${required.itemId}" is missing.`,
      });
      continue;
    }
    const problems: string[] = [];
    if (item.gameBalance.status !== 'active') problems.push(`status is "${item.gameBalance.status}"`);
    if (item.vendorInfo.productType !== 'free') problems.push(`productType is "${item.vendorInfo.productType}"`);
    if (item.gameBalance.category !== required.category) problems.push(`category is "${item.gameBalance.category}"`);
    if (problems.length > 0) {
      errors.push({
        file,
        path: `$.items[${index}]`,
        code: 'REQUIRED_FREE_ITEM_MISSING',
        message: `Required free item "${required.itemId}" must be active, free and ${required.category} (${problems.join(', ')}).`,
      });
    }
  }
  return errors;
}

/** 以 4 個驗證器＋免費品檢查驗證一份完整設定（供 content 載入與內建預設共用）。 */
export function validateGameConfig(
  input: {
    readonly breeds: unknown;
    readonly traits: unknown;
    readonly appearanceCompatibility: unknown;
    readonly foodCatalog: unknown;
  },
  fileLabel: (file: string) => string = (file) => file,
): ValidationResult<ValidatedGameConfig> {
  const breeds = validateBreedsConfig(input.breeds, fileLabel(BREEDS_FILE));
  const traits = validateTraitsConfig(input.traits, fileLabel(TRAITS_FILE));
  const compat = validateAppearanceCompatibilityConfig(input.appearanceCompatibility, fileLabel(COMPATIBILITY_FILE));
  const catalog = validateFoodCatalogConfig(input.foodCatalog, fileLabel(FOOD_CATALOG_FILE));
  const errors: ConfigValidationError[] = [];
  for (const r of [breeds, traits, compat, catalog]) if (!r.ok) errors.push(...r.errors);
  if (catalog.ok) errors.push(...checkRequiredFreeItems(catalog.data, fileLabel(FOOD_CATALOG_FILE)));
  if (errors.length > 0 || !breeds.ok || !traits.ok || !compat.ok || !catalog.ok) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: Object.freeze({
      breeds: breeds.data,
      traits: traits.data,
      appearanceCompatibility: compat.data,
      foodCatalog: catalog.data,
    }),
  };
}

async function readJsonFile(contentDir: string, relativeFile: string): Promise<ValidationResult<unknown>> {
  let bytes: Uint8Array;
  try {
    bytes = await readFile(join(contentDir, ...relativeFile.split('/')));
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    if (code === 'ENOENT') {
      return {
        ok: false,
        errors: [{ file: relativeFile, path: '$', code: 'FILE_NOT_FOUND', message: 'Config file not found.' }],
      };
    }
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [{ file: relativeFile, path: '$', code: 'FILE_READ_ERROR', message: `Cannot read file: ${detail}` }],
    };
  }
  return parseJsonBytes(bytes, relativeFile);
}

async function loadFromContent(contentDir: unknown): Promise<ValidationResult<ValidatedGameConfig>> {
  if (typeof contentDir !== 'string' || contentDir.trim() === '') {
    return {
      ok: false,
      errors: [
        { file: '<options>', path: '$.contentDir', code: 'INVALID_CONTENT_DIR', message: 'contentDir must be a non-empty string.' },
      ],
    };
  }
  const [breeds, traits, compat, catalog] = await Promise.all([
    readJsonFile(contentDir, BREEDS_FILE),
    readJsonFile(contentDir, TRAITS_FILE),
    readJsonFile(contentDir, COMPATIBILITY_FILE),
    readJsonFile(contentDir, FOOD_CATALOG_FILE),
  ]);
  if (!breeds.ok || !traits.ok || !compat.ok || !catalog.ok) {
    const errors: ConfigValidationError[] = [];
    for (const r of [breeds, traits, compat, catalog]) if (!r.ok) errors.push(...r.errors);
    return { ok: false, errors };
  }
  return validateGameConfig({
    breeds: breeds.data,
    traits: traits.data,
    appearanceCompatibility: compat.data,
    foodCatalog: catalog.data,
  });
}

const FALLBACK_LABEL_PREFIX = 'BUILT_IN_DEFAULT_CONFIG:';

/**
 * 讀取 `contentDir` 下 4 份設定檔並完整驗證。
 * - 成功：`{ ok: true, config, source: 'content' }`。
 * - 失敗且未允許 Fallback：`{ ok: false, errors }`（絕不回傳部分設定）。
 * - 失敗且 `allowFallback: true`：再次驗證內建預設，有效則回傳 `source: 'fallback'` 並附 `fallbackReason`；
 *   內建預設亦無效時回傳 `{ ok: false, errors }`（含原始錯誤、內建預設錯誤與 `FALLBACK_CONFIG_INVALID`）。
 */
export async function loadGameConfig(options: LoadGameConfigOptions): Promise<LoadGameConfigResult> {
  const allowFallback: unknown = (options as { allowFallback?: unknown } | null | undefined)?.allowFallback;
  if (allowFallback !== undefined && typeof allowFallback !== 'boolean') {
    return {
      ok: false,
      errors: [
        { file: '<options>', path: '$.allowFallback', code: 'INVALID_OPTION', message: 'allowFallback must be a boolean.' },
      ],
    };
  }
  const contentDir: unknown = (options as { contentDir?: unknown } | null | undefined)?.contentDir;
  const loaded = await loadFromContent(contentDir);
  if (loaded.ok) return { ok: true, config: loaded.data, source: 'content' };
  if (allowFallback !== true) return { ok: false, errors: loaded.errors };

  const fallback = validateGameConfig(BUILT_IN_DEFAULT_CONFIG, (file) => `${FALLBACK_LABEL_PREFIX}${file}`);
  if (!fallback.ok) {
    return {
      ok: false,
      errors: [
        ...loaded.errors,
        ...fallback.errors,
        {
          file: 'BUILT_IN_DEFAULT_CONFIG',
          path: '$',
          code: 'FALLBACK_CONFIG_INVALID',
          message: 'Built-in default config failed validation; no config can be provided.',
        },
      ],
    };
  }
  return { ok: true, config: fallback.data, source: 'fallback', fallbackReason: loaded.errors };
}
