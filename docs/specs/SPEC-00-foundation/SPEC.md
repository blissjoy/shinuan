<a id="top"></a>

# SPEC-00｜底座與拾戰治理導入

> **導覽：** [← 回到規格入口](../README.md) ｜ [Phase A 規格地圖](../PHASE-A-SPEC-MAP.md#spec-00) ｜ [Master PRD v2.1.30](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ROADMAP](../../../ROADMAP.md)

---

## 1. 這個 SPEC 的目的是什麼？

在寫任何一行遊戲規則之前，先把**工程底座、安全防護與 AI 協作治理紀律**一次架好：
- 建立乾淨的 pnpm Monorepo 與 TypeScript Strict / Vitest 測試環境，讓純 TypeScript 遊戲核心能在 Windows 本機獨立跑測試、零手機環境依賴。
- 導入拾戰 AI Studio 制度（`P-08`、`GOV-003`、`MOS v0.3`）與自動化守門腳本，從機制上杜絕「直推 `master`」、「誤觸 PO 私人筆記禁區」與「遊戲核心混入平台 API」。

---

## 2. 要完成哪些功能？

### In-Scope（本 SPEC 涵蓋）
- **Repo 治理與安全護欄：**
  - `.gitignore` 永久保護 `/docs/PO-step-by-step/` 禁區。
  - 建立本機 `pre-push` 守門邏輯（阻擋任何直接推送至 `refs/heads/master`）。
  - 建立自動守門腳本 `scripts/check-shinuan-integrity.mjs`，自動核對 `.gitignore`、`packages/game-core` 純淨度與 Master PRD 版本號。
- **Monorepo 空白骨架與驗證看板地基：**
  - 建立 `packages/contracts`、`packages/config-loader`、`packages/game-core`、`apps/local-cli`、`apps/local-sandbox` 與 `tests/` 目錄及基礎煙霧測試。
  - 提供本機網頁看板首頁（專案健康狀態頁）與 `--once` 單次檢查模式。

### Out-of-Scope（明確排除）
- 不實作任何具體業務型別、基因公式、時間引擎或經濟規則（交由 `SPEC-01` ～ `SPEC-04` 逐步落地）。

---

## 3. 對應 Master PRD 哪幾點？

- **[Master PRD v2.1.30](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) §5.1 嚴格平台解耦與開發階段規範：** 規範 Phase A 必須在 Windows Node.js 獨立執行，Game Core 嚴禁平台 API。
- **§5.3 Monorepo 專案目錄結構：** 定義 `packages/`、`apps/`、`content/`、`tests/`、`scripts/`、`docs/` 完整職責切分。
- **§5.4 AI 協作與工程管理規範（§5.4.1～§5.4.3）：** 導入拾戰三模型閉環、Protected PO Notes 絕對禁區、PRD 數值保護與測試獨立性。

---

## 4. 小單、技術設計書與驗收成果

- **`SHINUAN-S0-01`（Issue #1 / PR #2 — 已合併 ✅）**
  - **說明文件：** 本頁與 [PHASE-A-SPEC-MAP.md](../PHASE-A-SPEC-MAP.md#spec-00)（純底座骨架單，無另立獨立設計書）
  - **自動化驗收：** `pnpm typecheck`、`pnpm test`、`node scripts/check-shinuan-integrity.mjs` 全綠，`pre-push` 守門單元測試通過。
  - **PO 眼睛看得到的成果：** 本機開啟 `apps/local-sandbox` 可直接看到專案健康狀態頁。

---

[↑ 回到頂部](#top) ｜ [← 回到規格入口](../README.md) ｜ [下一個：SPEC-01 →](../SPEC-01-contracts-config-genetics/SPEC.md)
