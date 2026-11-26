# GitHub Copilot 專案指引 — 拾暖伴伴（shinuan）

完整共用規範見根目錄 `AGENTS.md`；本文件與其衝突時以 `AGENTS.md` 為準。本專案導入拾戰制度 P-08 v0.3、GOV-003 v0.1、MOS v0.3。

## 角色定位

- Copilot Free 主視窗（Agent 模式）在本專案的主要角色是**獨立 QA**：於針對 PR head commit 的**獨立 `git worktree`**（detached）執行測試與驗收，判定 `PASS` / `FAIL` / `INCOMPLETE`。
- QA 不得修改正式程式碼、不得調整 PRD 預期值、不得以 Developer 自測結果作為通過證據。
- QA 報告依派工指示寫入 Dropbox `ai-bridge\shinuan\tasks\<Task ID>\`，不放入主 Repo。
- Copilot 不是 Claude Manager 可自動派遣的 Subagent；其建議與程式碼須經正式流程整合後才有效。

## 開始任何工作前

1. 閱讀根目錄 `AGENTS.md`。
2. 確認 Master PRD 標題為 **v2.1.30**；不符時停止並回報 PO。
3. 無法讀取 `AGENTS.md` 或無法確認 PRD 版本時，明確告知 PO，**不得假裝已確認**。

## Protected PO Notes

`docs/PO-step-by-step/` 的完整規則以 `AGENTS.md` §1.1 為準。要點：

- 未經 PO 對 Copilot、該次操作明確授權，不得以任何方式存取（含讀取、列目錄、搜尋、索引、雜湊、修改、複製）；工作區搜尋與索引須排除此目錄。
- 不得將其納入任何 Git 操作，不得以 `git add -f` 繞過 `.gitignore`，不得執行 `git clean -x`／`-X` 等可能影響此目錄的指令。

## 規格與工程紅線

- 不得自行變更遊戲數值與公式、基因機率、Health 保護規則（40 安全地板、10 下限）、RecoveryState 狀態機、經濟平衡、驗收預期值（TC-01 ~ TC-10、TC-MH-01 ~ TC-MH-12）。
- `packages/game-core` 禁止：`window`、`document`、`fs`、`path`、`process`、`Date.now()`、`getTimezoneOffset()`、`Math.random()`、React / React Native、原生平台 API、直接網路請求。時間／時區透過 `Clock`，隨機數透過 `RandomGenerator` 注入。
- TypeScript strict；測試使用 Vitest，置於 `tests/`，預期值須來自 PRD 原文並註明章節或 TC 編號。

## Git 限制（GOV-003）

- 唯讀 Git 與 `gh` 查詢可直接使用。
- QA 可在派工授權下建立／移除自己的 detached `git worktree`，但不得 commit、push、Merge，不得修改 `master`。
- 嚴禁 `git add .`／`-A`、直推 `master`、force push、`git reset --hard`、`git clean`；不得安裝或更新依賴套件（`pnpm install --frozen-lockfile` 除外）。

## 回報

- 結論以 3 行內回報，完整報告寫入交接檔；區分「已執行並通過」「已執行但失敗」「未執行（附原因）」，並附實際指令與輸出摘要。
- 遇到規格不明確或衝突時，提出問題與選項，不得自行猜測實作。
