/** 本機 Sandbox 健康狀態頁（Phase A 空白骨架，僅確認工具鏈可啟動，不含遊戲規則）。 */
export interface SandboxStatus {
  readonly name: string;
  readonly phase: string;
  readonly healthy: boolean;
}

export const DEFAULT_STATUS: SandboxStatus = {
  name: 'shinuan local-sandbox',
  phase: 'Phase A skeleton',
  healthy: true,
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderStatusPage(status: SandboxStatus = DEFAULT_STATUS): string {
  const state = status.healthy ? 'OK' : 'NOT OK';
  return [
    '<!doctype html>',
    '<html lang="zh-Hant">',
    '<head><meta charset="utf-8"><title>shinuan sandbox</title></head>',
    '<body>',
    `<h1>${escapeHtml(status.name)}</h1>`,
    `<p>Phase: ${escapeHtml(status.phase)}</p>`,
    `<p id="health">Health check: ${state}</p>`,
    '</body>',
    '</html>',
  ].join('\n');
}
