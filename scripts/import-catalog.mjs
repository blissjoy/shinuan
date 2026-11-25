#!/usr/bin/env node
// 拾暖商品批次匯入檢核 CLI（SHINUAN-S1-02；S1-02 設計 §4.4）。
//
// 透過 tsx 以相對路徑匯入 packages/config-loader/src/index.ts，共用同一份驗證核心（不複製驗證邏輯）。
//
// 用法：
//   corepack pnpm import-catalog -- --mode <manual|partner_csv|partner_api> --input <path.csv|path.json>
//                                   [--existing <catalog.json>] [--output <out.json>] [--synced-at <ISO-8601>]
//
// 退出碼：0 = 合法（有 --output 時已寫檔）；1 = 驗證違規（拒絕整批、不寫檔）；2 = 參數或用法錯誤。

import { readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  CATALOG_IMPORT_MODES,
  decodeUtf8Text,
  emptyCatalog,
  isValidIsoTimestamp,
  mergeCatalogFeed,
  parseCatalogCsv,
  parseCatalogJson,
  parseJsonBytes,
} from '../packages/config-loader/src/index.ts';

export const EXIT_OK = 0;
export const EXIT_VALIDATION_FAILED = 1;
export const EXIT_USAGE = 2;

const USAGE =
  'Usage: import-catalog --mode <manual|partner_csv|partner_api> --input <path.csv|path.json> ' +
  '[--existing <catalog.json>] [--output <out.json>] [--synced-at <ISO-8601>]';

const OPTION_NAMES = Object.freeze({
  '--mode': 'mode',
  '--input': 'input',
  '--existing': 'existing',
  '--output': 'output',
  '--synced-at': 'syncedAt',
});

/**
 * 解析 CLI 參數；略過開頭由 pnpm 9 透傳之 `--`。
 * @param {readonly string[]} argv
 * @returns {{ ok: true, options: Record<string, string> } | { ok: false, message: string }}
 */
export function parseArgs(argv) {
  const args = [...argv];
  while (args[0] === '--') args.shift();
  /** @type {Record<string, string>} */
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    const key = Object.hasOwn(OPTION_NAMES, token) ? OPTION_NAMES[token] : undefined;
    if (key === undefined) return { ok: false, message: `Unknown argument: ${token}` };
    if (Object.hasOwn(options, key)) return { ok: false, message: `Duplicate option: ${token}` };
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) return { ok: false, message: `Missing value for ${token}` };
    options[key] = value;
    i += 1;
  }
  if (options.mode === undefined) return { ok: false, message: '--mode is required.' };
  if (!CATALOG_IMPORT_MODES.includes(options.mode)) {
    return { ok: false, message: `--mode must be one of: ${CATALOG_IMPORT_MODES.join(', ')}` };
  }
  if (options.input === undefined) return { ok: false, message: '--input is required.' };
  if (options.syncedAt !== undefined && !isValidIsoTimestamp(options.syncedAt)) {
    return { ok: false, message: '--synced-at must be a valid full ISO-8601 timestamp with timezone.' };
  }
  return { ok: true, options };
}

/**
 * @param {string} path
 * @param {string} label
 * @returns {{ ok: true, data: Uint8Array } | { ok: false, errors: { file: string, path: string, code: string, message: string }[] }}
 */
function readBytes(path, label) {
  try {
    return { ok: true, data: readFileSync(path) };
  } catch (error) {
    const code = error && typeof error === 'object' && error.code === 'ENOENT' ? 'FILE_NOT_FOUND' : 'FILE_READ_ERROR';
    return { ok: false, errors: [{ file: label, path: '$', code, message: String(error?.message ?? error) }] };
  }
}

/**
 * @param {{ ok: false, errors: readonly { file: string, path: string, code: string, message: string }[] }} result
 * @param {(line: string) => void} errorLog
 */
function reportErrors(result, errorLog) {
  errorLog(`import-catalog: REJECTED (${result.errors.length} error(s)); no file was written.`);
  for (const e of result.errors) errorLog(`  [${e.code}] ${e.file} ${e.path}: ${e.message}`);
}

/**
 * 執行 CLI 主流程（可注入時間與輸出以利測試）。
 * @param {readonly string[]} argv
 * @param {{ now?: () => string, log?: (line: string) => void, errorLog?: (line: string) => void, cwd?: string }} [io]
 * @returns {number} 退出碼
 */
export function runImportCatalog(argv, io = {}) {
  const log = io.log ?? ((line) => console.log(line));
  const errorLog = io.errorLog ?? ((line) => console.error(line));
  const cwd = io.cwd ?? process.cwd();
  const now = io.now ?? (() => new Date().toISOString());

  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    errorLog(`import-catalog: ${parsed.message}`);
    errorLog(USAGE);
    return EXIT_USAGE;
  }
  const { mode, input, existing, output } = parsed.options;
  const syncedAt = parsed.options.syncedAt ?? now();

  // 來源
  const inputPath = resolve(cwd, input);
  const ext = extname(inputPath).toLowerCase();
  if (ext !== '.csv' && ext !== '.json') {
    errorLog(`import-catalog: --input must be a .csv or .json file (got "${input}").`);
    errorLog(USAGE);
    return EXIT_USAGE;
  }
  const inputBytes = readBytes(inputPath, input);
  if (!inputBytes.ok) {
    reportErrors(inputBytes, errorLog);
    return EXIT_VALIDATION_FAILED;
  }
  let incoming;
  if (ext === '.csv') {
    const text = decodeUtf8Text(inputBytes.data, input);
    if (!text.ok) {
      reportErrors(text, errorLog);
      return EXIT_VALIDATION_FAILED;
    }
    incoming = parseCatalogCsv(text.data, input);
  } else {
    const json = parseJsonBytes(inputBytes.data, input);
    if (!json.ok) {
      reportErrors(json, errorLog);
      return EXIT_VALIDATION_FAILED;
    }
    incoming = parseCatalogJson(json.data, input);
  }
  if (!incoming.ok) {
    reportErrors(incoming, errorLog);
    return EXIT_VALIDATION_FAILED;
  }

  // 既有目錄
  let existingCatalog = emptyCatalog();
  if (existing !== undefined) {
    const existingBytes = readBytes(resolve(cwd, existing), existing);
    if (!existingBytes.ok) {
      reportErrors(existingBytes, errorLog);
      return EXIT_VALIDATION_FAILED;
    }
    const existingJson = parseJsonBytes(existingBytes.data, existing);
    if (!existingJson.ok) {
      reportErrors(existingJson, errorLog);
      return EXIT_VALIDATION_FAILED;
    }
    existingCatalog = existingJson.data;
  }

  const merged = mergeCatalogFeed({
    existing: existingCatalog,
    incoming: incoming.data,
    mode,
    syncedAt,
    existingFile: existing ?? '<empty-baseline>',
    incomingFile: input,
  });
  if (!merged.ok) {
    reportErrors(merged, errorLog);
    return EXIT_VALIDATION_FAILED;
  }

  const { catalog, added, updated } = merged.data;
  log(`import-catalog: OK mode=${mode} syncedAt=${mode === 'manual' ? 'null (manual)' : syncedAt}`);
  log(`  items=${catalog.items.length} added=${added.length} updated=${updated.length}`);
  if (added.length > 0) log(`  added: ${added.join(', ')}`);
  if (updated.length > 0) log(`  updated: ${updated.join(', ')}`);
  if (output === undefined) {
    log('  (validation only; no --output given, nothing written)');
    return EXIT_OK;
  }
  try {
    writeFileSync(resolve(cwd, output), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  } catch (error) {
    errorLog(`import-catalog: [FILE_WRITE_ERROR] ${output}: ${String(error?.message ?? error)}`);
    return EXIT_VALIDATION_FAILED;
  }
  log(`  written: ${output}`);
  return EXIT_OK;
}

function isDirectRun() {
  const entry = process.argv[1];
  return entry !== undefined && pathToFileURL(resolve(entry)).href === import.meta.url;
}

if (isDirectRun()) {
  process.exitCode = runImportCatalog(process.argv.slice(2));
}
