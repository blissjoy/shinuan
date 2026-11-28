<a id="top"></a>

# 拾暖伴伴（SHINUAN）規格與設計文件入口

> **給第一次打開本目錄的你（PO / 工程師 / 美術 / 審查者）：**  
> 本頁是 `docs/specs/` 的**唯一入口首頁**。不需要從零散的程式碼或技術檔翻找，只要照下方「4 層閱讀順序」就能 1 分鐘掌握全局。

---

## 怎麼看這整套文件？（4 層閱讀順序）

1. **產品需求（Why & What）：** 先看 [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) — 唯一正式產品規格與數值權威。
2. **大規格導讀（`SPEC.md`）：** 看每個模組的 `SPEC.md` — **用人話說清楚這個模組的目的、要做出什麼功能、對應 PRD 哪幾點**。
3. **技術設計書（`*-design.md`）：** 進工程細節 — 演算法、型別契約、狀態機公式與測試斷言（給開發、QA 與 Reviewer 照表施工）。
4. **重大技術選型（ADR）與進度看板：**
   - 進度總表：[ROADMAP.md](../../ROADMAP.md)
   - Phase A／Phase B 拆解地圖：[PHASE-A-SPEC-MAP.md](PHASE-A-SPEC-MAP.md) ｜ [PHASE-B-SPEC-MAP.md](PHASE-B-SPEC-MAP.md)
   - 架構決策紀錄（ADR）：[ADR-001 動畫引擎 Rive](../decisions/ADR-001-animation-engine-rive.md) ｜ [ADR-002 雙平台原生橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md) ｜ [ADR-003 JSON→SQLite 存檔演進](../decisions/ADR-003-save-storage-json-to-sqlite.md)

---

## 快速跳轉目錄

- [Phase A：Windows 本機核心驗證（SPEC-00 ～ SPEC-04）](#phase-a)
  - [SPEC-00：底座與拾戰治理導入](#entry-spec-00)
  - [SPEC-01：資料契約、外部設定與貓咪基因遺傳引擎](#entry-spec-01)
  - [SPEC-02：離線時間推進與健康救援引擎](#entry-spec-02)
  - [SPEC-03：商店經濟、背包與防損存檔](#entry-spec-03)
  - [SPEC-04：30 日人格記憶、行為仲裁、CLI 與長時模擬](#entry-spec-04)
- [Phase B：2D 美術管線與跨平台渲染規格](#phase-b)

---

<a id="phase-a"></a>

## Phase A：Windows 本機核心驗證（SPEC-00 ～ SPEC-04）

<a id="entry-spec-00"></a>

### SPEC-00｜底座與拾戰治理導入（已完成 ✅）
- **目的：** 搭好乾淨的 Monorepo 骨架、自動化純淨度守門腳本與拾戰治理規則，讓所有後續開發有安全護欄。
- **導讀與總覽：** [SPEC-00 規格說明](SPEC-00-foundation/SPEC.md) ｜ [前往 Phase A 拆解清單（此章）](PHASE-A-SPEC-MAP.md#spec-00)
- **小單進度：** `SHINUAN-S0-01`（Issue #1 ✅）

<a id="entry-spec-01"></a>

### SPEC-01｜資料契約、外部設定與貓咪基因遺傳引擎（進行中 🟡）
- **目的：** 鎖死全系統資料結構與設定檔格式，並打造「純品種盲盒 ＋ 真實貓咪 9 基因座遺傳 ＋ 一胎 3～5 隻領養」引擎。
- **導讀與總覽：** [SPEC-01 規格說明](SPEC-01-contracts-config-genetics/SPEC.md) ｜ [前往 Phase A 拆解清單（此章）](PHASE-A-SPEC-MAP.md#spec-01)
- **技術設計書：**
  - `SHINUAN-S1-01`（Issue #3 ✅）：[S1-01 跨模組型別與契約設計](SPEC-01-contracts-config-genetics/S1-01-contracts-design.md)
  - `SHINUAN-S1-02`（Issue #5 / #7 ✅）：[S1-02 靜態設定與批次匯入驗證設計](SPEC-01-contracts-config-genetics/S1-02-config-loader-design.md)
  - `SHINUAN-S1-03`（Issue #9 🟡）：[S1-03 純品種基因引擎設計](SPEC-01-contracts-config-genetics/S1-03-genetics-engine-design.md)（已隨 PR #35 提前納入）
  - `SHINUAN-S1-04`（Issue #12 📋）：[S1-04 真實遺傳學、皮克敏式換色與一胎 3～5 隻設計](SPEC-01-contracts-config-genetics/S1-04-preset-parents-litter-design.md)

<a id="entry-spec-02"></a>

### SPEC-02｜離線時間推進與健康救援引擎（設計已定案 📋）
- **目的：** 實現「免背景常駐省電」的精確時間差補算，並落實拾暖「無死亡、40 安全地板、10 下限、2 小時急速救援、Care Pause 暫停」的無壓力陪伴承諾。
- **導讀與總覽：** [SPEC-02 規格說明](SPEC-02-time-engine-health/SPEC.md) ｜ [前往 Phase A 拆解清單（此章）](PHASE-A-SPEC-MAP.md#spec-02)
- **技術設計書：** [SPEC-02 時間引擎與健康救援設計書](SPEC-02-time-engine-health/SPEC-02-time-engine-health-design.md)（涵蓋 `SHINUAN-S2-01` Issue #13、`SHINUAN-S2-02` Issue #14）

<a id="entry-spec-03"></a>

### SPEC-03｜商店經濟、背包與防損存檔（設計已定案 📋）
- **目的：** 落地「無反感內容型原生廣告商店」（停留 3 秒看營養成分領積分、免費糧水無限供應、軟下架商品背包仍可用）與防壞檔 JSON 原子存檔遷移。
- **導讀與總覽：** [SPEC-03 規格說明](SPEC-03-economy-save/SPEC.md) ｜ [前往 Phase A 拆解清單（此章）](PHASE-A-SPEC-MAP.md#spec-03)
- **技術設計書：** [SPEC-03 經濟商店與防損存檔設計書](SPEC-03-economy-save/SPEC-03-economy-save-design.md)（涵蓋 `SHINUAN-S3-01` Issue #15、`SHINUAN-S3-02` Issue #16）
- **關聯架構決策：** [ADR-003 JSON → SQLite 無痛銜接](../decisions/ADR-003-save-storage-json-to-sqlite.md)

<a id="entry-spec-04"></a>

### SPEC-04｜30 日人格記憶、行為仲裁、CLI 與長時模擬（設計已定案 📋）
- **目的：** 讓貓咪根據過去 30 天的相處養出獨特性格與小怪癖、依 6 級優先順序決定當下動作與冷卻，並以 60 天／365 天長時模擬驗證 Phase A 正式封版。
- **導讀與總覽：** [SPEC-04 規格說明](SPEC-04-behavior-cli-simulation/SPEC.md) ｜ [前往 Phase A 拆解清單（此章）](PHASE-A-SPEC-MAP.md#spec-04)
- **技術設計書：** [SPEC-04 行為仲裁、CLI 與長時模擬設計書](SPEC-04-behavior-cli-simulation/SPEC-04-behavior-cli-simulation-design.md)（涵蓋 `SHINUAN-S4-01` Issue #17、`SHINUAN-S4-02` Issue #18、`SHINUAN-S4-03` Issue #19）

---

<a id="phase-b"></a>

## Phase B：2D 美術管線與跨平台渲染規格

- **Phase B 工程拆單地圖（B1～B4，共 6 張施工小單）：** [PHASE-B-SPEC-MAP.md](PHASE-B-SPEC-MAP.md)
  - **目的：** 將 Phase B 美術、Rive 骨骼、雙平台原生橋接與靜態 UI Prototype 拆解為 `SHINUAN-B1-01` ～ `SHINUAN-B4-01` 六張可執行施工小單，明定先後依賴、驗收門檻與 Phase B／C／D 嚴格邊界。
- **2D 粉彩貓咪拆圖與 AI 生成規範：** [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md)
  - **目的：** 規範「12 個靜態 2D 零件 ＋ 3 層 PNG 動態換色 ＋ 共用 Rive 骨架 ＋ 眼皮 Clipping Path / 2.5D 視差轉身雙鐵律 ＋ 2026-11 雙錨點逐件 AI 指令包」，確保 6 品種與上萬毛色低成本量產且 100% 保留手繪粉彩畫風。
- **手機 9:19.5 全流程 UI/UX 與 Android 桌面 App 方塊跳台設計：** [PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md)
  - **目的：** 定義領養育種室（簡潔孟德爾 `%`）、拾暖小窩、商店 3 秒營養探索與雙平台設定頁面契約，以及零無障礙權限合規之 Android 桌面「App 方塊跳台系統（Virtual Perch Grid）」物理與校正設計。
- **關聯架構決策（已拍板）：**
  - [ADR-001 動畫引擎選定 Rive](../decisions/ADR-001-animation-engine-rive.md)
  - [ADR-002 雙平台原生橋接（React Native / Android 懸浮窗 / iOS Widget）](../decisions/ADR-002-mobile-native-bridge-architecture.md)

---

[↑ 回到頂部](#top)
