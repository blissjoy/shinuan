# GitHub Copilot 專案指引 — 拾暖伴伴（shinuan）

Copilot 在本專案是**外部輔助工具**，不是 Claude AI Manager 可自動派遣的 Subagent。完整共用規範見根目錄 `AGENTS.md`，本文件與其衝突時以 `AGENTS.md` 為準。

## 開始任何專案任務前

1. 先閱讀根目錄 `AGENTS.md`。
2. 確認 Master PRD 標題為 **v2.1.28**；版本不符時停止工作並回報 PO。
3. 若目前使用環境無法讀取 `AGENTS.md` 或無法確認 PRD 版本，必須明確告知 PO，**不得假裝已確認**。
4. 不得以 Copilot 自身的建議或推測取代 PRD 原文。

## Protected PO Notes

`docs/PO-step-by-step/` 為 PO 個人筆記專用保護區（Protected PO Notes）。完整規則以 `AGENTS.md` §1.1 為準，要點如下：

- 未經 PO 對該角色（Copilot）、該次操作明確授權，不得以任何方式存取 `docs/PO-step-by-step/`（含讀取、引用、搜尋、索引、修改、新增、刪除、搬移、重新命名、格式化或複製其中任何內容）。
- 不得將其納入任何 Git 寫入操作，也不得以 `git add -f`／`--force` 或其他方式繞過 `.gitignore`。
- 凡作用於 `docs/PO-step-by-step/`，或可能影響該目錄內容或狀態的 Git 操作，一律禁止；無法排除會影響該目錄者，視為可能影響。包含但不限於 `git clean -x`、`git clean -X`（會刪除被 `.gitignore` 忽略的檔案）、`git restore`、`git checkout`、`git stash`、`git mv`、`git rm`。
- 不涉及該目錄的其他 Git 操作，仍依 `AGENTS.md` §4.1 及 PO 逐次授權規則辦理；即使經授權執行，也不得觸及該目錄。PO 對一般 Git 操作的授權，不代表授權觸及 Protected PO Notes。
- `.gitignore` 的排除規則必須保留，但它不是唯一保護措施。
- PO 的授權只限該次明確授權範圍，不構成後續或永久授權。
- 未經 PO 明確授權，不得將筆記內容引用、摘要、複製或轉移到其他正式文件。

## 任務與角色定位

- 不得自行建立正式任務、修改任務狀態或搬移 `tasks/` 下的任務文件（由 Claude AI Manager 負責）。
- 不得宣稱 QA 通過或任務完成驗收。
- Copilot 提供的程式碼與建議，仍須經正式流程（Developer 實作 → QA 驗證 → Reviewer 審查 → PO 驗收）整合後才算有效。
- 引用任務時使用 Task ID 格式 `<領域前綴>-<流水號>`（例如 `GC-001`）；不得自行創造未經 PO 確認的領域前綴（已核准清單見 `AGENTS.md` 第 6.1 節）。

## 專案簡介

拾暖伴伴是一款陪伴型 AI 虛擬桌寵 App（Android 懸浮窗 / iOS Widget）。目前處於 **Phase A：Windows 本機 Game Core 驗證**：以 pnpm Monorepo 建置純 TypeScript 的 `packages/game-core`、`packages/contracts`、`packages/config-loader` 與 `apps/local-cli`，並以 Vitest 驗收。目前**不**開發 React Native、Android/iOS 原生模組、SQLite、遠端設定、LLM。

## 唯一正式規格

- `docs/PRD/AI_虛擬桌寵專案規格與需求書 (Master PRD).md`，**Master PRD v2.1.28**。
- `docs/PRD/` 內的 PDF（v2.1.18）與執行書僅為歷史參考，不得作為依據。
- 命名使用 PRD §0 核心術語表（PetState、GameState、PetViewModel、Clock、RandomGenerator、RecoveryState、MoodHealthPenalty 等）。

## 不得自行變更

- 遊戲數值與公式、基因機率、Health 保護規則（40 安全地板、10 下限）、RecoveryState 狀態機、經濟平衡。
- 驗收測試預期值（TC-01 ~ TC-09、TC-MH-01 ~ TC-MH-12）。
- 不得為了讓測試通過而修改預期值或規則。

## TypeScript 工程規範

- TypeScript strict 模式；避免 `any`，必要時加註理由。
- Game Core 必須平台無關，**禁止**：`window`、`document`、`fs`、`path`、`process`、`Date.now()`、`Math.random()`、React / React Native、原生平台 API、直接網路請求。
- 時間透過注入的 `Clock`，隨機數透過注入的 `RandomGenerator`（固定 seed 可重現）。
- 外部設定由 config-loader 讀取 `content/` 並通過 Schema 驗證後注入；Game Core 不讀檔。
- 數值比較須注意 PRD 的等號邊界（例如「嚴格 > 72.0」「health = 40 不進 CRITICAL」）；浮點一致性要求誤差 < 1e-9。

## 程式碼品質與測試

- 測試使用 Vitest，放在 `tests/unit/`、`tests/integration/`、`tests/simulation/`。
- 測試預期值必須來自 PRD 原文，並以註解標明 PRD 章節或 TC 編號。
- 新邏輯需有對應測試，包含邊界值。
- 不得宣稱未執行的測試已通過。

## Git 操作限制

與 `AGENTS.md` 第 4.1 節一致：**未經 PO 對該次操作明確授權，不得執行或自動執行會改變工作目錄、Git 暫存區、版本歷史或本機遠端追蹤資訊的操作**，包含但不限於：`git add`、`git commit`、`git push`、`git pull`、`git fetch`、`git merge`、`git rebase`、`git reset`、`git restore`、`git checkout`、`git switch`、`git clean`、`git stash`、`git mv`、`git rm`、`git cherry-pick`。唯讀操作（`git status`、`git diff`、`git log`、`git show`）可正常使用。

- 不得刪除或覆蓋與目前修改無關的既有檔案，也不得以一般檔案操作繞過上述限制。
- 不得自行安裝或更新依賴套件。

## 遇到不確定時

規格不明確、PRD 互相矛盾、或需要架構決策時：**提出問題並說明可能選項，不得自行猜測實作。**

