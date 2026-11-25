#!/usr/bin/env node
// 拾暖 pre-push 守門腳本（零外部依賴 Node ESM）。
//
// Git pre-push hook 會由 stdin 傳入每一筆待推送的 ref，格式為：
//   <local ref> SP <local sha1> SP <remote ref> SP <remote sha1> LF
// 只要任一筆的 remote ref 為受保護分支（預設 refs/heads/master），即以退出碼 1 阻擋推送；
// 其餘任務分支一律放行（退出碼 0）。
//
// 注意：本任務僅撰寫與測試本腳本，不安裝至 .git/hooks/pre-push（需 PO 另行授權）。

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROTECTED_REMOTE_REFS = Object.freeze(['refs/heads/master']);

/**
 * 解析 pre-push stdin，回傳被阻擋的推送清單。
 * @param {string} stdinText
 * @param {readonly string[]} [protectedRefs]
 * @returns {{ localRef: string, remoteRef: string }[]}
 */
export function findBlockedPushes(stdinText, protectedRefs = PROTECTED_REMOTE_REFS) {
  const blocked = [];
  for (const rawLine of String(stdinText).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '') continue;
    const parts = line.split(/\s+/);
    const localRef = parts[0] ?? '';
    const remoteRef = parts[2] ?? '';
    if (protectedRefs.includes(remoteRef)) {
      blocked.push({ localRef, remoteRef });
    }
  }
  return blocked;
}

/**
 * @param {string} stdinText
 * @returns {number} 退出碼（0 放行、1 阻擋）
 */
export function runPrePushGuard(stdinText) {
  const blocked = findBlockedPushes(stdinText);
  if (blocked.length === 0) {
    return 0;
  }
  for (const { localRef, remoteRef } of blocked) {
    console.error(
      `[pre-push-guard] BLOCKED: 禁止直接推送至 ${remoteRef}（local ref: ${localRef || '(empty)'}）。請推送任務分支並建立 PR。`,
    );
  }
  return 1;
}

function isDirectRun() {
  const entry = process.argv[1];
  return entry !== undefined && pathToFileURL(resolve(entry)).href === import.meta.url;
}

if (isDirectRun()) {
  let stdinText = '';
  try {
    stdinText = readFileSync(0, 'utf8');
  } catch {
    stdinText = '';
  }
  process.exitCode = runPrePushGuard(stdinText);
}
