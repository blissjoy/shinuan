/**
 * `breeds.v1.json` 驗證器（Master PRD v2.1.29 §8.A.2；S1-02 設計 §4.2 第 1 點）。
 */
import { BREED_IDS, type BreedId, type BreedsConfig } from '@shinuan/contracts';
import type { ValidationResult } from '../types';
import {
  ErrorCollector,
  checkVersion,
  describeValue,
  expectArray,
  expectEnum,
  expectFiniteNumber,
  expectHex,
  expectObject,
  expectString,
  finish,
  isPlainObject,
} from './common';

export const BREEDS_FILE = 'genetics/breeds.v1.json';

const ROOT_KEYS = ['version', 'breeds'] as const;
const BREED_KEYS = ['id', 'displayName', 'basePersonality', 'colorPalette'] as const;
const PERSONALITY_KEYS = ['affection', 'laziness', 'tsundere', 'curiosity'] as const;
const SWATCH_KEYS = ['primary', 'secondaryHex'] as const;
const SINGLE_KEYS = ['kind', 'hex'] as const;
const RANGE_KEYS = ['kind', 'fromHex', 'toHex'] as const;
const COLOR_KINDS = ['single', 'range'] as const;

function checkSwatch(c: ErrorCollector, value: unknown, path: string): void {
  const swatch = expectObject(c, value, path, SWATCH_KEYS);
  if (swatch === undefined) return;
  const primaryPath = `${path}.primary`;
  const primary = swatch['primary'];
  if (primary !== undefined) {
    const rawKind = isPlainObject(primary) ? primary['kind'] : undefined;
    const kind = rawKind === 'single' || rawKind === 'range' ? rawKind : undefined;
    if (kind === undefined) {
      if (!isPlainObject(primary)) {
        c.add(primaryPath, 'INVALID_TYPE', `Expected object but got ${describeValue(primary)}.`);
      } else if (rawKind === undefined) {
        c.add(`${primaryPath}.kind`, 'MISSING_FIELD', 'Required field "kind" is missing.');
      } else {
        expectEnum(c, rawKind, `${primaryPath}.kind`, COLOR_KINDS);
      }
    } else if (kind === 'single') {
      const obj = expectObject(c, primary, primaryPath, SINGLE_KEYS);
      if (obj !== undefined) expectHex(c, obj['hex'], `${primaryPath}.hex`);
    } else {
      const obj = expectObject(c, primary, primaryPath, RANGE_KEYS);
      if (obj !== undefined) {
        expectHex(c, obj['fromHex'], `${primaryPath}.fromHex`);
        expectHex(c, obj['toHex'], `${primaryPath}.toHex`);
      }
    }
  }
  const secondary = swatch['secondaryHex'];
  if (secondary !== undefined && secondary !== null) {
    expectHex(c, secondary, `${path}.secondaryHex`);
  }
}

/** 驗證 `BreedsConfig`：精確包含 6 品種、性格 [0,100]、色盤非空且色碼合法。 */
export function validateBreedsConfig(input: unknown, file: string = BREEDS_FILE): ValidationResult<BreedsConfig> {
  const c = new ErrorCollector(file);
  if (input === undefined) {
    c.add('$', 'INVALID_TYPE', `Expected object but got ${describeValue(input)}.`);
    return finish(c, input);
  }
  const root = expectObject(c, input, '$', ROOT_KEYS);
  if (root === undefined) return finish(c, input);
  checkVersion(c, root['version'], '$.version');

  const breeds = expectArray(c, root['breeds'], '$.breeds');
  if (breeds !== undefined) {
    const seen = new Set<BreedId>();
    breeds.forEach((entry, index) => {
      const path = `$.breeds[${index}]`;
      const breed = expectObject(c, entry, path, BREED_KEYS);
      if (breed === undefined) return;
      const id = expectEnum(c, breed['id'], `${path}.id`, BREED_IDS);
      if (id !== undefined) {
        if (seen.has(id)) c.add(`${path}.id`, 'DUPLICATE_BREED', `Breed "${id}" is defined more than once.`);
        seen.add(id);
      }
      expectString(c, breed['displayName'], `${path}.displayName`);

      const personality = expectObject(c, breed['basePersonality'], `${path}.basePersonality`, PERSONALITY_KEYS);
      if (personality !== undefined) {
        for (const key of PERSONALITY_KEYS) {
          const p = `${path}.basePersonality.${key}`;
          const n = expectFiniteNumber(c, personality[key], p);
          if (n !== undefined && (n < 0 || n > 100)) {
            c.add(p, 'PERSONALITY_OUT_OF_RANGE', `${key} must be within [0, 100] but got ${n}.`);
          }
        }
      }

      const palette = expectArray(c, breed['colorPalette'], `${path}.colorPalette`);
      if (palette !== undefined) {
        if (palette.length === 0) {
          c.add(`${path}.colorPalette`, 'EMPTY_COLOR_PALETTE', 'colorPalette must not be empty.');
        }
        palette.forEach((swatch, i) => checkSwatch(c, swatch, `${path}.colorPalette[${i}]`));
      }
    });
    for (const id of BREED_IDS) {
      if (!seen.has(id)) c.add('$.breeds', 'BREED_MISSING', `Breed "${id}" is missing.`);
    }
  }
  return finish(c, input);
}
