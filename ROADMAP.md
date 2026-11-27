# 拾暖伴伴（shinuan）ROADMAP — Phase A～E 進度看板

- **規格基準：** Master PRD v2.1.31（§6 長期留存、§7 開發與實作路線圖、§11.2 Sprint 執行順序）
- **Phase A 細部拆解：** [`docs/specs/PHASE-A-SPEC-MAP.md`](docs/specs/PHASE-A-SPEC-MAP.md)
- **任務追蹤：** GitHub Issues ＋ Branch ＋ PR（`AGENTS.md` §6）
- **狀態圖例：** ⬜ 未開始　🟡 進行中　🔍 待 QA／審查　✅ 已合併（PO 核准）

> 本看板只記錄進度，不定義規格；內容與 PRD 衝突時以 PRD 為準。狀態更新需對應 Issue／PR 證據。

---

## Phase A：Windows Local Core Prototype（第一優先，0 手機環境依賴）

| Sprint | 大規格 | 小單 | 主題 | 驗收門檻 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| Sprint 0 | SPEC-00 底座與拾戰治理導入 | SHINUAN-S0-01（Issue #1 / PR #2） | 治理導入、安全補洞、PRD v2.1.29 定版、pnpm Monorepo ＋ TypeScript strict ＋ Vitest ＋ 純淨度檢核 ＋ 空白看板 | `pnpm typecheck`、`pnpm test`、`node scripts/check-shinuan-integrity.mjs` 全綠 | ✅ |
| Sprint 1 | SPEC-01 契約、設定與基因引擎 | SHINUAN-S1-01（Issue #3 / PR #4） | `packages/contracts` 型別與介面契約 | typecheck ＋ 契約單元測試 | ✅ |
| Sprint 1 | SPEC-01 | SHINUAN-S1-02（Issue #5 / PR #6）＋ S1-02B（Issue #7 / PR #8） | `content/` 靜態 JSON ＋ `config-loader` ＋ 批次匯入驗證與 Fail-Closed 邊界修補 | 級距白名單、損毀設定 Fallback 測試 | ✅ |
| Sprint 1 | SPEC-01 | SHINUAN-S1-03（Issue #9） | `GeneticsEngine`（純品種模式）＋ 領養盲盒可視化頁 | TC-01、TC-02 | 🟡 |
| Sprint 1 | SPEC-01 | SHINUAN-S1-04（Issue #12，設計定案於 PR #11） | 真實毛色／毛長／眼色／鼻頭肉球遺傳、一胎 3～5 隻、E1 彩蛋、R1 防盲抽與皮克敏式 2D 換色看板 | TC-10（＋ TC-01/TC-02 零破壞回歸） | ⬜ |
| Sprint 2 | SPEC-02 時間引擎與健康救援 | SHINUAN-S2-01（Issue #13，設計已定案） | `TimeEngine` 基礎推進與需求衰退 | TC-03 | ⬜ |
| Sprint 2 | SPEC-02 | SHINUAN-S2-02（Issue #14，設計已定案） | 精確交點切割、`MoodHealthPenalty`、`RecoveryState` | TC-04、TC-MH-01～10、TC-MH-12 | ⬜ |
| Sprint 2 | SPEC-03 經濟、背包與防損存檔 | SHINUAN-S3-01（Issue #15，設計已定案） | `EconomyEngine` 與商品探索／背包 | TC-07 | ⬜ |
| Sprint 2 | SPEC-03 | SHINUAN-S3-02（Issue #16，設計已定案） | 防損 JSON 存檔與 `v1→v2` 遷移 | TC-MH-11 ＋ 損毀回退測試 | ⬜ |
| Sprint 3 | SPEC-04 行為仲裁、CLI 與長時模擬 | SHINUAN-S4-01（Issue #17，設計已定案） | 30 日人格記憶、`QuirkModifiers`、`BehaviorEngine` | TC-05、TC-06 | ⬜ |
| Sprint 3 | SPEC-04 | SHINUAN-S4-02（Issue #18，設計已定案） | `apps/local-cli` ＋ `GameEngine` 總組裝 | 端對端整合測試 | ⬜ |
| Sprint 3 | SPEC-04 | SHINUAN-S4-03（Issue #19，設計已定案） | 365 天長時模擬與 Phase A 結案報告 | TC-08、TC-09 | ⬜ |

**Phase A 結案條件：** 上表全部 ✅，且 TC-01～TC-10、TC-MH-01～TC-MH-12 經獨立 QA 實測通過。

---

## Phase B：Renderer Proof of Concept（Sprint 4）

- **2D 美術與拆圖工程規範（已定案）：** [`docs/specs/PHASE-B-2D-ART-PIPELINE-SPEC.md`](docs/specs/PHASE-B-2D-ART-PIPELINE-SPEC.md)（12 零件紙娃娃拆圖 ＋ 3 層 PNG 動態著色 ＋ Rive 共用骨骼 ＋ 2026-11 雙錨點逐件 AI 指令包）
- **手機 UI/UX 與桌面 App 跳台設計（已定案）：** [`docs/specs/PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md`](docs/specs/PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md)（分階段嚴格切分 Phase B/C/D 邊界 ＋ Android 零無障礙權限 Virtual Perch Grid）
- **架構決策紀錄（ADR，PO 已拍板）：**
  - [`ADR-001`](docs/decisions/ADR-001-animation-engine-rive.md)：正式選定 **Rive** ＋ 一次性 3 層 PNG 預合成注入管線（已同步至 Master PRD v2.1.31 §7）
  - [`ADR-002`](docs/decisions/ADR-002-mobile-native-bridge-architecture.md)：React Native ＋ Android Kotlin `WindowManager` 懸浮窗（含 Virtual Perch Grid）＋ iOS `WidgetKit` + `App Groups` 冪等佇列橋接架構

| 項目 | 狀態 |
| --- | --- |
| 選定動畫引擎（已拍板 **Rive**，見 `ADR-001` 與 PRD v2.1.31 §7） | ✅ |
| 單隻測試貓＋最少必要動畫（`idle`、`walk`、`sit`、`sleep`、`eat`、`pet`），驗證 7 大圖層換裝相容性 | ⬜ |
| React Native、Android Kotlin 懸浮窗（含桌面 App 方塊跳台 PoC）、iOS SwiftUI Widget 讀取同一份 `PetViewModel` 的一致性驗證 | ⬜ |
| 領養頁與商店／商品成分頁靜態 UI Prototype（固定 Mock Data，不含真實領養鎖定、購買與經濟結算） | ⬜ |

## Phase C：Pet MVP（雙平台單貓陪伴上線）

- **存檔演進決策（PO 已拍板）：** [`ADR-003`](docs/decisions/ADR-003-save-storage-json-to-sqlite.md)（Phase A JSON → Phase C SQLite 共用 `GameRepository` 與 `TC-MH-11` Contract Test Suite，含 `account_meta_json`）

| 項目 | 狀態 |
| --- | --- |
| 開放正式領養（接通 `generateLitter()`、`calculatePairingPreviewProbability()`、R1 每日 3 胎上限與帳號名額政策）、7 層外觀生成、基礎性格與互動 | ⬜ |
| 完整需求與健康循環（含 Care Pause 照護暫停保護） | ⬜ |
| SQLite 存檔與版本遷移（Migration）＋ iOS Widget `commandId` 冪等佇列補算 | ⬜ |

## Phase D：商店與內容型原生廣告驗證

| 項目 | 狀態 |
| --- | --- |
| 積分系統、商品背包、商店與「成分與營養分析」詳情頁（正式接通 `EconomyEngine` 購買與 3 秒探索入帳） | ⬜ |
| Remote Config（CDN 靜態發佈）與商品批次／品牌商第三方 API 匯入審核管線 | ⬜ |
| 5～10 款模擬與合作品牌商品，驗證探索意願與留存數據 | ⬜ |
| PRD §6 輕量留存驗證：動態食物偏好與新鮮感挑食機制、深夜使用手機情境彩蛋（僅視覺互動，不新增數值懲罰） | ⬜ |

## Phase E：長期陪伴、社交與 LLM 願景

| 項目 | 狀態 |
| --- | --- |
| Google Drive 個人雲端備份 ＋ 雲端帳號名額權威同步（接軌 `account_meta_json`） | ⬜ |
| PRD §6 進階留存與變現擴充：微型月卡（純外觀／多貓槽位 `purchasedExtraPetSlots`，零 Pay-to-Win）與「送養重置機制」（保留圖鑑／回憶與帳號名額紀錄，不刪除既有相簿） | ⬜ |
| Firebase 好友串門子 | ⬜ |
| 計步與戶外散步、回憶相簿 | ⬜ |
| LLM API（僅讀取性格與記憶進行語言表達，BYOK 或對話券控管成本） | ⬜ |
