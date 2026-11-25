/**
 * @shinuan/config-loader
 *
 * 外部設定讀取與 Schema 驗證入口（Master PRD v2.1.29 §5.1、§10.2；S1-02 設計）。
 * Game Core 只接收本套件驗證後注入的設定；本套件不含任何遊戲規則計算邏輯。
 */
export const CONFIG_LOADER_PACKAGE_NAME = '@shinuan/config-loader' as const;

export type {
  ConfigValidationError,
  LoadGameConfigOptions,
  LoadGameConfigResult,
  ValidationResult,
} from './types';

export { BREEDS_FILE, validateBreedsConfig } from './validators/breeds';
export { TRAITS_FILE, TRAIT_WEIGHT_SUM_TOLERANCE, validateTraitsConfig } from './validators/traits';
export { COMPATIBILITY_FILE, validateAppearanceCompatibilityConfig } from './validators/compatibility';
export { FOOD_CATALOG_FILE, findPriceTiers, validateFoodCatalogConfig } from './validators/food-catalog';
export { isValidIsoDate, isValidIsoTimestamp } from './validators/common';

export { BUILT_IN_DEFAULT_CONFIG } from './defaults';
export {
  CONTENT_FILES,
  REQUIRED_FREE_ITEMS,
  checkRequiredFreeItems,
  loadGameConfig,
  validateGameConfig,
} from './loader';
export { decodeUtf8Text, parseJsonBytes } from './json-text';
export {
  CATALOG_CSV_COLUMNS,
  CATALOG_IMPORT_MODES,
  emptyCatalog,
  mergeCatalogFeed,
  parseCatalogCsv,
  parseCatalogJson,
  type MergeCatalogFeedInput,
  type MergeCatalogFeedResult,
} from './catalog-importer';
