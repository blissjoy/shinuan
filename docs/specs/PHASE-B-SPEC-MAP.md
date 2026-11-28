<a id="top"></a>

# 拾暖伴伴（SHINUAN）Phase B 規格拆解地圖（B1 ～ B4）

> **導覽：** [← 回到規格入口](README.md#phase-b) ｜ [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ROADMAP](../../ROADMAP.md) ｜ [Phase A 規格拆解地圖](PHASE-A-SPEC-MAP.md)

- **文件性質：** Phase B（Renderer Proof of Concept，Sprint 4）工程拆單地圖與跨平台驗收藍圖
- **對應基準：** [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md)（§4.1、§4.3、§5.2、§7 Phase B、§8.A～§8.D）
- **定案設計依據：**
  - [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md)（2D 粉彩 12 零件拆圖 ＋ 3 層動態著色 ＋ 渲染雙鐵律）
  - [PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md)（手機 9:19.5 UI/UX ＋ Android 桌面 App 方塊跳台系統）
  - [ADR-001 動畫引擎 Rive](../decisions/ADR-001-animation-engine-rive.md) ｜ [ADR-002 雙平台原生橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md)
- **前置門檻：** 原則上待 **Phase A（`SHINUAN-S0-01` ～ `SHINUAN-S4-03`）封版**、且 `PetViewModel` 與 `packages/game-core` 通過 `TC-01`～`TC-10`／`TC-MH-01`～`TC-MH-12` 後正式開工；惟 **B1 美術產圖與 3 層著色離線試跑** 不依賴手機原生環境，可先行推進。
- **追蹤原則：** 全 Phase B 共 **4 大工項 × 6 張精簡施工小單（`SHINUAN-B1-01` ～ `SHINUAN-B4-01`）**，比照 Phase A 落實拾戰 `P-08 v0.3`、`GOV-003 v0.1`、`MOS v0.3`（1 單 = 1 Issue + 1 Branch + 1 PR + 獨立 QA／Reviewer + PO R3-A 合併）。

---

## 快速跳轉目錄

- [一、4 大工項 × 6 張小單大綱總覽](#overview)
  - [B1｜2D 粉彩資產管線與 3 層動態合成器（2 單）](#b1)
  - [B2｜Rive 共用 2D 骨架動畫與渲染雙鐵律（1 單）](#b2)
  - [B3｜雙平台原生橋接與 Android 桌面跳台 PoC（2 單）](#b3)
  - [B4｜9:19.5 靜態 UI Prototype 與 Phase B 結案（1 單）](#b4)
- [二、Phase B 絕對紅線與 Phase C／D 邊界守則](#boundaries)
- [三、Phase B 封版結案門檻](#closeout)

---

<a id="overview"></a>

## 一、4 大工項 × 6 張小單大綱總覽

```text
SHINUAN-B1-01（12 零件＋5 遮罩透明資產與後製腳本）
   └──▶ SHINUAN-B1-02（3 層動態預合成器＋7 圖層換裝相容驗證）
           └──▶ SHINUAN-B2-01（Rive 共用骨架 .riv ＋ 6 支 P0-B 動作 ＋ 渲染雙鐵律）
                   ├──▶ SHINUAN-B3-01（RN 宿主 ＋ Android Kotlin 懸浮窗與 Virtual Perch Grid 跳台 PoC）
                   ├──▶ SHINUAN-B3-02（iOS SwiftUI WidgetKit ＋ App Groups 唯讀快照與三端 PetViewModel 一致性）
                   └──▶ SHINUAN-B4-01（9:19.5 四大頁面固定 Mock 靜態 UI Prototype ＋ Phase B 結案報告）
```

<a id="b1"></a>

### B1｜2D 粉彩資產管線與 3 層動態合成器
- **設計依據：** [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md) §1～§3、§5～§6；[ADR-001](../decisions/ADR-001-animation-engine-rive.md) §3
- **核心目的：** 跑通 1 隻測試貓（`flat_face` 加菲）完整 12 零件透明 PNG 資產與 `< 20 ms` 3 層動態預合成管線，驗證單套底圖即可乾淨呈現粉彩多毛色、重點色／虎斑／三花柔邊花色與純白防發灰效果。
- **包含小單：**
  - **`SHINUAN-B1-01`（前置：無，可與 Phase A 平行先跑）— 測試貓 12 零件 ＋ 5 組花色遮罩透明資產包與自動化後製腳本**
    - **核心交付：**
      1. 依 §5.2～§5.5 產出 Step 0 灰階總基準（`Ref B`）、12 組測試貓零件（`head`、`ear_L/R`、`eye_socket`、`eye_iris` 雙層、`eyelid_expr`×5、`nose`、`mouth_expr`×4、`whiskers`、`body_torso`、`arm_L/R`＋`paw_pad`、`leg_L/R`、`tail`）與 5 組柔邊遮罩（`M1`～`M5`）。
      2. 建立 §6 自動化無損後製腳本：純白底外圍 Flood-Fill 柔邊去背＋強制 `Saturation = 0`＋亮度校準 `L ∈ [0.58, 0.94]`、線稿 Color-to-Alpha 反預乘還原暖深棕 `#3A281E`、綠幕（`eye_socket`/`pupil_highlight`）HSV 去背去綠邊、`ear_pair`/`arm_pair`/`leg_pair` 依中線切分獨立左右件。
    - **驗收門檻：** 全套產物皆為 `1024×1024` 32-bit RGBA 透明 PNG、符合 `<part_id>__<variant_id>__<layer>.png` 命名規範、`fur_base` 與 `linework` 輪廓對齊誤差 `< 1%` 且零棋盤格／殘綠邊。
    - **PO 看得到的成果：** 完整 12 零件透明資產庫與 4 色以上（奶油／海豹重點／藍灰／純白）靜態換色檢核圖。
  - **`SHINUAN-B1-02`（前置：`SHINUAN-B1-01`）— 3 層動態預合成器與 7 大圖層換裝相容驗證**
    - **核心交付：**
      1. 依 `ADR-001` §3 實作一次性預合成器：讀取 `PetAppearance` 與 `colorParams`，於 `< 20 ms` 內將 `fur_base × primaryHex`、`mask_<pattern> × secondaryHex`（受毛底 Alpha 裁切）、永不染色 `linework` 合成為最終 12 張乾淨 RGBA 零件圖；鼻頭／肉球／虹膜獨立染色，保留純白高光點與左右眼獨立色（支援藍金異色瞳）。
      2. 覆蓋 7 大外觀圖層相容組合測試（含重點色、虎斑、賓士白、三花／玳瑁無重疊雙色塊、星空微光、純白防發灰）。
    - **驗收門檻：** 預合成耗時 `< 20 ms`（基準測試實測）、線稿層 0 像素受毛色染色汙染、純白 `#FAF6F0` 不發灰、異色瞳左右眼色獨立正確。
    - **PO 看得到的成果：** 任選基因參數即時輸出零接縫粉彩零件組，直接對接 Rive 槽位。

[↑ 回到頂部目錄](#top)

---

<a id="b2"></a>

### B2｜Rive 共用 2D 骨架動畫與渲染雙鐵律
- **設計依據：** [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md) §4；[PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) §4；[ADR-001](../decisions/ADR-001-animation-engine-rive.md)
- **核心目的：** 交付全品種共用之單一 `.riv` 骨骼動畫檔，落實 PoC 驗證鎖定的兩大渲染鐵律與多軌互動狀態機。
- **包含小單：**
  - **`SHINUAN-B2-01`（前置：`SHINUAN-B1-02`）— Rive 共用骨架（`.riv`）、6 支 P0-B 動作＋P1 `drag`、8 種尾巴軌與雙渲染鐵律驗證**
    - **核心交付：**
      1. 建立 §4.1 單一 2D 骨架樹（`root` → `pelvis` → `tail_1..3` / `leg_L/R` / `torso` → `arm_L/R` / `neck` → `head` → `ear_L/R` / `eye_clip_L/R` / 五官前向視差層 / `status_icon_anchor`），串接 Image Data Binding / `FileAssetDelegate` 零件槽位。
      2. 完成 Track 1 主動作（P0-B 6 支：`idle`、`walk`、`sit`、`sleep`、`eat`、`pet` ＋ P1 `drag`）、Track 2 獨立尾巴軌（8 種情緒狀態）、眼球偏移追蹤輸入（`±6px`～`±9px`）與摸頭彈性傾斜（Spring Physics）。
      3. 提供渲染層本地移動過渡節點（`run_chase`、`jump_prep`、`jump_air`、`land_squash`、`turn_25d_parallax`），嚴格區隔於 `Master PRD v2.1.31` §8.B.3 `AnimationId` 正式枚舉。
    - **驗收門檻：**
      - **鐵律 A 必過：** 眼皮 100% 採眼眶 Clipping Path ＋ `#3A281E` 上眼皮線稿，於重點色／虎斑／三花貓臉上絕無單色塊遮蓋額頭（「眉毛貼膠帶」破綻）。
      - **鐵律 B 必過：** 左右轉身採 2.5D 球面視差（`turnDir ∈ [-1, +1]`），`scaleX` 永不壓扁歸零翻面，且藍金異色瞳（左藍右金）轉身後左右眼色不對調。
      - `packages/game-core` 零修改、`AnimationId` 枚舉零新增。
    - **PO 看得到的成果：** 單一 `.riv` 檔可流暢播放 6+1 動作、獨立搖尾、追手指與 2.5D 立體轉身，且切換任何毛色均零破綻。

[↑ 回到頂部目錄](#top)

---

<a id="b3"></a>

### B3｜雙平台原生橋接與 Android 桌面跳台 PoC
- **設計依據：** [ADR-002](../decisions/ADR-002-mobile-native-bridge-architecture.md) §2～§4；[PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) §3～§5.1
- **核心目的：** 驗證 React Native、Android Kotlin 透明懸浮窗與 iOS SwiftUI Widget 三端唯讀消費同一份 `PetViewModel`，並跑通零無障礙權限合規之 Android 桌面 App 方塊跳台物理。
- **包含小單：**
  - **`SHINUAN-B3-01`（前置：`SHINUAN-B2-01` ＋ Phase A `PetViewModel` 契約）— React Native 宿主骨架 ＋ Android Kotlin 懸浮窗與 Virtual Perch Grid 跳台 PoC**
    - **核心交付：**
      1. 建立 React Native 宿主專案接入 `@rive-app/react-native` 與唯讀 `PetViewModel`（先接固定 Mock／Phase A Core Snapshot 驗證）。
      2. 建立 Android Kotlin `ForegroundService` ＋ `WindowManager` 透明懸浮窗（`RiveAnimationView` 繼承 `TextureView`、`PixelFormat.TRANSLUCENT`、透明區域 `FLAG_NOT_TOUCHABLE` 穿透、全時 `FLAG_NOT_FOCUSABLE` 不搶鍵盤焦點、螢幕熄滅自動暫停釋放防耗電）。
      3. 實作桌面 **Virtual Perch Grid（App 方塊跳台系統）**：內建 `4×5`／`4×6`／`5×6` 格線＋頂部 Widget＋底部 Dock、5 秒半透明拖拉校正、單向穿過拋物線跳躍、窄方塊防走空（寬 `< 1.35×` 身寬禁長距水平走步）、落地彈性回彈，以及高空拎起掉落（`> 25%` 螢幕高）喚醒短生命週期 Headless JS 派發 `TriggerLanding` 驗證。
    - **驗收門檻：**
      - `AndroidManifest.xml` **嚴格零 `BIND_ACCESSIBILITY_SERVICE`／無障礙權限宣告**。
      - 懸浮窗外圍透明區正常穿透點開底層 App；全時維持 `FLAG_NOT_FOCUSABLE`。
      - Android 懸浮窗消費之 `PetViewModel`（含 `behavior.iconIds`）與 RN 主畫面 100% 一致，UI／Kotlin 層零自算需求衰退或健康公式。
    - **PO 看得到的成果：** 實機／模擬器 Android 桌面上粉彩貓咪會在 App 方塊與 Dock 間拋物線跳躍停靠、可摸頭追指、可拎起掉落且不擋滑手機。
  - **`SHINUAN-B3-02`（前置：`SHINUAN-B2-01` ＋ Phase A `PetViewModel` 契約）— iOS SwiftUI `WidgetKit` ＋ `App Groups` 唯讀快照與三端一致性驗證**
    - **核心交付：**
      1. 啟用 `App Groups`（`group.com.shizhan.shinuan`），由主 App 寫出 `widget-snapshot.json`（含 `PetViewModel`、`lastSimulatedAt` 與預合成靜態貓咪 PNG 路徑）並呼叫 `WidgetCenter.shared.reloadAllTimelines()`。
      2. 實作 SwiftUI `WidgetKit` Timeline Provider 唯讀展示貓咪外觀、四大血條與狀態圖示（🐟／💧／❤️／💢／💤／🏥 與 Care Pause 標誌）。
      3. 針對同一份標準 `PetViewModel` 測試夾具執行三端（RN / Android Overlay / iOS Widget）顯示一致性檢核。
    - **驗收門檻：** Swift Extension 零重寫任何遊戲數值公式；三端顯示之 `animationId`、`iconIds` 與外觀參數 100% 一致。（註：`App Intents` 快捷按鈕寫入 `pending-widget-commands.json` 與 SQLite 原子冪等落盤依 `ADR-002` §4 / `ADR-003` 留待 **Phase C** 實作。）
    - **PO 看得到的成果：** iOS 桌面小工具與 Android 懸浮窗、主 App 呈現完全一致的粉彩貓咪與狀態圖示。

[↑ 回到頂部目錄](#top)

---

<a id="b4"></a>

### B4｜9:19.5 靜態 UI Prototype 與 Phase B 結案
- **設計依據：** [PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) §1～§2、§5.1；[Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) §7 Phase B、§8.D
- **核心目的：** 驗證手機 9:19.5 四大核心頁面的視覺版面、動線、非文字陪伴體驗與雙平台開通教學，並正式彙整 Phase B 驗收報告。
- **包含小單：**
  - **`SHINUAN-B4-01`（前置：`SHINUAN-B3-01`、`SHINUAN-B3-02`）— 四大核心頁面固定 Mock 靜態 UI Prototype 與 Phase B 結案報告**
    - **核心交付：**
      1. 基準視口 `390×844 pt`（相容安全區 Safe Area）實作四頁靜態 UI Prototype（全部採固定 Mock Data）：
         - `AdoptionScreen`（開局領養育種室：左右雙親卡片、精簡版孟德爾 `%` 預覽條與一胎 3～5 隻展示版面）。
         - `HomeScreen`（拾暖小窩：Rive 測試貓舞台、HUD 消費唯讀 `PetViewModel`、非文字圖示氣泡與底部捷徑骨架）。
         - `ShopScreen` / `ProductDetailModal`（商店清單、分類與品牌／測試標籤、商品營養成分抽屜與 3 秒探索倒數視覺骨架）。
         - `SettingsScreen`（顯示尺寸、Android 懸浮窗權限與 5 秒格線校正入口、iOS Widget 教學）。
      2. 撰寫 `docs/acceptance/PHASE-B-CLOSEOUT-REPORT.md`（逐項對照 `PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md` §5.1 驗收清單，附三端實機／模擬器截圖與效能數據）。
    - **驗收門檻：** 全數使用固定 Mock Data，**明確不執行**真實領養寫入、帳號名額鎖定、每日簽到（`ClaimDailyCheckIn`）、`BuyItem`、背包經濟結算或 SQLite 存檔；獨立 QA 實測通過 §5.1 全部項目。
    - **PO 看得到的成果：** 手機上完整走完「領養 → 小窩 → 商店成分 → 桌面跳台／小工具」全視覺動線，準備進入 Phase C 正式接通遊戲核心與 SQLite。

[↑ 回到頂部目錄](#top)

---

<a id="boundaries"></a>

## 二、Phase B 絕對紅線與 Phase C／D 邊界守則

1. **Game Core 單一真相與零汙染：** `packages/game-core` 與 `packages/contracts` 維持純 TypeScript、零平台依賴；Phase B 渲染層本地物理過渡片段（`run_chase`、`jump_prep`、`jump_air`、`land_squash`、`turn_25d_parallax`）**嚴禁寫入或擴充 `AnimationId` 正式枚舉**。
2. **嚴禁超前實作 Phase C／D 功能：**
   - **禁止於 Phase B 實作（屬 Phase C）：** 正式接通 `generateLitter()` 領養寫入與 R1 每日 3 胎鎖定、SQLite 存檔與遷移（`ADR-003`）、iOS Widget `App Intents` 指令佇列原子冪等落盤、全 6 品種完整外觀擴充。
   - **禁止於 Phase B 實作（屬 Phase D）：** 正式接通 `EconomyEngine`（`BuyItem`、`InspectProduct` 3 秒真實入帳、`ClaimDailyCheckIn`、背包消耗、Remote Config 商品熱更新）。
3. **Android 零無障礙合規紅線：** 嚴禁申請 `AccessibilityService` 讀取第三方桌面 App 座標；所有桌面跳台一律透過 Virtual Perch Grid ＋ 使用者 5 秒校正實現。
4. **渲染雙鐵律紅線：** 嚴禁眼皮單色塊蓋額頭、嚴禁 `scaleX: +1 → 0 → -1` 紙片翻面（詳見 [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md) §4.3）。
5. **拾暖既有專案紅線沿用：** 嚴禁存取 `docs/PO-step-by-step/`、嚴禁擅改 Master PRD 數值公式、嚴禁未授權安裝依賴或直推 `master`。

[↑ 回到頂部目錄](#top)

---

<a id="closeout"></a>

## 三、Phase B 封版結案門檻

須同時滿足以下全部條件，並經獨立 QA 實測 `PASS`、獨立 Reviewer `APPROVED` 與 PO 核准，始得宣告 Phase B 封版並啟動 Phase C：

- [ ] `SHINUAN-B1-01` ～ `SHINUAN-B4-01` 全部 6 張小單對應之 PR 均已合併進 `master`。
- [ ] 單隻測試貓 12 零件透明資產 ＋ 5 組遮罩 ＋ `< 20 ms` 3 層預合成器 ＋ Rive 6+1 動作＋8 尾巴軌，**100% 通過渲染雙鐵律 A／B**。
- [ ] React Native、Android Kotlin 透明懸浮窗（含零無障礙權限 Virtual Perch Grid 跳台）與 iOS SwiftUI Widget 三端唯讀消費同一份 `PetViewModel` 驗證一致。
- [ ] 四大核心頁面固定 Mock 靜態 UI Prototype 通過動線與邊界檢查（零偷渡真實領養／經濟／SQLite）。
- [ ] `node scripts/check-shinuan-integrity.mjs` 與既有 Phase A 全自動化測試套件（`TC-01`～`TC-10`、`TC-MH-01`～`TC-MH-12`）維持 100% 全綠無回歸。
- [ ] 交付並核准 `docs/acceptance/PHASE-B-CLOSEOUT-REPORT.md`。

[↑ 回到頂部目錄](#top) ｜ [← 回到規格入口](README.md#phase-b)
