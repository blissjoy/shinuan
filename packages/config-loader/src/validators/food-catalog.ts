/**
 * `food-catalog.v1.json` 驗證器（Master PRD v2.1.29 §2.1、§8.C.2；S1-02 設計 §4.2 第 4 點、§4.5）。
 *
 * 級距天花板一律依 `FOOD_PRICE_TIER_RULES` 硬檢核，不因 `sponsored` 身分放寬任何數值。
 */
import {
  FEED_SOURCE_TYPES,
  FOOD_CATEGORIES,
  FOOD_PRICE_TIER_RULES,
  PRODUCT_DATA_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  type FoodCatalogConfig,
  type FoodCategory,
  type PriceTierRule,
  type ProductType,
} from '@shinuan/contracts';
import type { ValidationResult } from '../types';
import {
  ErrorCollector,
  checkVersion,
  expectArray,
  expectEnum,
  expectFiniteNumber,
  expectNullableString,
  expectObject,
  expectString,
  finish,
  forEachArrayElement,
  isValidHttpUrl,
  isValidIsoDate,
  isValidIsoTimestamp,
  rejectUndefinedRoot,
} from './common';

export const FOOD_CATALOG_FILE = 'products/food-catalog.v1.json';

const ROOT_KEYS = ['version', 'items'] as const;
const ITEM_KEYS = ['itemId', 'externalSource', 'vendorInfo', 'gameBalance'] as const;
const EXTERNAL_SOURCE_KEYS = ['partnerId', 'externalSkuId', 'feedSourceType', 'syncedAt'] as const;
const VENDOR_INFO_KEYS = [
  'name',
  'productType',
  'dataType',
  'imageUrl',
  'purchaseUrl',
  'promoCode',
  'nutrition',
  'ingredients',
  'sourceName',
  'sourceUrl',
  'dataVerifiedAt',
  'lastReviewedAt',
  'disclaimer',
] as const;
const NUTRITION_KEYS = ['crudeProteinPercent', 'crudeFatPercent', 'moisturePercent'] as const;
const GAME_BALANCE_KEYS = ['category', 'price', 'gameEffect', 'status'] as const;
const EFFECT_KEYS = ['hunger', 'hydration', 'mood'] as const;

/** 依 `(category, price)` 找出所有匹配級距（正常情況恰 1 筆）。 */
export function findPriceTiers(category: FoodCategory, price: number): readonly PriceTierRule[] {
  return FOOD_PRICE_TIER_RULES.filter(
    (rule) => rule.category === category && price >= rule.price.min && price <= rule.price.max,
  );
}

export interface FoodCatalogItemCheckOptions {
  /**
   * true（預設）：執行 productType/price 一致性與 7 級距天花板硬檢核。
   * false：僅驗證 `gameBalance` 與 `productType` 之結構與型別（外部匯入來源之丟棄欄位，Q15-B）。
   */
  readonly enforceGameBalanceRules?: boolean;
}

export interface CheckedItemKeys {
  readonly itemId: string | undefined;
  readonly partnerId: string | null | undefined;
  readonly externalSkuId: string | null | undefined;
}

/** 檢查單筆商品（內部共用：目錄驗證器與批次匯入來源結構驗證）。 */
export function checkFoodCatalogItem(
  c: ErrorCollector,
  value: unknown,
  path: string,
  options: FoodCatalogItemCheckOptions = {},
): CheckedItemKeys {
  const enforce = options.enforceGameBalanceRules !== false;
  const keys: { itemId: string | undefined; partnerId: string | null | undefined; externalSkuId: string | null | undefined } =
    { itemId: undefined, partnerId: undefined, externalSkuId: undefined };
  if (value === undefined) {
    c.add(path, 'INVALID_TYPE', 'Expected object but got undefined.');
    return keys;
  }
  const item = expectObject(c, value, path, ITEM_KEYS);
  if (item === undefined) return keys;
  keys.itemId = expectString(c, item['itemId'], `${path}.itemId`, { nonEmpty: true });

  // externalSource
  const es = expectObject(c, item['externalSource'], `${path}.externalSource`, EXTERNAL_SOURCE_KEYS);
  if (es !== undefined) {
    const p = `${path}.externalSource`;
    keys.partnerId = expectNullableString(c, es['partnerId'], `${p}.partnerId`, { nonEmpty: true });
    keys.externalSkuId = expectNullableString(c, es['externalSkuId'], `${p}.externalSkuId`, { nonEmpty: true });
    expectEnum(c, es['feedSourceType'], `${p}.feedSourceType`, FEED_SOURCE_TYPES);
    const syncedAt = expectNullableString(c, es['syncedAt'], `${p}.syncedAt`);
    if (typeof syncedAt === 'string' && !isValidIsoTimestamp(syncedAt)) {
      c.add(`${p}.syncedAt`, 'INVALID_ISO_TIMESTAMP', `"${syncedAt}" is not a valid full ISO-8601 timestamp.`);
    }
  }

  // vendorInfo
  let productType: ProductType | undefined;
  const vi = expectObject(c, item['vendorInfo'], `${path}.vendorInfo`, VENDOR_INFO_KEYS);
  if (vi !== undefined) {
    const p = `${path}.vendorInfo`;
    expectString(c, vi['name'], `${p}.name`, { nonEmpty: true });
    productType = expectEnum(c, vi['productType'], `${p}.productType`, PRODUCT_TYPES);
    const dataType = expectEnum(c, vi['dataType'], `${p}.dataType`, PRODUCT_DATA_TYPES);
    expectNullableString(c, vi['imageUrl'], `${p}.imageUrl`);
    expectNullableString(c, vi['purchaseUrl'], `${p}.purchaseUrl`);
    expectNullableString(c, vi['promoCode'], `${p}.promoCode`);
    const nutrition = expectObject(c, vi['nutrition'], `${p}.nutrition`, NUTRITION_KEYS);
    if (nutrition !== undefined) {
      for (const key of NUTRITION_KEYS) {
        const n = expectFiniteNumber(c, nutrition[key], `${p}.nutrition.${key}`);
        if (n !== undefined && (n < 0 || n > 100)) {
          c.add(`${p}.nutrition.${key}`, 'PERCENT_OUT_OF_RANGE', `${key} must be within [0, 100] but got ${n}.`);
        }
      }
    }
    expectString(c, vi['ingredients'], `${p}.ingredients`, { nonEmpty: true });
    expectString(c, vi['sourceName'], `${p}.sourceName`, { nonEmpty: true });
    const sourceUrl = expectNullableString(c, vi['sourceUrl'], `${p}.sourceUrl`);
    if (typeof sourceUrl === 'string' && !isValidHttpUrl(sourceUrl)) {
      c.add(`${p}.sourceUrl`, 'INVALID_URL', `"${sourceUrl}" is not a valid http:// or https:// URL.`);
    }
    const dataVerifiedAt = expectNullableString(c, vi['dataVerifiedAt'], `${p}.dataVerifiedAt`);
    if (typeof dataVerifiedAt === 'string' && !isValidIsoDate(dataVerifiedAt)) {
      c.add(`${p}.dataVerifiedAt`, 'INVALID_DATE', `"${dataVerifiedAt}" is not a valid YYYY-MM-DD date.`);
    }
    const lastReviewedAt = expectNullableString(c, vi['lastReviewedAt'], `${p}.lastReviewedAt`);
    if (typeof lastReviewedAt === 'string' && !isValidIsoDate(lastReviewedAt)) {
      c.add(`${p}.lastReviewedAt`, 'INVALID_DATE', `"${lastReviewedAt}" is not a valid YYYY-MM-DD date.`);
    }
    expectNullableString(c, vi['disclaimer'], `${p}.disclaimer`);
    if (dataType === 'real') {
      if (vi['sourceUrl'] === null) {
        c.add(`${p}.sourceUrl`, 'REAL_SOURCE_URL_REQUIRED', 'sourceUrl is required when dataType is "real".');
      }
      if (vi['dataVerifiedAt'] === null) {
        c.add(
          `${p}.dataVerifiedAt`,
          'REAL_DATA_VERIFIED_AT_REQUIRED',
          'dataVerifiedAt is required when dataType is "real".',
        );
      }
    }
  }

  // gameBalance
  const gb = expectObject(c, item['gameBalance'], `${path}.gameBalance`, GAME_BALANCE_KEYS);
  if (gb !== undefined) {
    const p = `${path}.gameBalance`;
    const category = expectEnum(c, gb['category'], `${p}.category`, FOOD_CATEGORIES);
    const price = expectFiniteNumber(c, gb['price'], `${p}.price`);
    expectEnum(c, gb['status'], `${p}.status`, PRODUCT_STATUSES);
    const effect = expectObject(c, gb['gameEffect'], `${p}.gameEffect`, EFFECT_KEYS);
    const effects: Partial<Record<(typeof EFFECT_KEYS)[number], number>> = {};
    if (effect !== undefined) {
      for (const key of EFFECT_KEYS) {
        const n = expectFiniteNumber(c, effect[key], `${p}.gameEffect.${key}`);
        if (n !== undefined) effects[key] = n;
      }
    }

    if (enforce && price !== undefined) {
      if (productType === 'free' && price !== 0) {
        c.add(`${p}.price`, 'FREE_ITEM_PRICE_NOT_ZERO', `Free items must have price 0 (got ${price}).`);
      } else if ((productType === 'regular' || productType === 'sponsored') && !(price > 0)) {
        c.add(`${p}.price`, 'PAID_ITEM_PRICE_NOT_POSITIVE', `${productType} items must have price > 0 (got ${price}).`);
      }
      if (category !== undefined) {
        const tiers = findPriceTiers(category, price);
        if (tiers.length === 0) {
          c.add(
            `${p}.price`,
            'PRICE_TIER_NOT_FOUND',
            `No price tier matches category "${category}" with price ${price}.`,
          );
        } else if (tiers.length > 1) {
          c.add(
            `${p}.price`,
            'PRICE_TIER_AMBIGUOUS',
            `More than one price tier matches category "${category}" with price ${price}.`,
          );
        } else {
          const tier = tiers[0] as PriceTierRule;
          for (const key of EFFECT_KEYS) {
            const n = effects[key];
            if (n === undefined) continue;
            const range = tier[key];
            if (n < range.min || n > range.max) {
              c.add(
                `${p}.gameEffect.${key}`,
                'EFFECT_OUT_OF_TIER_RANGE',
                `${key} ${n} is outside tier ${category}/${tier.tier} range [${range.min}, ${range.max}].`,
              );
            }
          }
        }
      }
    }
  }
  return keys;
}

/** 空洞／undefined 元素之佔位鍵值（不參與唯一性比對）。 */
const ABSENT_ITEM_KEYS: CheckedItemKeys = Object.freeze({ itemId: undefined, partnerId: undefined, externalSkuId: undefined });

/**
 * 以索引式走訪逐筆檢查商品陣列（空洞或 undefined 元素回報 `INVALID_TYPE`，S1-02B DEF-01／OBS-01）。
 * 回傳與輸入等長、無空洞之鍵值陣列，供 `checkItemUniqueness` 以原索引回報。
 */
export function checkFoodCatalogItems(
  c: ErrorCollector,
  items: readonly unknown[],
  basePath: string,
  options: FoodCatalogItemCheckOptions = {},
): CheckedItemKeys[] {
  const keys: CheckedItemKeys[] = Array.from({ length: items.length }, () => ABSENT_ITEM_KEYS);
  forEachArrayElement(c, items, basePath, (item, index, path) => {
    keys[index] = checkFoodCatalogItem(c, item, path, options);
  });
  return keys;
}

/** 檢查一批商品之 itemId 與 `(partnerId, externalSkuId)` 唯一性。 */
export function checkItemUniqueness(c: ErrorCollector, keys: readonly CheckedItemKeys[], basePath: string): void {
  const ids = new Map<string, number>();
  const externals = new Map<string, number>();
  keys.forEach((k, index) => {
    if (k.itemId !== undefined) {
      const first = ids.get(k.itemId);
      if (first !== undefined) {
        c.add(
          `${basePath}[${index}].itemId`,
          'DUPLICATE_ITEM_ID',
          `itemId "${k.itemId}" duplicates ${basePath}[${first}].`,
        );
      } else {
        ids.set(k.itemId, index);
      }
    }
    if (typeof k.partnerId === 'string' && typeof k.externalSkuId === 'string') {
      const key = JSON.stringify([k.partnerId, k.externalSkuId]);
      const first = externals.get(key);
      if (first !== undefined) {
        c.add(
          `${basePath}[${index}].externalSource`,
          'DUPLICATE_EXTERNAL_KEY',
          `(partnerId, externalSkuId) = ("${k.partnerId}", "${k.externalSkuId}") duplicates ${basePath}[${first}].`,
        );
      } else {
        externals.set(key, index);
      }
    }
  });
}

/** 驗證 `FoodCatalogConfig`：三區塊結構、唯一性、來源欄位規則與 7 級距天花板硬檢核。 */
export function validateFoodCatalogConfig(
  input: unknown,
  file: string = FOOD_CATALOG_FILE,
): ValidationResult<FoodCatalogConfig> {
  const c = new ErrorCollector(file);
  if (rejectUndefinedRoot(c, input)) return finish(c, input);
  const root = expectObject(c, input, '$', ROOT_KEYS);
  if (root === undefined) return finish(c, input);
  checkVersion(c, root['version'], '$.version');
  const items = expectArray(c, root['items'], '$.items');
  if (items !== undefined) {
    const keys = checkFoodCatalogItems(c, items, '$.items');
    checkItemUniqueness(c, keys, '$.items');
  }
  return finish(c, input);
}
