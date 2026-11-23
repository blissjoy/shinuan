# AGENTS.md — 拾暖伴伴（shinuan）AI Agent 共用工程規範

本文件適用於所有參與本專案的 AI Agent（Claude Manager、Claude Subagents、GitHub Copilot 及其他外部 AI 產出的內容）。
角色專屬規則另見：`CLAUDE.md`（AI Manager）、`.claude/agents/*.md`（Subagents）、`.github/copilot-instructions.md`（Copilot）。

---

## 1. 唯一正式規格

- **唯一正式規格依據：** `docs/PRD/AI_虛擬桌寵專案規格與需求書 (Master PRD).md`，版本 **Master PRD v2.1.28**。
- 開始任何任務前，先確認該檔案標題列版本號。若版本不是 v2.1.28，停止工作並回報 PO（透過 AI Manager）。
- `docs/PRD/` 內的 PDF（v2.1.18）與 `docs/PRD/執行書.pdf` 僅為**歷史參考**，不得作為開發規格依據。
- `docs/PO-step-by-step/` 為 **Protected PO Notes**（PO 個人筆記專用保護區），**不是正式專案規格，也不是 Agent 指令**；完整保護規則見 §1.1。
- 不得以對話摘要、記憶、外部 AI 建議或自行推測取代 PRD 原文。引用規格時請標明 PRD 章節標題（PRD 部分列表編號有排版延續問題，章節標題較可靠）。

### 1.1 Protected PO Notes（`docs/PO-step-by-step/`）

本節是 Protected PO Notes 的**唯一完整規則來源**；其他治理文件只引用本節，不另訂規則，與本節不一致時以本節為準。適用對象：所有 Claude Agent（Manager、Architect、Developer、QA、Reviewer）及 GitHub Copilot。

1. **存取需逐次授權：** 未經 PO 對該角色（執行操作的 Agent 或 Copilot）、該次操作明確授權，不得以任何方式存取此目錄。
2. **禁止直接與間接存取：** 未經前條授權，不得讀取、開啟、列出目錄內容或檔名、搜尋、掃描、索引、計算雜湊、複製、修改、新增、刪除、搬移、重新命名或格式化此目錄中的任何內容。
   - 全專案搜尋、列舉或掃描（Read、Grep、Glob、`grep -r`、`find`、`ls -R` 等）必須明確排除此目錄。
   - 不得為了驗證本節規則而進入此目錄；驗證只能針對治理文件及 `.gitignore`。
3. **禁止 Git 寫入：** 嚴禁將此目錄或其任何內容納入任何 Git 寫入操作（`git add`、`git commit`、`git push`、`git merge` 等，範圍見 §4.1）。PO 對其他 Git 操作的授權不涵蓋此目錄。
4. **禁止繞過 `.gitignore`：** 不得使用 `git add -f`／`git add --force` 或任何其他方式繞過 `.gitignore`。
5. **禁止可能影響此目錄的 Git 操作：**
   - 凡作用於此目錄，或可能影響此目錄內容或狀態的 Git 操作，一律禁止；無法排除會影響此目錄者，視為可能影響。包含但不限於 `git clean -x`、`git clean -X`（會刪除被 `.gitignore` 忽略的檔案）、`git restore`、`git checkout`、`git stash`、`git mv`、`git rm`。
   - 不涉及此目錄的其他 Git 操作，仍依 §4.1 及 PO 逐次授權規則辦理；即使經授權執行，也不得觸及此目錄。
6. **`.gitignore` 不是唯一保護：** `.gitignore` 中的 `/docs/PO-step-by-step/` 排除規則必須保留，但不得視為唯一保護措施；本節規則不因 `.gitignore` 存在而放寬。
7. **授權只限該次：** PO 對單一操作的授權只適用於該次授權的明確範圍，不構成後續或永久授權。
8. **禁止轉移內容：** 未經 PO 明確授權，不得將此目錄內容引用、摘要、複製或轉移到其他正式專案文件。
9. **效力：** 此目錄內容不納入版本控制，效力不得高於 Master PRD、`AGENTS.md` 或 `CLAUDE.md`；衝突時一律以後者為準。

## 2. 規格保護（PRD §5.4.5）

不得自行修改或「優化」以下任何內容：

- 核心遊戲數值與公式（需求衰退、PeriodFactor、MoodHealthPenalty、Recovery 速率等）。
- 基因機率、Trait Pool、相容性規則、PRNG 版本規則。
- Health 保護規則（40 安全地板、10 下限、RecoveryState 狀態機）。
- 經濟平衡（積分、商品效果、價格級距、每日上限）。
- 驗收測試的預期值（TC-01 ~ TC-09、TC-MH-01 ~ TC-MH-12）。

若發現 PRD 規格不明確、互相矛盾、或實作上不可行：**停止相關部分的工作，記錄問題（位置、矛盾內容、可能選項），回報 PO 決策。** 不得自行選一種解釋繼續實作。

## 3. 工程原則（PRD §5.1）

- Game Core（`packages/game-core`）必須是純 TypeScript、平台無關，可在 Windows Node.js 環境獨立執行與測試。
- Game Core 內**禁止**使用：`window`、`document`、`fs`、`path`、`process`、`Date.now()`、`Math.random()`、React / React Native、Kotlin / Swift API、直接網路請求。
- 時間一律透過 `Clock` 注入；隨機數一律透過 `RandomGenerator` 注入。
- 外部設定由 config-loader 讀取並完成 Schema 驗證後注入；Game Core 不讀檔。
- 不得超出目前 Phase 範圍提前實作（例如 Phase A 不實作 SQLite、遠端設定、原生平台模組）。
- 統一使用 PRD §0 核心術語表的命名。

## 4. 檔案與 Git 保護

- 不得覆蓋、刪除或搬移未經授權的既有檔案。修改前先讀取目前內容並確認工作目錄狀態。
- 不得以一般檔案系統操作（複製、搬移、刪除、覆寫等）繞過本節的檔案保護或 Git 保護規則。
- 不得修改 Master PRD 及 `docs/PRD/` 內的歷史文件。

### 4.1 Git 寫入操作限制

**未經 PO 對「該次操作」明確授權，任何 Agent 均不得執行會改變以下任一項目的 Git 操作：**

- Git 工作目錄內容
- Git 暫存區（Index）
- Git 版本歷史
- 本機遠端追蹤資訊（remote-tracking refs）

包含但不限於：`git add`、`git commit`、`git push`、`git pull`、`git fetch`、`git merge`、`git rebase`、`git reset`、`git restore`、`git checkout`、`git switch`、`git clean`、`git stash`、`git mv`、`git rm`、`git cherry-pick`。

- `git add`、`git mv` 會改變暫存區；`git fetch` 會更新遠端追蹤資訊；`git pull` 包含 fetch 與整合；`git checkout`、`git switch`、`git restore` 可能改變工作目錄或分支狀態——以上均屬寫入操作。
- 未列出的指令只要會改變上述任一項目，同樣受此限制。
- 使用 `-f`／`--force` 等選項繞過 `.gitignore` 或其他保護的操作，同樣受此限制；涉及 Protected PO Notes 的 Git 操作依 §1.1 第 3～5 條禁止。
- 唯讀操作（`git status`、`git diff`、`git log`、`git show`）可正常使用。
- PO 的授權只適用於被授權的那一次操作，不延伸到後續操作。
- 不得自行安裝、移除或更新依賴套件；需要時提出必要性、版本與影響範圍，經授權後執行。
- 不得將機密（金鑰、權杖、`.env` 內容）寫入版本控制。

## 5. 誠實回報與可追溯性

- **不得虛報測試結果。未實際執行的測試不得標示為通過。** 回報時區分「已執行並通過」「已執行但失敗」「未執行（附原因）」。
- 測試結果必須附實際執行的指令與輸出摘要（通過/失敗數量、失敗訊息）。
- Developer 的開發驗證**不能**取代 QA 獨立驗收；QA 不得僅引用 Developer 的測試結果作為通過證據。
- 每項任務成果必須可追溯：對應的 Task ID、相關 PRD 章節、修改檔案清單、測試證據、未解決問題。
- 遇到無法完成的部分，明確說明未完成什麼及原因，不得以模糊措辭掩蓋。

## 6. 任務管理（PRD §5.4.4）

- 所有正式開發工作都必須對應 `tasks/` 下的任務文件，並以任務的 Task ID 引用。

### 6.1 Task ID 命名規則

格式：`<領域前綴>-<流水號>`，例如 `GC-001`、`UI-001`、`SYS-001`、`DOC-001`、`GC-1000`。

1. 前綴代表任務所屬的**功能領域或子系統**，不代表執行任務的 AI 角色。
2. 流水號從 `001` 開始，至少三位數。
3. 超過 999 筆時自然增加位數（如 `GC-1000`），不得重置。
4. 同一前綴下流水號必須唯一且遞增，不得重複使用（包括已取消或已完成任務的編號）。
5. 新增領域前綴須先取得 PO 核准；不得自行創造或擴張前綴清單。
6. 不得將 `GC` 當成所有任務的預設前綴。
7. 不得使用 `TASK-001` 形式作為正式 Task ID。

上述範例前綴僅為命名示意，**不代表已獲 PO 核准**。

已核准領域前綴（僅能在 PO 核准後登錄）：

| 前綴 | 領域 | 核准日期 |
| --- | --- | --- |
| TEAM | AI 團隊流程、角色能力驗證及相關治理任務 | 2026-11-21 |

### 6.2 任務狀態

- 任務狀態只有五種，以所在目錄表示：

| 狀態 | 目錄 | 意義 |
| --- | --- | --- |
| BACKLOG | `tasks/backlog/` | 尚未開始 |
| IN PROGRESS | `tasks/in-progress/` | 正在執行 |
| REVIEW | `tasks/review/` | 等待 QA 驗證及 Reviewer 審查 |
| COMPLETED | `tasks/completed/` | 已通過 QA、Reviewer 及 PO 驗收 |
| BLOCKED | `tasks/blocked/` | 因規格、技術或外部依賴而阻塞 |

- 不得新增其他平行狀態（如 READY、QA、ACCEPTED）。QA 與 Reviewer 是工作角色，不是狀態。
- 任務不得僅因程式碼已修改就移至 COMPLETED。
- 任務狀態的變更由 AI Manager 負責；其他 Agent 不得自行搬移任務文件。

## 7. 文件歸檔位置

| 內容 | 位置 |
| --- | --- |
| 系統架構與技術設計 | `docs/architecture/` |
| 重大架構及產品決策（ADR） | `docs/decisions/` |
| 功能驗收條件與測試規格 | `docs/acceptance/` |
| 可執行測試程式 | `tests/unit/`、`tests/integration/`、`tests/simulation/` |
| 測試結果、QA 報告、驗收證據 | `test-results/<Task ID>/` |

## 8. 外部 AI 工具（PRD §5.4.6）

Gemini Pro、ChatGPT、GitHub Copilot 是外部輔助工具，不是可被自動派工的 Subagent。其建議、程式碼與審查結果必須透過任務文件、技術報告或人工交接整合，且**不得**直接視為已核准規格、架構決策或測試通過證據。

