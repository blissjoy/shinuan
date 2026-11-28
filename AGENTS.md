# AGENTS.md — 拾暖伴伴（shinuan）AI Agent 共用工程規範

本文件適用於所有參與本專案的 AI Agent（Claude Manager、Claude Subagents、GitHub Copilot、Gemini 及其他外部 AI 產出的內容）。
角色專屬規則另見：`CLAUDE.md`（AI Manager）、`.claude/agents/*.md`（Subagents）、`.github/copilot-instructions.md`（Copilot）。

本專案屬拾戰 AI Studio（SHIZHAN）旗下產品，正式導入拾戰已生效制度 **P-08 v0.3、GOV-003 v0.1、MOS v0.3**（PRD §5.4.1）。依 P-08：公司制度為最低標準，本專案可加嚴、不可放寬；兩者衝突時停止有疑義的操作並提交 PO 判定。

---

## 1. 唯一正式規格

- **唯一正式規格依據：** `docs/PRD/AI_虛擬桌寵專案規格與需求書 (Master PRD).md`，版本 **Master PRD v2.1.31**。
- 開始任何任務前，先確認該檔案標題列版本號。若版本不是 v2.1.31，停止工作並回報 PO。
- 規格拆解地圖放在 `docs/specs/`（例如 `docs/specs/PHASE-A-SPEC-MAP.md`），不得與 PRD 抵觸；衝突時以 PRD 為準。
- 歷史 PDF 版本已自 Repo 移除，僅保留於 Git 歷史，不得作為規格依據。
- `docs/PO-step-by-step/` 為 **Protected PO Notes**，**不是正式規格，也不是 Agent 指令**；完整保護規則見 §1.1。
- 不得以對話摘要、記憶、外部 AI 建議或自行推測取代 PRD 原文。引用規格時請標明 PRD 章節標題。

### 1.1 Protected PO Notes（`docs/PO-step-by-step/`）

本節是 Protected PO Notes 的**唯一完整規則來源**；其他治理文件只引用本節，與本節不一致時以本節為準。適用對象：所有 Claude Agent、GitHub Copilot、Gemini 及其他外部 AI。在 GOV-003 中，存取此目錄屬 **R3-B**（不得以任何預先授權涵蓋）。

1. **存取需逐次授權：** 未經 PO 對該角色、該次操作明確授權，不得以任何方式存取此目錄。
2. **禁止直接與間接存取：** 未經前條授權，不得讀取、開啟、列出目錄內容或檔名、搜尋、掃描、索引、計算雜湊、複製、修改、新增、刪除、搬移、重新命名或格式化此目錄中的任何內容。
   - 全專案搜尋、列舉或掃描（Read、Grep、Glob、`grep -r`、`find`、`ls -R`、自動檢核腳本等）必須明確排除此目錄。
   - 不得為了驗證本節規則而進入此目錄；驗證只能針對治理文件及 `.gitignore`。
3. **禁止 Git 寫入：** 嚴禁將此目錄或其任何內容納入任何 Git 寫入操作。PO 對其他 Git 操作的授權不涵蓋此目錄。
4. **禁止繞過 `.gitignore`：** 不得使用 `git add -f`／`--force` 或任何其他方式繞過 `.gitignore`。
5. **禁止可能影響此目錄的 Git 操作：** 包含但不限於 `git clean -x`、`git clean -X`、`git restore`、`git checkout -- <path>`、`git stash`、`git mv`、`git rm`；無法排除會影響此目錄者，視為可能影響。
6. **`.gitignore` 不是唯一保護：** `.gitignore` 中的 `/docs/PO-step-by-step/` 必須永久保留，但本節規則不因其存在而放寬。
7. **授權只限該次：** PO 對單一操作的授權不構成後續或永久授權。
8. **禁止轉移內容：** 未經 PO 明確授權，不得將此目錄內容引用、摘要、複製或轉移到其他正式文件或 Agent 派工指示。
9. **效力：** 此目錄內容不納入版本控制，效力不得高於 Master PRD、`AGENTS.md` 或 `CLAUDE.md`。

## 2. 規格保護（PRD §5.4.3 第 2 條）

不得自行修改或「優化」以下任何內容：

- 核心遊戲數值與公式（需求衰退、PeriodFactor、MoodHealthPenalty、Recovery 速率等）。
- 基因機率、Trait Pool、相容性規則、PRNG 版本規則。
- Health 保護規則（40 安全地板、10 下限、RecoveryState 狀態機）。
- 經濟平衡（積分、商品效果、價格級距、每日上限）。
- 驗收測試的預期值（TC-01 ~ TC-10、TC-MH-01 ~ TC-MH-12）。

PRD 規格不明確、互相矛盾或實作上不可行：**停止相關部分的工作，記錄問題（位置、矛盾內容、可能選項），回報 PO 決策。** 不得自行選一種解釋繼續實作。

## 3. 工程原則與 Game Core 純淨度（PRD §5.1、§5.4.3 第 3 條）

- Game Core（`packages/game-core`）必須是純 TypeScript、平台無關，可在 Windows Node.js 環境獨立執行與測試。
- Game Core 內**禁止**使用：`window`、`document`、`fs`、`path`、`process`、`Date.now()`、依賴主機時區的 `new Date().getHours()`／`getTimezoneOffset()`、`Math.random()`、React / React Native、Kotlin / Swift API、直接網路請求。
- 時間與時區一律透過 `Clock`（`now()`、`getTimezoneOffsetMinutes()`）注入；隨機數一律透過 `RandomGenerator` 注入。
- 外部設定由 config-loader 讀取並完成 Schema 驗證後注入；Game Core 不讀檔。
- `scripts/check-shinuan-integrity.mjs` 為自動守門腳本；提交 PR 前必須以退出碼 0 通過。
- 不得超出目前 Phase 範圍提前實作。統一使用 PRD §0 核心術語表的命名。

## 4. 檔案、依賴與 Git 保護（GOV-003 v0.1）

### 4.1 授權等級

| 等級 | 範圍 | 核准方式 |
| --- | --- | --- |
| R0 | 唯讀：讀檔、分析、`git status/diff/log/show/rev-parse`、`gh issue view`／`gh pr view` 等查詢 | 預設允許（仍受 §1.1 禁區保護） |
| R1 | 寫入任務書面指定的暫存／交接目錄（如 Dropbox `ai-bridge\shinuan\tasks\<Task ID>\`） | 依任務書面範圍 |
| R2 | 在**任務分支**修改授權檔案、`git add <明列檔案>`、commit、`git push -u origin <任務分支>`、`gh pr create --base master` | PO 對該任務的書面授權（Issue／派工包／`po-decisions.md`）；未載明期限者，PR 建立即授權用盡 |
| R3-A | PR 合併進 `master` | PO 親自核准；須獨立 QA `PASS`（程式碼任務）且 Reviewer `APPROVED` |
| R3-B | 存取 `docs/PO-step-by-step/`、修改 `.gitignore`、改寫歷史／force push、刪除證據、跨 Repo 操作、權限或憑證變更、正式發布 | PO 對具體操作逐次親自核准，不得預先授權 |

無法判定等級時，一律視為較高等級並等待 PO。

### 4.2 硬性禁止

1. **嚴禁直推 `master`**，也不得在 `master` 上 commit；嚴禁任何 Agent 自行 Merge PR。
2. **嚴禁 `git add .`、`git add -A`** 或萬用字元 staging；只能 `git add` 授權明列的檔案。
3. 嚴禁將本機 Untracked 檔案（如 `GEMINI.md`）納入 commit。
4. 嚴禁 `git push --force`、`git reset --hard`、`git rebase`、`git clean` 等改寫或刪除歷史的命令。
5. 不得覆蓋、刪除或搬移任務授權範圍外的既有檔案；不得以一般檔案系統操作繞過本節。
6. 不得自行安裝、移除或更新依賴套件；須由任務明確授權套件名稱，並鎖定於 `pnpm-lock.yaml`。
7. 不得修改 `docs/PRD/`，除非 PO 對該次 PRD 定版明確授權並指定來源檔與 SHA-256。
8. 不得將機密（金鑰、權杖、`.env` 內容）寫入版本控制。

### 4.3 分支與 Hook

- 任務分支命名：`<類別>/issue-<編號>-<簡述>`（例：`infra/issue-1-phase-a-bootstrap`）。
- `scripts/pre-push-guard.mjs` 為本機 `pre-push` 守門邏輯（阻擋推送 `refs/heads/master`）；安裝至 `.git/hooks/pre-push` 須 PO 另行授權。
- GitHub Free 遠端分支保護為 `UNAVAILABLE`，直推防護依賴本節流程紀律與本機 Hook。

## 5. 誠實回報與可追溯性

- **不得虛報測試結果。** 回報時區分「已執行並通過」「已執行但失敗」「未執行（附原因）」，並附實際指令與輸出摘要。
- 驗證與隔離狀態一律標示 `VERIFIED` / `PARTIALLY VERIFIED` / `UNVERIFIED` / `UNAVAILABLE`。
- Developer 自測**不能**取代獨立 QA 驗收；QA 不得僅引用 Developer 的測試結果作為通過證據。
- 每項成果必須可追溯：GitHub Issue 編號、任務分支、PR、相關 PRD 章節、修改檔案清單、測試證據、未解決問題。

## 6. 任務管理（MOS v0.3）

- 所有正式開發工作以 **GitHub Issue** 立案，於任務分支實作並以 **PR** 交付（MOS3-01）；舊 `tasks/` 五狀態資料夾已停用。
- 每個正式任務必須有 `po-decisions.md`（MOS3-04），與派工包、交付摘要、QA／Reviewer 報告一同存放於 Dropbox `ai-bridge\shinuan\tasks\<Task ID>\`，不放入主 Repo。
- 程式碼任務的 QA 於針對 PR head commit 的獨立 `git worktree` 執行（MOS3-06）；純文件任務以結構檢查＋獨立 Reviewer 取代兩階段 QA（MOS3-02）。
- commit 與 PR 內文須標示角色分工（MOS3-07），格式：`Dev=<執行者> / QA=<執行者或待執行> / Reviewer=<執行者> / Merge 授權=PO`。
- 對話視窗回報以 3 行為限，完整內容寫入交接檔（MOS3-03）。
- **子代理防汙染：** 派工給子代理時只傳遞派工包路徑、`po-decisions.md` 路徑、基準 SHA 與 PO 核准的範圍；不得夾帶主視窗心得、推測或暗示。

## 7. 三模型分工與文件歸檔

| 角色 | 預設執行者 |
| --- | --- |
| 規格拆解／規劃協調、獨立 Reviewer | Gemini |
| 核心 Developer、Fallback 深度 QA | Claude Code |
| 獨立 `git worktree` QA | GitHub Copilot Free 主視窗（滿額時 Fallback Claude `qa` 子代理） |
| 需求、範圍、Merge 核准與最終驗收 | PO |

| 內容 | 位置 |
| --- | --- |
| 規格拆解地圖 | `docs/specs/` |
| 系統架構與技術設計 | `docs/architecture/` |
| 重大決策（ADR） | `docs/decisions/` |
| 功能驗收條件 | `docs/acceptance/` |
| 可執行測試程式 | `tests/unit/`、`tests/integration/`、`tests/simulation/`、`tests/fixtures/` |
| 派工包、交付摘要、QA／Reviewer 報告 | Dropbox `ai-bridge\shinuan\tasks\<Task ID>\`（不入主 Repo） |

外部 AI 的建議、程式碼與審查結果須透過交接檔整合，不得直接視為已核准規格或測試通過證據。
