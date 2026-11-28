/**
 * build-docs-site.mjs
 *
 * 拾暖伴伴（SHINUAN）靜態左右分頁文件閱讀器建置腳本（零外部依賴）。
 * - 嚴格採顯式白名單讀取正式規格／設計／ADR／PRD／ROADMAP，絕不掃描或存取 docs/PO-step-by-step/。
 * - 可用於 GitHub Pages 自動部署，亦可供本機輸出單檔離線瀏覽。
 *
 * 用法：
 *   node scripts/build-docs-site.mjs --out _site
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  let outDir = path.join(repoRoot, '_site');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      outDir = path.resolve(argv[i + 1]);
      i++;
    }
  }
  return { outDir };
}

/** 顯式正式文件白名單（絕不遞迴掃描 docs/，結構上徹底隔離 Protected PO Notes）。 */
const NAV_TREE = [
  {
    group: '📌 總覽與核心規格',
    open: true,
    items: [
      { id: 'docs/specs/README.md', label: '規格入口首頁', badge: '入口' },
      { id: 'docs/specs/PHASE-A-SPEC-MAP.md', label: 'Phase A 規格拆解地圖', badge: '地圖' },
      { id: 'ROADMAP.md', label: 'Phase A～E 進度看板', badge: '進度' },
      { id: 'docs/PRD/AI_虛擬桌寵專案規格與需求書 (Master PRD).md', label: 'Master PRD v2.1.31', badge: '唯一正式' },
    ],
  },
  {
    group: '📦 Phase A｜SPEC-00 底座與治理',
    open: true,
    items: [
      { id: 'docs/specs/SPEC-00-foundation/SPEC.md', label: 'SPEC-00 導讀（目的與功能）', badge: 'SPEC' },
    ],
  },
  {
    group: '🧬 Phase A｜SPEC-01 契約、設定與基因',
    open: true,
    items: [
      { id: 'docs/specs/SPEC-01-contracts-config-genetics/SPEC.md', label: 'SPEC-01 導讀（目的與功能）', badge: 'SPEC' },
      { id: 'docs/specs/SPEC-01-contracts-config-genetics/S1-01-contracts-design.md', label: 'S1-01 跨模組型別契約', badge: 'Design' },
      { id: 'docs/specs/SPEC-01-contracts-config-genetics/S1-02-config-loader-design.md', label: 'S1-02 設定載入與匯入驗證', badge: 'Design' },
      { id: 'docs/specs/SPEC-01-contracts-config-genetics/S1-03-genetics-engine-design.md', label: 'S1-03 純品種基因引擎設計', badge: 'Design' },
      { id: 'docs/specs/SPEC-01-contracts-config-genetics/S1-04-preset-parents-litter-design.md', label: 'S1-04 真實遺傳與一胎 3～5 隻', badge: 'Design' },
    ],
  },
  {
    group: '⏱️ Phase A｜SPEC-02 時間與健康救援',
    open: true,
    items: [
      { id: 'docs/specs/SPEC-02-time-engine-health/SPEC.md', label: 'SPEC-02 導讀（目的與功能）', badge: 'SPEC' },
      { id: 'docs/specs/SPEC-02-time-engine-health/SPEC-02-time-engine-health-design.md', label: 'SPEC-02 時間與健康設計書', badge: 'Design' },
    ],
  },
  {
    group: '🛒 Phase A｜SPEC-03 商店經濟與存檔',
    open: true,
    items: [
      { id: 'docs/specs/SPEC-03-economy-save/SPEC.md', label: 'SPEC-03 導讀（目的與功能）', badge: 'SPEC' },
      { id: 'docs/specs/SPEC-03-economy-save/SPEC-03-economy-save-design.md', label: 'SPEC-03 經濟與存檔設計書', badge: 'Design' },
    ],
  },
  {
    group: '🧠 Phase A｜SPEC-04 行為、CLI 與模擬',
    open: true,
    items: [
      { id: 'docs/specs/SPEC-04-behavior-cli-simulation/SPEC.md', label: 'SPEC-04 導讀（目的與功能）', badge: 'SPEC' },
      { id: 'docs/specs/SPEC-04-behavior-cli-simulation/SPEC-04-behavior-cli-simulation-design.md', label: 'SPEC-04 行為與模擬設計書', badge: 'Design' },
    ],
  },
  {
    group: '🎨 Phase B｜美術、UI/UX 與桌面跳台設計',
    open: true,
    items: [
      { id: 'docs/specs/PHASE-B-2D-ART-PIPELINE-SPEC.md', label: '2D 粉彩 12 零件拆圖與 AI Prompt', badge: 'Art' },
      { id: 'docs/specs/PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md', label: '手機 UI/UX 與桌面 App 跳台設計', badge: 'Design' },
    ],
  },
  {
    group: '🏗️ 架構決策紀錄（ADR）',
    open: true,
    items: [
      { id: 'docs/decisions/ADR-001-animation-engine-rive.md', label: 'ADR-001 動畫引擎 Rive', badge: 'ADR' },
      { id: 'docs/decisions/ADR-002-mobile-native-bridge-architecture.md', label: 'ADR-002 雙平台原生橋接', badge: 'ADR' },
      { id: 'docs/decisions/ADR-003-save-storage-json-to-sqlite.md', label: 'ADR-003 JSON → SQLite 存檔', badge: 'ADR' },
    ],
  },
];

function getShortCommitSha() {
  try {
    return execFileSync('git', ['-C', repoRoot, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

const { outDir } = parseArgs(process.argv.slice(2));
const shortSha = getShortCommitSha();
const docsMap = {};
const resolvedTree = [];

for (const grp of NAV_TREE) {
  const keptItems = [];
  for (const item of grp.items) {
    if (/po-step-by-step/i.test(item.id)) {
      throw new Error(`FORBIDDEN PATH BLOCKED: ${item.id}`);
    }
    const fullPath = path.join(repoRoot, item.id);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`REQUIRED DOC MISSING: ${item.id}`);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    docsMap[item.id] = {
      id: item.id,
      label: item.label,
      badge: item.badge,
      group: grp.group,
      markdown: content,
    };
    keptItems.push({ id: item.id, label: item.label, badge: item.badge });
  }
  if (keptItems.length > 0) {
    resolvedTree.push({ group: grp.group, open: grp.open, items: keptItems });
  }
}

function resolveRelativePath(fromPath, relHref) {
  const [rawPath, anchor] = relHref.split('#');
  if (!rawPath) return { docId: fromPath, anchor: anchor || '' };
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    decoded = rawPath;
  }
  const parts = fromPath.split('/');
  parts.pop();
  for (const seg of decoded.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return { docId: parts.join('/'), anchor: anchor || '' };
}

function validateInternalLinks(map) {
  const anchorsByDoc = new Map();
  for (const [docId, doc] of Object.entries(map)) {
    const anchors = new Set();
    const lines = doc.markdown.replace(/\r\n/g, '\n').split('\n');
    let inFence = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const anchorMatch = trimmed.match(/^<a\s+id="([^"]+)"\s*>\s*<\/a>$/i);
      if (anchorMatch) anchors.add(anchorMatch[1]);
    }
    anchorsByDoc.set(docId, anchors);
  }

  let verifiedLinks = 0;
  const errors = [];

  for (const [docId, doc] of Object.entries(map)) {
    const lines = doc.markdown.replace(/\r\n/g, '\n').split('\n');
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const stripped = line.replace(/`[^`]+`/g, '');
      for (const match of stripped.matchAll(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g)) {
        const cleanHref = match[2].trim().replace(/&amp;/g, '&');
        if (/^(https?:\/\/|mailto:)/i.test(cleanHref)) continue;
        const resolved = resolveRelativePath(docId, cleanHref);
        if (/po-step-by-step/i.test(cleanHref) || /po-step-by-step/i.test(resolved.docId)) {
          errors.push(`FORBIDDEN LINK TARGET: ${docId}:${i + 1} -> ${cleanHref}`);
          continue;
        }
        if (!Object.prototype.hasOwnProperty.call(map, resolved.docId)) {
          errors.push(`BROKEN DOC LINK: ${docId}:${i + 1} -> ${cleanHref} (resolved: ${resolved.docId})`);
          continue;
        }
        if (resolved.anchor && !anchorsByDoc.get(resolved.docId).has(resolved.anchor)) {
          errors.push(`BROKEN ANCHOR LINK: ${docId}:${i + 1} -> ${cleanHref} (missing #${resolved.anchor} in ${resolved.docId})`);
          continue;
        }
        verifiedLinks++;
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`BROKEN INTERNAL LINKS DETECTED (${errors.length}):\n${errors.join('\n')}`);
  }
  return verifiedLinks;
}

const verifiedLinks = validateInternalLinks(docsMap);

const payloadJson = JSON.stringify({ shortSha, navTree: resolvedTree, docs: docsMap })
  .replace(/</g, '\\u003c');

const appScript = `(() => {
  const DATA = window.__SHINUAN_DOCS__;
  const state = { activeId: 'docs/specs/README.md', search: '' };

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function resolveRelativePath(fromPath, relHref) {
    const [rawPath, anchor] = relHref.split('#');
    if (!rawPath) return { docId: fromPath, anchor: anchor || '' };
    let decoded = rawPath;
    try { decoded = decodeURIComponent(rawPath); } catch { decoded = rawPath; }
    const parts = fromPath.split('/');
    parts.pop();
    for (const seg of decoded.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return { docId: parts.join('/'), anchor: anchor || '' };
  }

  function formatInline(raw, currentDocId) {
    let s = escapeHtml(raw);
    const codeSlots = [];
    s = s.replace(/\`([^\`]+)\`/g, (_, code) => {
      const idx = codeSlots.length;
      codeSlots.push('<code>' + code + '</code>');
      return '@@CODE_' + idx + '@@';
    });
    s = s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, (_, text, href) => {
      const cleanHref = href.replace(/&amp;/g, '&');
      if (cleanHref.startsWith('http://') || cleanHref.startsWith('https://')) {
        return '<a href="' + escapeHtml(cleanHref) + '" target="_blank" rel="noopener noreferrer" class="ext-link">' + text + ' ↗</a>';
      }
      const resolved = resolveRelativePath(currentDocId, cleanHref);
      if (DATA.docs[resolved.docId]) {
        return '<a href="#doc=' + encodeURIComponent(resolved.docId) + (resolved.anchor ? '&anchor=' + encodeURIComponent(resolved.anchor) : '') + '" class="doc-link" data-doc="' + escapeHtml(resolved.docId) + '" data-anchor="' + escapeHtml(resolved.anchor) + '">' + text + '</a>';
      }
      return '<span class="missing-link" title="' + escapeHtml(resolved.docId) + '">' + text + '</span>';
    });
    s = s.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\\*([^*]+)\\*(?!\\*)/g, '$1<em>$2</em>');
    s = s.replace(/@@CODE_(\\d+)@@/g, (_, idx) => codeSlots[Number(idx)]);
    return s;
  }

  function renderMarkdown(md, docId) {
    const lines = md.replace(/\\r\\n/g, '\\n').split('\\n');
    const html = [];
    const toc = [];
    let i = 0;

    function flushParagraph(buf) {
      if (!buf.length) return;
      html.push('<p>' + buf.map(l => formatInline(l, docId)).join('<br>') + '</p>');
      buf.length = 0;
    }

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) { i++; continue; }

      const anchorMatch = trimmed.match(/^<a\\s+id="([^"]+)"\\s*>\\s*<\\/a>$/i);
      if (anchorMatch) {
        html.push('<div class="md-anchor" id="' + escapeHtml(anchorMatch[1]) + '"></div>');
        i++; continue;
      }

      if (/^---+$/.test(trimmed)) {
        html.push('<hr />');
        i++; continue;
      }

      if (trimmed.startsWith('\`\`\`')) {
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('\`\`\`')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        html.push('<div class="code-wrap">' + (lang ? '<span class="code-lang">' + escapeHtml(lang) + '</span>' : '') + '<pre><code>' + escapeHtml(codeLines.join('\\n')) + '</code></pre></div>');
        continue;
      }

      const hMatch = trimmed.match(/^(#{1,4})\\s+(.*)$/);
      if (hMatch) {
        const level = hMatch[1].length;
        const text = hMatch[2];
        const hid = 'sec-' + toc.length;
        if (level <= 3) {
          toc.push({ id: hid, level, text: text.replace(/\`/g, '').replace(/\\*\\*/g, '') });
        }
        html.push('<h' + level + ' id="' + hid + '">' + formatInline(text, docId) + '</h' + level + '>');
        i++; continue;
      }

      if (trimmed.startsWith('>')) {
        const bqLines = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          bqLines.push(lines[i].trim().replace(/^>\\s?/, ''));
          i++;
        }
        html.push('<blockquote>' + bqLines.map(l => formatInline(l, docId)).join('<br>') + '</blockquote>');
        continue;
      }

      if (trimmed.startsWith('|') && i + 1 < lines.length && /^\\|[\\s:|-]+\\|$/.test(lines[i + 1].trim())) {
        const parseRow = (r) => r.trim().replace(/^\\|/, '').replace(/\\|$/, '').split('|').map(c => c.trim());
        const headers = parseRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        let tbl = '<div class="tbl-wrap"><table><thead><tr>' + headers.map(h => '<th>' + formatInline(h, docId) + '</th>').join('') + '</tr></thead><tbody>';
        for (const r of rows) {
          tbl += '<tr>' + r.map(c => '<td>' + formatInline(c, docId) + '</td>').join('') + '</tr>';
        }
        tbl += '</tbody></table></div>';
        html.push(tbl);
        continue;
      }

      if (/^\\s*([-*]|\\d+\\.)\\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\\s*([-*]|\\d+\\.)\\s+/.test(lines[i])) {
          const m = lines[i].match(/^(\\s*)([-*]|\\d+\\.)\\s+(.*)$/);
          const indent = m[1].length;
          const ordered = /^\\d+\\.$/.test(m[2]);
          let content = m[3];
          if (content.startsWith('[x] ') || content.startsWith('[X] ')) content = '✅ ' + content.slice(4);
          else if (content.startsWith('[ ] ')) content = '⬜ ' + content.slice(4);
          items.push({ indent, ordered, content });
          i++;
        }
        let out = '<ul class="md-list">';
        for (const it of items) {
          const depth = Math.min(3, Math.floor(it.indent / 2));
          out += '<li class="depth-' + depth + (it.ordered ? ' is-ord' : '') + '">' + formatInline(it.content, docId) + '</li>';
        }
        out += '</ul>';
        html.push(out);
        continue;
      }

      const pBuf = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^<a\\s+id=/i.test(lines[i].trim()) &&
        !/^#{1,4}\\s+/.test(lines[i].trim()) &&
        !lines[i].trim().startsWith('>') &&
        !lines[i].trim().startsWith('\`\`\`') &&
        !/^---+$/.test(lines[i].trim()) &&
        !/^\\s*([-*]|\\d+\\.)\\s+/.test(lines[i]) &&
        !(lines[i].trim().startsWith('|') && i + 1 < lines.length && /^\\|[\\s:|-]+\\|$/.test(lines[i + 1].trim()))
      ) {
        pBuf.push(lines[i].trim());
        i++;
      }
      flushParagraph(pBuf);
    }
    return { html: html.join('\\n'), toc };
  }

  function renderSidebar() {
    const navEl = document.getElementById('sidebar-nav');
    const q = state.search.trim().toLowerCase();
    let out = '';

    for (const grp of DATA.navTree) {
      const matchedItems = grp.items.filter(item => {
        if (!q) return true;
        const doc = DATA.docs[item.id];
        return item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || (doc && doc.markdown.toLowerCase().includes(q));
      });
      if (!matchedItems.length) continue;

      out += '<details class="nav-group" ' + (grp.open || q ? 'open' : '') + '>';
      out += '<summary>' + escapeHtml(grp.group) + '</summary>';
      out += '<div class="nav-items">';
      for (const item of matchedItems) {
        const isActive = item.id === state.activeId;
        out += '<button type="button" class="nav-btn' + (isActive ? ' active' : '') + '" data-doc="' + escapeHtml(item.id) + '">';
        out += '<span class="nav-label">' + escapeHtml(item.label) + '</span>';
        out += '<span class="nav-badge">' + escapeHtml(item.badge) + '</span>';
        out += '</button>';
      }
      out += '</div></details>';
    }

    if (!out) {
      out = '<div class="empty-search">找不到符合「' + escapeHtml(state.search) + '」的文件</div>';
    }
    navEl.innerHTML = out;
  }

  function openDoc(docId, anchor, updateHash) {
    const doc = DATA.docs[docId];
    if (!doc) return;
    state.activeId = docId;
    if (updateHash !== false) {
      const nextHash = '#doc=' + encodeURIComponent(docId) + (anchor ? '&anchor=' + encodeURIComponent(anchor) : '');
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    }
    renderSidebar();
    document.getElementById('doc-breadcrumb').textContent = doc.group + '  /  ' + doc.id;
    const { html, toc } = renderMarkdown(doc.markdown, docId);
    document.getElementById('doc-body').innerHTML = html;

    const tocEl = document.getElementById('mini-toc');
    if (toc.length > 1) {
      tocEl.innerHTML = '<div class="toc-title">本頁章節</div>' + toc.map(t =>
        '<a href="#" class="toc-link toc-l' + t.level + '" data-toc-id="' + t.id + '">' + escapeHtml(t.text) + '</a>'
      ).join('');
      tocEl.style.display = 'block';
    } else {
      tocEl.style.display = 'none';
    }

    const mainEl = document.getElementById('main-scroll');
    if (anchor) {
      setTimeout(() => {
        const target = document.getElementById(anchor);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else mainEl.scrollTop = 0;
      }, 20);
    } else {
      mainEl.scrollTop = 0;
    }
  }

  function openFromHash() {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) { openDoc('docs/specs/README.md', '', false); return; }
    const params = new URLSearchParams(raw);
    const docId = params.get('doc');
    const anchor = params.get('anchor') || '';
    if (docId && DATA.docs[docId]) openDoc(docId, anchor, false);
    else openDoc('docs/specs/README.md', '', false);
  }

  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('.nav-btn');
    if (navBtn) { openDoc(navBtn.dataset.doc, '', true); return; }
    const docLink = e.target.closest('.doc-link');
    if (docLink) { e.preventDefault(); openDoc(docLink.dataset.doc, docLink.dataset.anchor, true); return; }
    const tocLink = e.target.closest('.toc-link');
    if (tocLink) {
      e.preventDefault();
      const target = document.getElementById(tocLink.dataset.tocId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  window.addEventListener('hashchange', openFromHash);

  document.getElementById('search-input').addEventListener('input', (e) => {
    state.search = e.target.value;
    renderSidebar();
  });

  document.getElementById('btn-top').addEventListener('click', () => {
    document.getElementById('main-scroll').scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('meta-sha').textContent = '基準 Commit：' + DATA.shortSha + '（共 ' + Object.keys(DATA.docs).length + ' 份正式文件）';
  openFromHash();
})();`;

// 驗證內嵌腳本語法零錯誤
new Function(appScript);

const fullHtml = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>拾暖伴伴（SHINUAN）規格與設計文件閱讀器</title>
  <style>
    :root {
      --bg: #faf7f2;
      --sidebar: #f3ece2;
      --card: #ffffff;
      --border: #e5d9c8;
      --text: #2f241c;
      --muted: #766253;
      --accent: #c96c34;
      --accent-soft: #fbeadd;
      --code-bg: #f6f0e8;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; font-family: "Segoe UI", "Microsoft JhengHei", system-ui, sans-serif; color: var(--text); background: var(--bg); }
    .app { display: grid; grid-template-columns: 310px 1fr; height: 100vh; overflow: hidden; }
    .sidebar {
      background: var(--sidebar); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; height: 100vh; overflow: hidden;
    }
    .brand { padding: 18px 16px 12px; border-bottom: 1px solid var(--border); }
    .brand h1 { margin: 0; font-size: 17px; color: #3a271a; display: flex; align-items: center; gap: 6px; }
    .brand .sub { font-size: 11.5px; color: var(--muted); margin-top: 4px; }
    .search-box { padding: 10px 14px; border-bottom: 1px solid var(--border); }
    .search-box input {
      width: 100%; padding: 8px 11px; border-radius: 10px; border: 1px solid var(--border);
      background: #fff; font-size: 13px; color: var(--text); outline: none;
    }
    .search-box input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(201,108,52,0.14); }
    .sidebar-nav { flex: 1; overflow-y: auto; padding: 10px 10px 24px; }
    .nav-group { margin-bottom: 8px; }
    .nav-group summary {
      cursor: pointer; font-size: 12.5px; font-weight: 700; color: #5b4636;
      padding: 6px 8px; border-radius: 8px; list-style: none; user-select: none;
    }
    .nav-group summary:hover { background: rgba(201,108,52,0.08); }
    .nav-items { display: flex; flex-direction: column; gap: 3px; padding: 4px 0 4px 8px; }
    .nav-btn {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      width: 100%; text-align: left; border: none; background: transparent; cursor: pointer;
      padding: 7px 10px; border-radius: 9px; font-size: 13px; color: var(--text); transition: background 0.12s;
    }
    .nav-btn:hover { background: rgba(201,108,52,0.1); }
    .nav-btn.active { background: var(--accent); color: #fff; font-weight: 600; }
    .nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .nav-badge {
      flex-shrink: 0; font-size: 10px; padding: 2px 6px; border-radius: 99px;
      background: rgba(47,36,28,0.08); color: #5b4636; font-weight: 600;
    }
    .nav-btn.active .nav-badge { background: rgba(255,255,255,0.22); color: #fff; }
    .empty-search { padding: 18px 12px; text-align: center; font-size: 13px; color: var(--muted); }

    .main-col { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .topbar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 11px 24px; background: var(--card); border-bottom: 1px solid var(--border);
      font-size: 12.5px; color: var(--muted);
    }
    .topbar-right { display: flex; align-items: center; gap: 8px; }
    .repo-link { color: var(--accent); text-decoration: none; font-weight: 600; font-size: 12px; }
    .btn-top {
      border: 1px solid var(--border); background: #fff; color: var(--text); border-radius: 8px;
      padding: 5px 11px; font-size: 12px; cursor: pointer;
    }
    .btn-top:hover { border-color: var(--accent); color: var(--accent); }
    .content-grid { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) 230px; overflow: hidden; }
    .main-scroll { overflow-y: auto; padding: 28px 38px 72px; }
    .doc-card {
      max-width: 880px; margin: 0 auto; background: var(--card); border: 1px solid var(--border);
      border-radius: 18px; padding: 32px 38px; box-shadow: 0 8px 26px rgba(64,42,24,0.05);
      line-height: 1.75; font-size: 15px;
    }
    .doc-card h1 { font-size: 25px; margin: 0 0 14px; color: #2b1d14; border-bottom: 2px solid var(--accent-soft); padding-bottom: 10px; }
    .doc-card h2 { font-size: 19px; margin: 28px 0 12px; color: #3a2619; border-left: 4px solid var(--accent); padding-left: 10px; }
    .doc-card h3 { font-size: 16px; margin: 20px 0 8px; color: #4d3322; }
    .doc-card h4 { font-size: 14.5px; margin: 16px 0 6px; color: #5e412e; }
    .doc-card p { margin: 10px 0; }
    .doc-card blockquote {
      margin: 14px 0; padding: 11px 15px; background: #fdf6ee;
      border-left: 4px solid var(--accent); border-radius: 0 10px 10px 0; font-size: 13.8px; color: #543d2c;
    }
    .doc-card hr { border: none; border-top: 1px solid var(--border); margin: 22px 0; }
    .doc-card code { background: var(--code-bg); padding: 2px 5px; border-radius: 5px; font-size: 13px; color: #8c3f19; font-family: Consolas, monospace; }
    .code-wrap { position: relative; margin: 14px 0; }
    .code-lang { position: absolute; top: 8px; right: 12px; font-size: 10.5px; color: #9a8575; text-transform: uppercase; }
    .doc-card pre { background: #2a211b; color: #f6ede2; padding: 15px 16px; border-radius: 12px; overflow-x: auto; font-size: 12.8px; line-height: 1.55; }
    .doc-card pre code { background: transparent; color: inherit; padding: 0; }
    .doc-card a.doc-link, .doc-card a.ext-link { color: var(--accent); text-decoration: none; font-weight: 600; border-bottom: 1px dashed rgba(201,108,52,0.45); }
    .doc-card a.doc-link:hover, .doc-card a.ext-link:hover { border-bottom-style: solid; }
    .md-list { margin: 8px 0 14px; padding-left: 20px; }
    .md-list li { margin: 5px 0; }
    .md-list li.depth-1 { margin-left: 20px; list-style-type: circle; }
    .md-list li.depth-2 { margin-left: 40px; list-style-type: square; }
    .md-list li.depth-3 { margin-left: 60px; }
    .tbl-wrap { overflow-x: auto; margin: 14px 0; border: 1px solid var(--border); border-radius: 10px; }
    .doc-card table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .doc-card th, .doc-card td { padding: 9px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
    .doc-card th { background: #f8f1e8; font-weight: 700; white-space: nowrap; }
    .doc-card tr:last-child td { border-bottom: none; }
    .mini-toc {
      border-left: 1px solid var(--border); background: #fcf9f5; padding: 18px 14px; overflow-y: auto;
    }
    .toc-title { font-size: 11.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    .toc-link {
      display: block; font-size: 12.5px; color: #5b4636; text-decoration: none; padding: 4px 6px;
      border-radius: 6px; margin-bottom: 2px; line-height: 1.4;
    }
    .toc-link:hover { background: var(--accent-soft); color: var(--accent); }
    .toc-l2 { padding-left: 10px; }
    .toc-l3 { padding-left: 20px; font-size: 12px; color: var(--muted); }
    @media (max-width: 1120px) {
      .content-grid { grid-template-columns: 1fr; }
      .mini-toc { display: none !important; }
    }
    @media (max-width: 820px) {
      .app { grid-template-columns: 1fr; height: auto; overflow: visible; }
      .sidebar { height: auto; max-height: 44vh; border-right: none; border-bottom: 1px solid var(--border); }
      .main-col { height: auto; }
      .main-scroll { padding: 18px 14px 48px; }
      .doc-card { padding: 20px 18px; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <h1>🐾 拾暖伴伴｜文件閱讀器</h1>
        <div class="sub" id="meta-sha">載入中...</div>
      </div>
      <div class="search-box">
        <input id="search-input" type="search" placeholder="🔍 搜尋標題或關鍵字（如 TC-10、Rive）" />
      </div>
      <nav class="sidebar-nav" id="sidebar-nav"></nav>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <span id="doc-breadcrumb">docs/specs/README.md</span>
        <div class="topbar-right">
          <a class="repo-link" href="https://github.com/blissjoy/shinuan" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          <button type="button" class="btn-top" id="btn-top">↑ 回到頂部</button>
        </div>
      </header>
      <div class="content-grid">
        <main class="main-scroll" id="main-scroll">
          <article class="doc-card" id="doc-body"></article>
        </main>
        <aside class="mini-toc" id="mini-toc"></aside>
      </div>
    </div>
  </div>
  <script>window.__SHINUAN_DOCS__ = ${payloadJson};</script>
  <script>${appScript}</script>
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), fullHtml, 'utf8');
fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');
console.log(`DOCS_SITE_BUILT_OK dir=${outDir} docs=${Object.keys(docsMap).length} links=${verifiedLinks} sha=${shortSha} bytes=${Buffer.byteLength(fullHtml, 'utf8')}`);
