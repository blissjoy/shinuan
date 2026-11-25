/**
 * `appearance-compatibility.v1.json` 驗證器（Master PRD v2.1.29 §8.A.3 第 2 點；S1-02 設計 §4.2 第 3 點、§4.5 第 3 點）。
 *
 * 只驗證通用約束；Phase A 3 條固定規則之 id 與條件由 content-files 測試逐值核對（Q17-A）。
 * 本模組不執行任何相容修正（屬 S1-03 GeneticsEngine）。
 */
import {
  APPEARANCE_LAYER_NAMES,
  APPEARANCE_LAYER_TRAITS,
  type AppearanceCompatibilityConfig,
  type AppearanceLayerName,
} from '@shinuan/contracts';
import type { ValidationResult } from '../types';
import {
  ErrorCollector,
  checkVersion,
  expectArray,
  expectEnum,
  expectObject,
  expectPartialObject,
  expectString,
  finish,
  forEachArrayElement,
  rejectUndefinedRoot,
} from './common';

export const COMPATIBILITY_FILE = 'genetics/appearance-compatibility.v1.json';

const ROOT_KEYS = ['version', 'rules', 'safeDefaultAppearance'] as const;
const RULE_KEYS = ['id', 'order', 'when', 'set'] as const;

type LayerMap = Partial<Record<AppearanceLayerName, string>>;

/** 驗證 when/set：至少 1 個合法圖層鍵、值屬該圖層合法枚舉；回傳全部合法時之鍵值。 */
function checkLayerMap(
  c: ErrorCollector,
  value: unknown,
  path: string,
  emptyCode: string,
): LayerMap | undefined {
  const obj = expectPartialObject(c, value, path, APPEARANCE_LAYER_NAMES);
  if (obj === undefined) return undefined;
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    c.add(path, emptyCode, 'At least one appearance layer key is required.');
    return undefined;
  }
  const result: LayerMap = {};
  let valid = true;
  for (const key of keys) {
    if (!(APPEARANCE_LAYER_NAMES as readonly string[]).includes(key)) {
      valid = false; // UNKNOWN_FIELD 已回報
      continue;
    }
    const layer = key as AppearanceLayerName;
    const v = expectEnum(c, obj[layer], `${path}.${layer}`, APPEARANCE_LAYER_TRAITS[layer] as readonly string[]);
    if (v === undefined) valid = false;
    else result[layer] = v;
  }
  return valid ? result : undefined;
}

/** 驗證 `AppearanceCompatibilityConfig`：規則 id 唯一、order 正整數嚴格遞增、鍵值合法、安全預設不觸發任何規則。 */
export function validateAppearanceCompatibilityConfig(
  input: unknown,
  file: string = COMPATIBILITY_FILE,
): ValidationResult<AppearanceCompatibilityConfig> {
  const c = new ErrorCollector(file);
  if (rejectUndefinedRoot(c, input)) return finish(c, input);
  const root = expectObject(c, input, '$', ROOT_KEYS);
  if (root === undefined) return finish(c, input);
  checkVersion(c, root['version'], '$.version');

  const whens: LayerMap[] = [];
  const rules = expectArray(c, root['rules'], '$.rules');
  if (rules !== undefined) {
    if (rules.length === 0) c.add('$.rules', 'EMPTY_RULES', 'rules must not be empty.');
    const ids = new Set<string>();
    let previousOrder: number | undefined;
    forEachArrayElement(c, rules, '$.rules', (entry, _index, path) => {
      const rule = expectObject(c, entry, path, RULE_KEYS);
      if (rule === undefined) return;
      const id = expectString(c, rule['id'], `${path}.id`);
      if (id !== undefined) {
        if (ids.has(id)) c.add(`${path}.id`, 'DUPLICATE_RULE_ID', `Rule id "${id}" is not unique.`);
        ids.add(id);
      }
      const order = rule['order'];
      if (order !== undefined) {
        if (typeof order !== 'number' || !Number.isInteger(order) || order <= 0) {
          c.add(`${path}.order`, 'INVALID_RULE_ORDER', `order must be a positive integer but got ${String(order)}.`);
        } else {
          if (previousOrder !== undefined && order <= previousOrder) {
            c.add(
              `${path}.order`,
              'RULE_ORDER_NOT_INCREASING',
              `order must be strictly increasing (previous ${previousOrder}, got ${order}).`,
            );
          }
          previousOrder = order;
        }
      }
      const when = checkLayerMap(c, rule['when'], `${path}.when`, 'EMPTY_RULE_CONDITION');
      if (when !== undefined) whens.push(when);
      checkLayerMap(c, rule['set'], `${path}.set`, 'EMPTY_RULE_ACTION');
    });
  }

  const safe = expectObject(c, root['safeDefaultAppearance'], '$.safeDefaultAppearance', APPEARANCE_LAYER_NAMES);
  if (safe !== undefined) {
    let safeValid = true;
    for (const layer of APPEARANCE_LAYER_NAMES) {
      if (safe[layer] === undefined) {
        safeValid = false;
        continue;
      }
      const v = expectEnum(
        c,
        safe[layer],
        `$.safeDefaultAppearance.${layer}`,
        APPEARANCE_LAYER_TRAITS[layer] as readonly string[],
      );
      if (v === undefined) safeValid = false;
    }
    if (safeValid) {
      whens.forEach((when) => {
        const triggered = (Object.keys(when) as AppearanceLayerName[]).every((layer) => safe[layer] === when[layer]);
        if (triggered) {
          c.add(
            '$.safeDefaultAppearance',
            'SAFE_DEFAULT_TRIGGERS_RULE',
            `safeDefaultAppearance must not trigger any rule (matches when ${JSON.stringify(when)}).`,
          );
        }
      });
    }
  }
  return finish(c, input);
}
