/**
 * `traits.v1.json` 驗證器（Master PRD v2.1.29 §8.A.2 第 1 點、§8.A.3 第 1 點；S1-02 設計 §4.2 第 2 點、§4.5 第 2 點）。
 */
import {
  APPEARANCE_LAYER_NAMES,
  APPEARANCE_LAYER_TRAITS,
  BREED_IDS,
  RARE_MUTATION_TRAITS,
  type AppearanceLayerName,
  type TraitsConfig,
} from '@shinuan/contracts';
import type { ValidationResult } from '../types';
import {
  ErrorCollector,
  checkVersion,
  describeValue,
  expectArray,
  expectEnum,
  expectFiniteNumber,
  expectObject,
  finish,
} from './common';

export const TRAITS_FILE = 'traits/traits.v1.json';

/** 權重總和與 1.0 之允許誤差（設計 §4.2）。 */
export const TRAIT_WEIGHT_SUM_TOLERANCE = 1e-9;

const ROOT_KEYS = ['version', 'traitPools'] as const;
const WEIGHTED_KEYS = ['trait', 'weight'] as const;

const RARE_VALUES: ReadonlyMap<AppearanceLayerName, string> = new Map(
  Object.entries(RARE_MUTATION_TRAITS) as [AppearanceLayerName, string][],
);

function checkLayerPool(c: ErrorCollector, value: unknown, path: string, layer: AppearanceLayerName): void {
  const pool = expectArray(c, value, path);
  if (pool === undefined) return;
  if (pool.length === 0) {
    c.add(path, 'EMPTY_TRAIT_POOL', `Trait pool for layer "${layer}" must not be empty.`);
    return;
  }
  const seen = new Set<string>();
  let sum = 0;
  let weightsValid = true;
  pool.forEach((entry, index) => {
    const p = `${path}[${index}]`;
    const obj = expectObject(c, entry, p, WEIGHTED_KEYS);
    if (obj === undefined) {
      weightsValid = false;
      return;
    }
    const trait = expectEnum(c, obj['trait'], `${p}.trait`, APPEARANCE_LAYER_TRAITS[layer] as readonly string[]);
    if (trait !== undefined) {
      if (RARE_VALUES.get(layer) === trait) {
        c.add(
          `${p}.trait`,
          'RARE_MUTATION_IN_DEFAULT_POOL',
          `Rare mutation "${trait}" must not appear in a default trait pool (mutation path only).`,
        );
      }
      if (seen.has(trait)) {
        c.add(`${p}.trait`, 'DUPLICATE_TRAIT', `Trait "${trait}" appears more than once in this pool.`);
      }
      seen.add(trait);
    }
    const weight = expectFiniteNumber(c, obj['weight'], `${p}.weight`);
    if (weight === undefined) {
      weightsValid = false;
    } else if (weight <= 0) {
      c.add(`${p}.weight`, 'NON_POSITIVE_WEIGHT', `weight must be > 0 but got ${weight}.`);
      weightsValid = false;
    } else {
      sum += weight;
    }
  });
  if (weightsValid && Math.abs(sum - 1) >= TRAIT_WEIGHT_SUM_TOLERANCE) {
    c.add(path, 'WEIGHT_SUM_MISMATCH', `Weights must sum to 1.0 (got ${sum}).`);
  }
}

/** 驗證 `TraitsConfig`：6 品種 × 7 圖層、合法枚舉、禁稀有突變、無重複、權重 > 0 且總和 1.0。 */
export function validateTraitsConfig(input: unknown, file: string = TRAITS_FILE): ValidationResult<TraitsConfig> {
  const c = new ErrorCollector(file);
  if (input === undefined) {
    c.add('$', 'INVALID_TYPE', `Expected object but got ${describeValue(input)}.`);
    return finish(c, input);
  }
  const root = expectObject(c, input, '$', ROOT_KEYS);
  if (root === undefined) return finish(c, input);
  checkVersion(c, root['version'], '$.version');

  const pools = expectObject(c, root['traitPools'], '$.traitPools', BREED_IDS);
  if (pools !== undefined) {
    for (const breed of BREED_IDS) {
      const breedPath = `$.traitPools.${breed}`;
      const breedPool = expectObject(c, pools[breed], breedPath, APPEARANCE_LAYER_NAMES);
      if (breedPool === undefined) continue;
      for (const layer of APPEARANCE_LAYER_NAMES) {
        if (breedPool[layer] === undefined) continue;
        checkLayerPool(c, breedPool[layer], `${breedPath}.${layer}`, layer);
      }
    }
  }
  return finish(c, input);
}
