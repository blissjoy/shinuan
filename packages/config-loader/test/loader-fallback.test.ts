/**
 * SHINUAN-S1-02 loadGameConfig 嚴格失敗與可控 Fallback 測試（設計 §4.3；PRD §10.2 第 1 點、§2.1 第 1 點）。
 */
import { cpSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILT_IN_DEFAULT_CONFIG, CONTENT_FILES, loadGameConfig, type LoadGameConfigResult } from '../src/index';
import { REPO_CONTENT_DIR, mutable, readContentJson } from './fixtures';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'shinuan-s1-02-loader-'));
  for (const rel of Object.values(CONTENT_FILES)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    cpSync(join(REPO_CONTENT_DIR, rel), join(dir, rel), { recursive: true });
  }
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const write = (rel: string, content: string | Uint8Array) => writeFileSync(join(dir, rel), content);
const writeJson = (rel: string, value: unknown) => write(rel, JSON.stringify(value, null, 2));

function codes(result: LoadGameConfigResult): string[] {
  if (!result.ok) return result.errors.map((e) => e.code);
  return result.source === 'fallback' ? result.fallbackReason.map((e) => e.code) : [];
}

type Breaker = [name: string, expectedCode: string, file: string, apply: () => void];

const BREAKERS: Breaker[] = [
  ['缺檔', 'FILE_NOT_FOUND', CONTENT_FILES.traits, () => unlinkSync(join(dir, CONTENT_FILES.traits))],
  ['壞 JSON', 'INVALID_JSON', CONTENT_FILES.breeds, () => write(CONTENT_FILES.breeds, '{ "version": "v1", ')],
  [
    'BOM',
    'INVALID_ENCODING',
    CONTENT_FILES.appearanceCompatibility,
    () =>
      write(
        CONTENT_FILES.appearanceCompatibility,
        Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON.stringify(readContentJson(CONTENT_FILES.appearanceCompatibility)))]),
      ),
  ],
  [
    '非法級距設定',
    'EFFECT_OUT_OF_TIER_RANGE',
    CONTENT_FILES.foodCatalog,
    () => {
      const data = mutable(readContentJson(CONTENT_FILES.foodCatalog));
      data.items[5].gameBalance.gameEffect.hunger = 35; // 贊助商品嘗試突破頂級天花板
      writeJson(CONTENT_FILES.foodCatalog, data);
    },
  ],
  [
    '非法結構（未知欄位）',
    'UNKNOWN_FIELD',
    CONTENT_FILES.traits,
    () => {
      const data = mutable(readContentJson(CONTENT_FILES.traits));
      data.extra = 1;
      writeJson(CONTENT_FILES.traits, data);
    },
  ],
];

describe('loadGameConfig 嚴格模式（預設 allowFallback: false）', () => {
  it('正常載入回傳 source: content', async () => {
    const result = await loadGameConfig({ contentDir: dir });
    expect(result).toMatchObject({ ok: true, source: 'content' });
  });

  it.each(BREAKERS)('%s → { ok: false, errors }，絕不回傳設定', async (_name, code, file, apply) => {
    apply();
    for (const options of [{ contentDir: dir }, { contentDir: dir, allowFallback: false }]) {
      const result = await loadGameConfig(options);
      expect(result.ok).toBe(false);
      expect('config' in result).toBe(false);
      if (result.ok) return;
      expect(result.errors.map((e) => e.code)).toContain(code);
      expect(result.errors.some((e) => e.file === file)).toBe(true);
    }
  });

  it('多檔同時失敗時彙整所有錯誤', async () => {
    unlinkSync(join(dir, CONTENT_FILES.breeds));
    write(CONTENT_FILES.foodCatalog, 'not json');
    const result = await loadGameConfig({ contentDir: dir });
    expect(codes(result).sort()).toEqual(['FILE_NOT_FOUND', 'INVALID_JSON']);
  });

  it('contentDir 不存在 → FILE_NOT_FOUND；contentDir 非法 → INVALID_CONTENT_DIR', async () => {
    const missing = await loadGameConfig({ contentDir: join(dir, 'nope') });
    expect(codes(missing)).toEqual(['FILE_NOT_FOUND', 'FILE_NOT_FOUND', 'FILE_NOT_FOUND', 'FILE_NOT_FOUND']);
    const empty = await loadGameConfig({ contentDir: '' });
    expect(codes(empty)).toEqual(['INVALID_CONTENT_DIR']);
  });

  it('allowFallback 非布林值 → INVALID_OPTION（不降級）', async () => {
    const result = await loadGameConfig({ contentDir: dir, allowFallback: 'yes' as unknown as boolean });
    expect(result.ok).toBe(false);
    expect(codes(result)).toEqual(['INVALID_OPTION']);
  });
});

describe('loadGameConfig 可控降級（allowFallback: true）', () => {
  it('正常載入時仍回傳 source: content', async () => {
    const result = await loadGameConfig({ contentDir: dir, allowFallback: true });
    expect(result.ok && result.source).toBe('content');
  });

  it.each(BREAKERS)('%s → 退回已驗證內建預設並附 fallbackReason', async (_name, code, file, apply) => {
    apply();
    const result = await loadGameConfig({ contentDir: dir, allowFallback: true });
    expect(result.ok).toBe(true);
    if (!result.ok || result.source !== 'fallback') throw new Error('expected fallback');
    expect(result.config).toStrictEqual(BUILT_IN_DEFAULT_CONFIG);
    expect(Object.isFrozen(result.config.foodCatalog)).toBe(true);
    expect(result.fallbackReason.map((e) => e.code)).toContain(code);
    expect(result.fallbackReason.some((e) => e.file === file)).toBe(true);
  });
});

describe('核心免費品必備檢查（REQUIRED_FREE_ITEM_MISSING）', () => {
  const variants: [string, (data: any) => void][] = [
    ['刪除 free_basic_kibble', (d) => d.items.splice(0, 1)],
    ['刪除 free_fresh_water', (d) => d.items.splice(1, 1)],
    ['free_basic_kibble 軟下架', (d) => (d.items[0].gameBalance.status = 'discontinued')],
    ['free_fresh_water 待審', (d) => (d.items[1].gameBalance.status = 'pending_review')],
    [
      'free_fresh_water 改為 regular 付費',
      (d) => {
        // 目錄本身仍通過級距驗證，但 free_fresh_water 被替換為付費贊助乾糧
        d.items[1] = structuredClone(d.items[6]);
        d.items[1].itemId = 'free_fresh_water';
      },
    ],
  ];

  it.each(variants)('%s → 嚴格模式失敗', async (_name, mutate) => {
    const data = mutable(readContentJson(CONTENT_FILES.foodCatalog));
    mutate(data);
    writeJson(CONTENT_FILES.foodCatalog, data);
    const strict = await loadGameConfig({ contentDir: dir });
    expect(strict.ok).toBe(false);
    expect(codes(strict)).toEqual(['REQUIRED_FREE_ITEM_MISSING']);
  });

  it.each(variants)('%s → allowFallback 時降級並附於 fallbackReason', async (_name, mutate) => {
    const data = mutable(readContentJson(CONTENT_FILES.foodCatalog));
    mutate(data);
    writeJson(CONTENT_FILES.foodCatalog, data);
    const result = await loadGameConfig({ contentDir: dir, allowFallback: true });
    expect(result.ok && result.source).toBe('fallback');
    expect(codes(result)).toEqual(['REQUIRED_FREE_ITEM_MISSING']);
  });
});

describe('內建預設亦無效時（防禦性）', () => {
  afterEach(() => {
    vi.doUnmock('../src/defaults');
    vi.resetModules();
  });

  it('allowFallback: true 但內建預設驗證失敗 → { ok: false } 並附 FALLBACK_CONFIG_INVALID', async () => {
    vi.resetModules();
    vi.doMock('../src/defaults', () => {
      const broken = structuredClone(BUILT_IN_DEFAULT_CONFIG) as any;
      broken.traits.traitPools.domestic.ears = [{ trait: 'folded_tip', weight: 1 }];
      return { BUILT_IN_DEFAULT_CONFIG: broken };
    });
    const { loadGameConfig: load } = await import('../src/loader');
    unlinkSync(join(dir, CONTENT_FILES.breeds));
    const result = await load({ contentDir: dir, allowFallback: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const all = result.errors.map((e) => e.code);
    expect(all).toContain('FILE_NOT_FOUND');
    expect(all).toContain('RARE_MUTATION_IN_DEFAULT_POOL');
    expect(all[all.length - 1]).toBe('FALLBACK_CONFIG_INVALID');
    expect(result.errors.some((e) => e.file.startsWith('BUILT_IN_DEFAULT_CONFIG:'))).toBe(true);
  });
});
