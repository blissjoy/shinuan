/**
 * config-loader 測試共用工具（非測試檔）。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FoodCatalogItem } from '@shinuan/contracts';
import type { ValidationResult } from '../src/index';

/** 專案真實 content/ 根目錄。 */
export const REPO_CONTENT_DIR = fileURLToPath(new URL('../../../content/', import.meta.url));

/** 專案根目錄。 */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export function readContentJson(relative: string): unknown {
  return JSON.parse(readFileSync(`${REPO_CONTENT_DIR}${relative}`, 'utf8')) as unknown;
}

/** 深複製為可變物件，方便測試竄改。 */
export function mutable<T>(value: T): any {
  return structuredClone(value) as any;
}

export function errorCodes(result: ValidationResult<unknown>): string[] {
  return result.ok ? [] : result.errors.map((e) => e.code);
}

type DeepPartialItem = {
  itemId?: string;
  externalSource?: Partial<FoodCatalogItem['externalSource']>;
  vendorInfo?: Partial<Omit<FoodCatalogItem['vendorInfo'], 'nutrition'>> & {
    nutrition?: Partial<FoodCatalogItem['vendorInfo']['nutrition']>;
  };
  gameBalance?: Partial<Omit<FoodCatalogItem['gameBalance'], 'gameEffect'>> & {
    gameEffect?: Partial<FoodCatalogItem['gameBalance']['gameEffect']>;
  };
};

/** 建立一筆合法 wet_food 入門級 regular mock 商品，並套用覆寫。 */
export function makeItem(overrides: DeepPartialItem = {}): FoodCatalogItem {
  const base: FoodCatalogItem = {
    itemId: 'test_item',
    externalSource: { partnerId: null, externalSkuId: null, feedSourceType: 'manual', syncedAt: null },
    vendorInfo: {
      name: '測試主食罐',
      productType: 'regular',
      dataType: 'mock',
      imageUrl: null,
      purchaseUrl: null,
      promoCode: null,
      nutrition: { crudeProteinPercent: 12, crudeFatPercent: 5, moisturePercent: 78 },
      ingredients: '雞肉',
      sourceName: 'MVP 模擬測試資料',
      sourceUrl: null,
      dataVerifiedAt: null,
      lastReviewedAt: '2026-11-25',
      disclaimer: null,
    },
    gameBalance: {
      category: 'wet_food',
      price: 60,
      gameEffect: { hunger: 25, hydration: 20, mood: 5 },
      status: 'active',
    },
  };
  return {
    itemId: overrides.itemId ?? base.itemId,
    externalSource: { ...base.externalSource, ...overrides.externalSource },
    vendorInfo: {
      ...base.vendorInfo,
      ...overrides.vendorInfo,
      nutrition: { ...base.vendorInfo.nutrition, ...overrides.vendorInfo?.nutrition },
    },
    gameBalance: {
      ...base.gameBalance,
      ...overrides.gameBalance,
      gameEffect: { ...base.gameBalance.gameEffect, ...overrides.gameBalance?.gameEffect },
    },
  } as FoodCatalogItem;
}
