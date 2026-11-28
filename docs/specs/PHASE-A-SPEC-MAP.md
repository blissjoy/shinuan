<a id="top"></a>

# 拾暖伴伴（SHINUAN）Phase A 規格拆解地圖（SPEC-00 ～ SPEC-04）

> **導覽：** [← 回到規格入口](README.md) ｜ [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ROADMAP](../../ROADMAP.md) ｜ [Phase B 2D 美術規範](PHASE-B-2D-ART-PIPELINE-SPEC.md)

- **文件性質：** Phase A 大／中／小規格拆解與漸進可視化驗收藍圖（2026-11-26 重構為大綱條列＋上下錨點版本）
- **對應基準：** [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md)
- **治理模式：** 拾戰 AI Studio 已生效制度（`P-08 v0.3`、`GOV-003 v0.1`、`MOS v0.3`）
- **追蹤原則：** 全 Phase A 共 **5 大規格 × 12 張精簡小單**，每張小單對應 1 個 GitHub Issue ＋ 1 條任務分支 ＋ 1 個 PR；PO 核准之技術設計書均納入 `docs/specs/`。

---

## 快速跳轉目錄

- [一、5 大規格 × 12 張小單大綱總覽](#overview)
  - [SPEC-00｜底座與拾戰治理導入（1 單）](#spec-00)
  - [SPEC-01｜契約、設定與基因引擎（4 單）](#spec-01)
  - [SPEC-02｜時間引擎與健康救援（2 單）](#spec-02)
  - [SPEC-03｜經濟、背包與防損存檔（2 單）](#spec-03)
  - [SPEC-04｜行為仲裁、CLI 與長時模擬（3 單）](#spec-04)
- [二、每張小單的標準運作節奏（拾戰三模型省額度閉環）](#workflow)
- [三、可視化驗收看板（`apps/local-sandbox/`）漸進藍圖](#sandbox)
- [四、商業化商品批次匯入工具規劃（配合 `S1-02` 與 Phase D）](#catalog-import)

---

<a id="overview"></a>

## 一、5 大規格 × 12 張小單大綱總覽

<a id="spec-00"></a>

### SPEC-00｜底座與拾戰治理導入
- **SPEC 導讀頁：** [SPEC-00-foundation/SPEC.md](SPEC-00-foundation/SPEC.md)
- **核心目的：** 建立零手機依賴的 Windows Monorepo 開發骨架、自動純淨度守門腳本與拾戰治理護欄。
- **對應 PRD：** §5.1、§5.3、§5.4
- **包含小單：**
  - **`SHINUAN-S0-01`（Issue #1 ✅）— 治理導入、安全補洞與 Monorepo 空白骨架**
    - **核心交付：** `.gitignore` 保護禁區、導入拾戰規則、安裝 `pre-push` 守門、pnpm Monorepo ＋ TypeScript strict ＋ Vitest ＋ `check-shinuan-integrity.mjs` ＋ 空白看板。
    - **驗收門檻：** `pnpm test`、`pnpm typecheck`、`node scripts/check-shinuan-integrity.mjs` 全綠。
    - **PO 看得到的成果：** 本機開啟 `local-sandbox` 看到專案健康狀態頁。

[↑ 回到頂部目錄](#top)

---

<a id="spec-01"></a>

### SPEC-01｜契約、設定與基因引擎
- **SPEC 導讀頁：** [SPEC-01-contracts-config-genetics/SPEC.md](SPEC-01-contracts-config-genetics/SPEC.md)
- **核心目的：** 鎖死跨模組型別契約、建立外部 JSON 設定與商品匯入驗證器，並打造純品種＋真實貓咪 9 基因座雙軌領養遺傳引擎。
- **對應 PRD：** §0、§2.1、§3.1、§3.2（第一／二層）、§8.A.1～§8.A.5、§8.B.2、§8.C.2、§8.D、§8.E.2（`TC-01`/`TC-02`/`TC-10`）
- **包含小單：**
  - **`SHINUAN-S1-01`（Issue #3 ✅）— `packages/contracts` 全部型別與介面契約**
    - **技術設計書：** [S1-01-contracts-design.md](SPEC-01-contracts-config-genetics/S1-01-contracts-design.md)
    - **核心交付：** `PetState`（含 `id`/`microchipId`）、`GameState`、`PetGenetics`、`ColorParams`、`Clock`、`RandomGenerator`、`PetViewModel`、`GameCommand`、`GameEvent`、`FoodCatalogItem` 三區塊 Schema。
    - **驗收門檻：** `pnpm typecheck` 零錯＋契約列舉與級距單元測試。
    - **PO 看得到的成果：** 型別鎖死，後續模組不互相打架。
  - **`SHINUAN-S1-02`（Issue #5 / #7 ✅）— `content/` 靜態 JSON、`config-loader` 與批次匯入驗證**
    - **技術設計書：** [S1-02-config-loader-design.md](SPEC-01-contracts-config-genetics/S1-02-config-loader-design.md)
    - **核心交付：** 4 份靜態 JSON（品種、特徵、相容規則、8 款預設商品）、7 級距白名單驗證器、Fail-Closed 損毀回退與 `scripts/import-catalog.mjs` CSV/JSON 轉檔檢核 CLI。
    - **驗收門檻：** 級距白名單、損毀 Fallback 與 CLI 驗證測試全綠。
    - **PO 看得到的成果：** 可直接用 CSV/JSON 批次驗證商品目錄。
  - **`SHINUAN-S1-03`（Issue #9 🟡 95% 暫停中）— `GeneticsEngine`（純品種模式）＋ 領養盲盒可視化頁**
    - **技術設計書：** `SPEC-01-contracts-config-genetics/S1-03-genetics-engine-design.md`（隨 Issue #9 合併納入）
    - **核心交付：** FNV-1a 32-bit → `mulberry32-v1`、90/10 同種、60/40 加菲、30/50/20 米克斯、規則 1→4 相容修正、`colorParams`、4 款小怪癖抽取。
    - **驗收門檻：** **`TC-01`**（Golden Fixture）、**`TC-02`**（1,000 種子全組合統計）。
    - **PO 看得到的成果：** 開瀏覽器親手選爸媽品種「抽盲盒生貓」＋ 看色塊與 1,000 隻分布圖。
  - **`SHINUAN-S1-04`（Issue #12 📋）— 真實遺傳引擎、爸爸%/媽媽%預覽、一胎 3～5 隻與皮克敏式 2D 換色選父母**
    - **技術設計書：** [S1-04-preset-parents-litter-design.md](SPEC-01-contracts-config-genetics/S1-04-preset-parents-litter-design.md)
    - **核心交付：** 增量擴充 `@shinuan/contracts`（`CoatGenotype`、`PresetParentCat`、`AdoptionLitter`、`AccountMeta`、`DailyLimits` 繁育欄位等）與 `@shinuan/config-loader`（載入與 Fail-Closed 驗證 `content/genetics/preset-parents.v1.json`）、9 基因座孟德爾毛色與毛長（`L/l`）遺傳＋E1 2% 公三花 XXY 彩蛋、對稱眼色光譜、鼻頭／肉球、雙曼赤肯 2:1 校正、精確配對毛色%預覽（`calculatePairingPreviewProbability()`）、一胎 3～5 隻（30/40/30）、預覽怪癖遮罩、R1 每日 3 胎上限與帳號總免費上限。
    - **驗收門檻：** **`TC-10`** ＋ `TC-01`/`TC-02` 零破壞回歸。
    - **PO 看得到的成果：** 開瀏覽器以皮克敏式 2D 貓咪點色球挑爸媽、看爸爸色%/媽媽色%提示 → 一胎生 3～5 隻小貓挑寶貝領養。

[↑ 回到頂部目錄](#top)

---

<a id="spec-02"></a>

### SPEC-02｜時間引擎與健康救援
- **SPEC 導讀頁：** [SPEC-02-time-engine-health/SPEC.md](SPEC-02-time-engine-health/SPEC.md)
- **統一技術設計書：** [SPEC-02-time-engine-health-design.md](SPEC-02-time-engine-health/SPEC-02-time-engine-health-design.md)
- **核心目的：** 打造省電離線時間補算與「不死貓、40 地板、10 下限、2h Boost、Care Pause」無壓力健康保護網。
- **對應 PRD：** §1、§4.2、§8.C.1、§8.E.2（`TC-03`/`TC-04`）、§8.E.3（`TC-MH-01～10`/`12`）、§10.2 #2
- **包含小單：**
  - **`SHINUAN-S2-01`（Issue #13 📋）— `TimeEngine` 基礎推進與需求衰退**
    - **核心交付：** 共用常數、0.25h 步長、注入時區 `07:00`/`23:00` 日夜與 `00:00` 跨日切割、防時鐘回撥、`Hunger`/`Hydration`/`Mood` 衰退。
    - **驗收門檻：** **`TC-03`**（跨夜、跨日、分段一致性 `< 1e-9`、時鐘回撥）。
    - **PO 看得到的成果：** 看板可按「快轉 +15m / +1h / +6h / +24h」看三需求血條與日夜切換。
  - **`SHINUAN-S2-02`（Issue #14 📋，前置 #13）— 精確交點切割、`MoodHealthPenalty`、`RecoveryState` 與 `CarePause`**
    - **核心交付：** 全 12 組門檻 Signed Rate Threshold Crossing、40 安全地板、10 下限、2h Boost、分級 Natural Recovery（夜間不暫停）、Care Pause 凍結與指令後即時重評（P1-4）。
    - **驗收門檻：** **`TC-04`**、**`TC-MH-01～10`**、**`TC-MH-12`**、Property-based 不變量測試。
    - **PO 看得到的成果：** 看板一鍵演練「3 天沒理貓 → 進入 `CRITICAL` → 2 小時 Boost 救援 → 滿血復活」與 Care Pause 凍結。

[↑ 回到頂部目錄](#top)

---

<a id="spec-03"></a>

### SPEC-03｜經濟、背包與防損存檔
- **SPEC 導讀頁：** [SPEC-03-economy-save/SPEC.md](SPEC-03-economy-save/SPEC.md)
- **統一技術設計書：** [SPEC-03-economy-save-design.md](SPEC-03-economy-save/SPEC-03-economy-save-design.md)
- **關聯 ADR：** [ADR-003 JSON → SQLite 存檔演進](../decisions/ADR-003-save-storage-json-to-sqlite.md)
- **核心目的：** 實現無反感內容型原生廣告商店、公平免費糧水與防壞檔 JSON 原子存檔遷移。
- **對應 PRD：** §2.1、§4.4、§8.C.2、§8.C.3、§8.E.1、§8.E.2（`TC-07`）、§8.E.3（`TC-MH-11`）
- **包含小單：**
  - **`SHINUAN-S3-01`（Issue #15 📋，前置 #12、#14）— `EconomyEngine` 與商品探索／背包**
    - **核心交付：** 200 初始積分、20h＋本地日期雙重防重簽到、商店首開 `+5` ＋ 商品停留 3 秒探索（上限 30）、互動上限 25（超額續給 `mood +3`）、高健康日結 `+25`（跨多日單次判定）、免費品免扣庫存、軟下架商品背包可用；依賴 `#12` 已合併之 `DailyLimits` 繁育欄位與 `#14` `TimeEngine`。
    - **驗收門檻：** **`TC-07`**（防重、跨午夜重置、跨多日日結最多一次、購買與背包）。
    - **PO 看得到的成果：** 看板「模擬商店頁」：看營養成分停留 3 秒領分、買罐頭進背包並餵食。
  - **`SHINUAN-S3-02`（Issue #16 📋，前置 #12、#15）— 防損 JSON 存檔與 `v1 → v2` 遷移**
    - **核心交付：** 純 TS 驗證／遷移層 ＋ `packages/storage-json`（`save.tmp` → 讀回驗證 → `save.bak` → 原子替換）；`v1 → v2` 遷移絕不重置外觀與性格。
    - **驗收門檻：** **`TC-MH-11`**（`lowMoodDuration` 跨存檔續算）＋ 損毀回退與遷移測試。
    - **PO 看得到的成果：** 看板「存檔／重整網頁／模擬損毀還原」驗證進度零遺失。

[↑ 回到頂部目錄](#top)

---

<a id="spec-04"></a>

### SPEC-04｜行為仲裁、CLI 與長時模擬
- **SPEC 導讀頁：** [SPEC-04-behavior-cli-simulation/SPEC.md](SPEC-04-behavior-cli-simulation/SPEC.md)
- **統一技術設計書：** [SPEC-04-behavior-cli-simulation-design.md](SPEC-04-behavior-cli-simulation/SPEC-04-behavior-cli-simulation-design.md)
- **核心目的：** 賦予貓咪 30 日後天性格與 6 級行為反應、完成 `GameEngine` 總組裝與 CLI 雙介面，並透過 60 天／365 天長時模擬正式封版 Phase A。
- **對應 PRD：** §3.2、§4.3、§5.2、§8.B.1～§8.B.3、§8.E.2（`TC-05`/`TC-06`/`TC-08`/`TC-09`）
- **包含小單：**
  - **`SHINUAN-S4-01`（Issue #17 📋，前置 #16）— 30 日人格記憶、`QuirkModifiers`、`BehaviorEngine` 與 `PetViewModel`**
    - **核心交付：** 4 維度 30 日滾動視窗公式、傲嬌 45% 先撇頭後吃、Priority `100>90>80>60>40>10`、POKE 10s 滑窗、15s／60s 獨立冷卻、唯讀 `PetViewModel`。
    - **驗收門檻：** **`TC-05`**、**`TC-06`**。
    - **PO 看得到的成果：** 看板「連戳貓咪 4 下觸發背對生氣＋15 秒冷卻倒數」與四維度人格面板。
  - **`SHINUAN-S4-02`（Issue #18 📋，前置 #17）— `GameEngine` 總組裝與 `apps/local-cli` 互動指令列**
    - **核心交付：** 純同步 `GameEngine.dispatch()` 總管線 ＋ Windows 終端機互動養貓 CLI（領養、餵食、喝水、摸頭、玩耍、戳貓、快轉、Care Pause、商店、存檔）。
    - **驗收門檻：** 端對端 CLI 整合測試。
    - **PO 看得到的成果：** 終端機與網頁雙介面完整驅動同一套 `GameEngine`。
  - **`SHINUAN-S4-03`（Issue #19 📋，前置 #18）— 365 天／60 日長時模擬驗收套件與 Phase A 結案報告**
    - **核心交付：** 365 天隨機玩家長時模擬 ＋ 60 日照護負擔（情境 A / B-1 / B-2 / B-3 / C 逐段對帳）＋ 看板純原生 SVG 四大數值趨勢曲線 ＋ `docs/acceptance/PHASE-A-CLOSEOUT-REPORT.md`。
    - **驗收門檻：** **`TC-08`**、**`TC-09`**（全子情境零誤差對帳）。
    - **PO 看得到的成果：** 一鍵跑出 60 天／365 天四大數值趨勢曲線圖 → **Phase A 正式封版！**

*(後續 Phase B 2D 粉彩貓咪拆圖與動態著色規範見 [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md)，動畫引擎與雙平台橋接決策見 [ADR-001](../decisions/ADR-001-animation-engine-rive.md) 與 [ADR-002](../decisions/ADR-002-mobile-native-bridge-architecture.md)。)*

[↑ 回到頂部目錄](#top)

---

<a id="workflow"></a>

## 二、每張小單的標準運作節奏（拾戰三模型省額度閉環）

1. **派工前（Gemini 主對話）：** 只摘錄該小單需要的規格與契約，寫成精簡派工包放進 `D:\Dropbox\ai-bridge\shinuan\tasks\<TASK-ID>\`（不讓 Claude 重讀整份 Master PRD），並強制要求 Claude 動工前對 Design 執行自我審核、遇疑即停。
2. **開發（Claude Code，乾淨短視窗）：** 自 `master` 切任務分支實作＋自測＋建立 PR，對話框只回 3 行短回報。
3. **獨立 QA（GitHub Copilot Free 主視窗 Agent 模式；滿額時 Fallback Claude `qa` 子代理）：** 於獨立 `git worktree` 針對 PR head commit 獨立執行 Vitest、純淨度檢核與邊界測試，輸出報告至 Dropbox 任務目錄。
4. **獨立審查（Gemini 獨立 Reviewer 子代理，全新 `conversationId`）：** 核對 PR diff、PRD 條文、禁區保護與 QA 證據，出具 `APPROVED` / `CHANGES REQUESTED`。
5. **PO 驗收與合併（R3-A）：** PO 檢視摘要與可視化看板後親自核准 Merge，關閉 Issue。

[↑ 回到頂部目錄](#top)

---

<a id="sandbox"></a>

## 三、可視化驗收看板（`apps/local-sandbox/`）漸進藍圖

- **嚴格單向依賴：** 只能呼叫 `GameEngine.dispatch(command)` 與唯讀消費 `PetViewModel`，**禁止在前端寫任何遊戲規則或數值計算**。
- **極簡零負擔：** 純輕量原生 HTML / TypeScript，不引進厚重 UI 框架。
- **漸進長出 4 個分頁：**
  - **Tab 1（`S1-03` / `S1-04`）：** 領養盲盒與基因統計（品種 1,000 隻分布圖 ＋ 皮克敏式 2D 換色挑爸媽、爸爸色%/媽媽色%預覽、一胎 3～5 隻、公三花彩蛋與 R1 防盲抽）。
  - **Tab 2（`S2-01` / `S2-02`）：** 即時照護與時間模擬器（四大血條、日夜背景、Care Pause 開關、快轉與 3 天救援一鍵演練）。
  - **Tab 3（`S3-01` / `S3-02`）：** 原生廣告商店與存檔測試（分類篩選、品牌／測試標籤、停留 3 秒領分、購買餵食與防損存檔重載）。
  - **Tab 4（`S4-01` / `S4-03`）：** 行為互動與長時模擬曲線（戳貓 4 下背對生氣＋15 秒冷卻條、60 天／365 天四大數值趨勢曲線圖）。

[↑ 回到頂部目錄](#top)

---

<a id="catalog-import"></a>

## 四、商業化商品批次匯入工具規劃（配合 `S1-02` 與 Phase D）

- **資料契約（Phase A `S1-02` 已鎖定）：** `food-catalog.v1.json` 採三區塊結構（`externalSource`、`vendorInfo`、`gameBalance`）＋ 軟下架狀態 `status`。
- **內部批次建檔（Phase A/C）：** `scripts/import-catalog.mjs` 支援 CSV／JSON 商品清冊轉檔，自動校驗 §8.C.2 定價級距天花板、必填成分欄位與 `itemId` 唯一性。
- **未來品牌商第三方 API 匯入（Phase D）：** 複用同一驗證核心作為中台匯入管線，接收廠商 Feed 更新 `vendorInfo`（無權覆寫 `gameBalance`）→ 新品標記 `pending_review` 經審核後發佈至靜態 CDN（如 Cloudflare R2）供 App 免更新下載。

[↑ 回到頂部目錄](#top) ｜ [← 回到規格入口](README.md)
