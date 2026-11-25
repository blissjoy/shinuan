import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PRD_RELATIVE_PATH,
  checkPrdBytes,
  gitignoreHasProtectedRule,
  isInsideProtectedDir,
  runIntegrityCheck,
  scanSourceForForbiddenApis,
} from '../../scripts/check-shinuan-integrity.mjs';

const encoder = new TextEncoder();
const GOOD_TITLE = '# 拾暖伴伴 (shinuan) AI 虛擬桌寵專案規格與需求書 (Master PRD v2.1.29)\n\nbody\n';

describe('integrity (a): .gitignore rule', () => {
  it('accepts a .gitignore containing the protected rule', () => {
    expect(gitignoreHasProtectedRule('node_modules/\r\n/docs/PO-step-by-step/\r\n')).toBe(true);
  });

  it('rejects a .gitignore without the exact rule', () => {
    expect(gitignoreHasProtectedRule('node_modules/\n# /docs/PO-step-by-step/\ndocs/\n')).toBe(false);
  });
});

describe('integrity (b): game-core forbidden API scan', () => {
  const cases: [string, string][] = [
    ['window', 'const w = window.innerWidth;'],
    ['document', 'document.title = "x";'],
    ['process', 'const e = process.env;'],
    ['Date.now', 'const t = Date.now();'],
    ['Math.random', 'const r = Math.random();'],
    ['getTimezoneOffset', 'const o = new Date(0).getTimezoneOffset();'],
    ['module:fs', "import { readFileSync } from 'fs';"],
    ['module:node:fs', "import fs from 'node:fs';"],
    ['module:path', "import { join } from 'path';"],
    ['module:node:path', "const p = require('node:path');"],
    ['module:react', "import React from 'react';"],
    ['module:react-native', "const m = await import('react-native');"],
  ];

  it.each(cases)('flags %s', (rule, source) => {
    expect(scanSourceForForbiddenApis(source).map((f) => f.rule)).toContain(rule);
  });

  it('ignores forbidden words inside comments', () => {
    const source = '// uses window and process\n/* Math.random() Date.now() */\nexport const ok = 1;\n';
    expect(scanSourceForForbiddenApis(source)).toEqual([]);
  });

  it('does not flag similar identifiers', () => {
    const source = 'const windowSize = 1; const myProcess = 2; const pathLength = 3;\n';
    expect(scanSourceForForbiddenApis(source)).toEqual([]);
  });

  it('reports correct line numbers', () => {
    const source = '/*\n multi-line\n*/\nconst t = Date.now();\n';
    expect(scanSourceForForbiddenApis(source)).toEqual([
      { line: 4, rule: 'Date.now', text: 'const t = Date.now();' },
    ]);
  });
});

describe('integrity (c): Master PRD bytes', () => {
  it('accepts a UTF-8 (no BOM) file titled Master PRD v2.1.29', () => {
    expect(checkPrdBytes(encoder.encode(GOOD_TITLE))).toEqual([]);
  });

  it('rejects a BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode(GOOD_TITLE)]);
    expect(checkPrdBytes(bytes).join('\n')).toContain('BOM');
  });

  it('rejects an older version title', () => {
    const bytes = encoder.encode('# **Master PRD v2.1.28**\n');
    expect(checkPrdBytes(bytes).join('\n')).toContain('v2.1.29');
  });

  it('rejects a lookalike version such as v2.1.290', () => {
    expect(checkPrdBytes(encoder.encode('# Master PRD v2.1.290\n'))).not.toEqual([]);
  });

  it('rejects invalid UTF-8', () => {
    expect(checkPrdBytes(new Uint8Array([0x23, 0x20, 0xff, 0xfe]))).not.toEqual([]);
  });
});

describe('integrity: protected directory guard', () => {
  it('detects paths inside docs/PO-step-by-step', () => {
    const repo = join(tmpdir(), 'shinuan-fake-repo');
    expect(isInsideProtectedDir(repo, join(repo, 'docs', 'PO-step-by-step'))).toBe(true);
    expect(isInsideProtectedDir(repo, join(repo, 'docs', 'PO-step-by-step', 'x'))).toBe(true);
    expect(isInsideProtectedDir(repo, join(repo, 'docs', 'PRD'))).toBe(false);
    expect(isInsideProtectedDir(repo, join(repo, 'packages', 'game-core'))).toBe(false);
  });
});

describe('integrity: runIntegrityCheck on a temporary fixture repo', () => {
  let root = '';

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = '';
  });

  function makeFixture(gameCoreSource: string, prd: string, gitignore = '/docs/PO-step-by-step/\n'): string {
    root = mkdtempSync(join(tmpdir(), 'shinuan-integrity-'));
    writeFileSync(join(root, '.gitignore'), gitignore);
    mkdirSync(join(root, 'packages', 'game-core', 'src'), { recursive: true });
    writeFileSync(join(root, 'packages', 'game-core', 'src', 'index.ts'), gameCoreSource);
    const depDir = join(root, 'packages', 'game-core', 'node_modules', 'dep');
    mkdirSync(depDir, { recursive: true });
    writeFileSync(join(depDir, 'index.js'), 'window.x = 1;\n');
    const prdPath = join(root, PRD_RELATIVE_PATH);
    mkdirSync(dirname(prdPath), { recursive: true });
    writeFileSync(prdPath, prd);
    return root;
  }

  it('passes all checks on a clean fixture (node_modules is skipped)', () => {
    const results = runIntegrityCheck(makeFixture('export const x = 1;\n', GOOD_TITLE));
    expect(results.map((r) => [r.check, r.ok])).toEqual([
      ['gitignore', true],
      ['game-core-purity', true],
      ['master-prd', true],
    ]);
  });

  it('fails each check on a violating fixture', () => {
    const results = runIntegrityCheck(
      makeFixture('export const t = Math.random();\n', '# Master PRD v2.1.28\n', 'node_modules/\n'),
    );
    expect(results.map((r) => [r.check, r.ok])).toEqual([
      ['gitignore', false],
      ['game-core-purity', false],
      ['master-prd', false],
    ]);
  });
});
