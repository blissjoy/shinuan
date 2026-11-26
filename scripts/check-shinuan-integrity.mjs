#!/usr/bin/env node
// 拾暖完整性守門腳本（零外部依賴 Node ESM）。
//
// 檢查項目：
//   (a) 根目錄 .gitignore 必含 `/docs/PO-step-by-step/` 排除規則。
//       本腳本只讀取 .gitignore 文字，絕不進入、列舉或掃描 docs/PO-step-by-step/。
//   (b) packages/game-core 內零禁用 API：
//       window、document、fs、path、process、Date.now、Math.random、getTimezoneOffset、react。
//   (c) Master PRD 標題必為 `Master PRD v2.1.30`，且檔案為 UTF-8 無 BOM。
//
// 用法：node scripts/check-shinuan-integrity.mjs [repoRoot]
// 全部通過退出碼 0；任一失敗退出碼 1。

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REQUIRED_GITIGNORE_RULE = '/docs/PO-step-by-step/';
export const PROTECTED_DIR_SEGMENTS = Object.freeze(['docs', 'PO-step-by-step']);
export const GAME_CORE_DIR = join('packages', 'game-core');
export const PRD_RELATIVE_PATH = join('docs', 'PRD', 'AI_虛擬桌寵專案規格與需求書 (Master PRD).md');
export const REQUIRED_PRD_VERSION = 'v2.1.30';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const SKIPPED_DIR_NAMES = new Set(['node_modules', 'dist', 'coverage', '.turbo']);

// 禁用模組（import / require / 動態 import 的模組指定字串）
const FORBIDDEN_MODULE_PATTERN =
  /^(?:node:)?(?:fs|path)(?:\/.*)?$|^(?:react|react-dom|react-native)(?:\/.*)?$|^@types\/react(?:\/.*)?$/;

// 禁用識別字／API（於移除註解後的原始碼中比對）
const FORBIDDEN_TOKEN_RULES = Object.freeze([
  { name: 'window', pattern: /(?<![\w$])window(?![\w$])/ },
  { name: 'document', pattern: /(?<![\w$])document(?![\w$])/ },
  { name: 'process', pattern: /(?<![\w$])process(?![\w$])/ },
  { name: 'Date.now', pattern: /(?<![\w$])Date\s*\.\s*now(?![\w$])/ },
  { name: 'Math.random', pattern: /(?<![\w$])Math\s*\.\s*random(?![\w$])/ },
  { name: 'getTimezoneOffset', pattern: /getTimezoneOffset/ },
]);

const MODULE_SPECIFIER_PATTERNS = Object.freeze([
  /\bfrom\s*(['"])([^'"]+)\1/g,
  /\bimport\s*(['"])([^'"]+)\1/g,
  /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
  /\brequire\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
]);

// ---------------------------------------------------------------------------
// (a) .gitignore
// ---------------------------------------------------------------------------

/**
 * @param {string} gitignoreText
 * @returns {boolean}
 */
export function gitignoreHasProtectedRule(gitignoreText) {
  return String(gitignoreText)
    .split(/\r?\n/)
    .some((line) => line.trim() === REQUIRED_GITIGNORE_RULE);
}

// ---------------------------------------------------------------------------
// (b) Game Core 禁用 API
// ---------------------------------------------------------------------------

/**
 * 以空白取代 JS/TS 註解（保留換行以維持行號），字串與樣板字面值原樣保留。
 * 註：簡易狀態機，不處理正規表示式字面值中的引號或斜線；誤判方向為「多報」而非漏報。
 * @param {string} source
 * @returns {string}
 */
export function stripComments(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  /** @type {null | '"' | "'" | '`'} */
  let quote = null;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote !== null) {
      out += ch;
      if (ch === '\\' && i + 1 < n) {
        out += next;
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < n) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/**
 * 掃描單一原始碼字串中的禁用 API。
 * @param {string} source
 * @returns {{ line: number, rule: string, text: string }[]}
 */
export function scanSourceForForbiddenApis(source) {
  const findings = [];
  const lines = stripComments(String(source)).split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const { name, pattern } of FORBIDDEN_TOKEN_RULES) {
      if (pattern.test(lineText)) {
        findings.push({ line: index + 1, rule: name, text: lineText.trim() });
      }
    }
    for (const specPattern of MODULE_SPECIFIER_PATTERNS) {
      specPattern.lastIndex = 0;
      let match;
      while ((match = specPattern.exec(lineText)) !== null) {
        const specifier = match[2] ?? '';
        if (FORBIDDEN_MODULE_PATTERN.test(specifier)) {
          findings.push({ line: index + 1, rule: `module:${specifier}`, text: lineText.trim() });
        }
      }
    }
  });
  return findings;
}

/**
 * 判斷路徑是否落在受保護目錄 docs/PO-step-by-step 之內（相對 repoRoot）。
 * @param {string} repoRoot
 * @param {string} target
 */
export function isInsideProtectedDir(repoRoot, target) {
  const rel = relative(resolve(repoRoot), resolve(target)).split(sep).join('/');
  return rel === PROTECTED_DIR_SEGMENTS.join('/') || rel.startsWith(`${PROTECTED_DIR_SEGMENTS.join('/')}/`);
}

/**
 * 遞迴列出 dir 內原始碼檔案（略過 node_modules 等；拒絕進入受保護目錄）。
 * @param {string} repoRoot
 * @param {string} dir
 * @returns {string[]}
 */
function listSourceFiles(repoRoot, dir) {
  if (isInsideProtectedDir(repoRoot, dir)) {
    throw new Error('Refusing to scan protected directory docs/PO-step-by-step/');
  }
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIPPED_DIR_NAMES.has(entry.name)) continue;
      files.push(...listSourceFiles(repoRoot, full));
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf('.');
      const ext = dot >= 0 ? entry.name.slice(dot) : '';
      if (SOURCE_EXTENSIONS.has(ext)) files.push(full);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// (c) Master PRD 版本與編碼
// ---------------------------------------------------------------------------

/**
 * @param {Uint8Array} bytes
 * @returns {string[]} 錯誤訊息（空陣列代表通過）
 */
export function checkPrdBytes(bytes) {
  const errors = [];
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    errors.push('Master PRD has a UTF-8 BOM (must be UTF-8 without BOM).');
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    errors.push('Master PRD is not valid UTF-8.');
    return errors;
  }
  const title = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .find((line) => line.trim() !== '');
  const titlePattern = /^#\s.*Master PRD v2\.1\.30(?![0-9.])/;
  if (title === undefined || !titlePattern.test(title)) {
    errors.push(
      `Master PRD title must contain "Master PRD ${REQUIRED_PRD_VERSION}" (found: ${JSON.stringify(title ?? '')}).`,
    );
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 彙整
// ---------------------------------------------------------------------------

/**
 * @param {string} repoRoot
 * @returns {{ check: string, ok: boolean, details: string[] }[]}
 */
export function runIntegrityCheck(repoRoot) {
  const results = [];

  // (a)
  const gitignorePath = join(repoRoot, '.gitignore');
  if (!existsSync(gitignorePath)) {
    results.push({ check: 'gitignore', ok: false, details: ['.gitignore not found at repo root.'] });
  } else {
    const ok = gitignoreHasProtectedRule(readFileSync(gitignorePath, 'utf8'));
    results.push({
      check: 'gitignore',
      ok,
      details: ok ? [] : [`.gitignore must contain the line "${REQUIRED_GITIGNORE_RULE}".`],
    });
  }

  // (b)
  const gameCoreDir = join(repoRoot, GAME_CORE_DIR);
  if (!existsSync(gameCoreDir) || !statSync(gameCoreDir).isDirectory()) {
    results.push({ check: 'game-core-purity', ok: false, details: [`${GAME_CORE_DIR} not found.`] });
  } else {
    const details = [];
    for (const file of listSourceFiles(repoRoot, gameCoreDir)) {
      for (const f of scanSourceForForbiddenApis(readFileSync(file, 'utf8'))) {
        const rel = relative(repoRoot, file).split(sep).join('/');
        details.push(`${rel}:${f.line} [${f.rule}] ${f.text}`);
      }
    }
    results.push({ check: 'game-core-purity', ok: details.length === 0, details });
  }

  // (c)
  const prdPath = join(repoRoot, PRD_RELATIVE_PATH);
  if (!existsSync(prdPath)) {
    results.push({ check: 'master-prd', ok: false, details: [`${PRD_RELATIVE_PATH} not found.`] });
  } else {
    const details = checkPrdBytes(readFileSync(prdPath));
    results.push({ check: 'master-prd', ok: details.length === 0, details });
  }

  return results;
}

function isDirectRun() {
  const entry = process.argv[1];
  return entry !== undefined && pathToFileURL(resolve(entry)).href === import.meta.url;
}

if (isDirectRun()) {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const repoRoot = resolve(process.argv[2] ?? defaultRoot);
  const results = runIntegrityCheck(repoRoot);
  for (const r of results) {
    console.log(`[${r.ok ? 'PASS' : 'FAIL'}] ${r.check}`);
    for (const d of r.details) console.log(`       - ${d}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? 'shinuan integrity: ALL PASS' : `shinuan integrity: ${failed} check(s) FAILED`);
  process.exitCode = failed === 0 ? 0 : 1;
}
