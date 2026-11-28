<a id="top"></a>

# Phase B 設計規格書｜手機 9:19.5 全流程 UI/UX 與 Android 桌面 App 方塊跳台系統

> **導覽與追溯：** [← 回到規格入口](README.md#phase-b) ｜ [Phase B 2D 美術與渲染規範](PHASE-B-2D-ART-PIPELINE-SPEC.md) ｜ [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ADR-001 動畫引擎 Rive](../decisions/ADR-001-animation-engine-rive.md) ｜ [ADR-002 雙平台原生橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md)

- **文件性質：** 手機 9:19.5 全流程 UI/UX（跨 Phase B／C／D 分階段落地）與 Android 桌面懸浮窗物理互動設計書（2026-11-27 經 Warfront 2 互動原型實測、PO 拍板與外部獨立審計校準，供後續交付 Claude 分階段施工與獨立 QA 驗收）
- **對應規格基準：** `Master PRD v2.1.31`（§4.1、§4.3、§5.2 `PetViewModel`、§7、§8.B.1、§8.B.3、§8.C.2～§8.C.3、§8.D、§10.1～§10.2）、`ADR-001`、`ADR-002`
- **參考實測原型（已封存於 Dropbox 離線驗證）：**
  - 手機全流程可點擊原型：`D:\Dropbox\ai-bridge\shinuan\art-assets\phase-b-exotic-flat-face\prototypes\mobile-app-prototype.html`
  - 桌面 App 方塊跳台物理原型：`D:\Dropbox\ai-bridge\shinuan\art-assets\phase-b-exotic-flat-face\prototypes\mobile-cat-motion-demo.html`
  - Phase B 測試貓 21 件素材庫：`D:\Dropbox\ai-bridge\shinuan\art-assets\phase-b-exotic-flat-face\`

---

## 一、階段邊界矩陣與核心設計原則（嚴禁 Phase B 超前實作）

1. **Game Core 單一真相原則：** 手機 UI 與 Android Kotlin 懸浮窗僅為**呈現與觸控收集層**，唯讀消費 `PetViewModel`，所有數值衰退、回血、經濟與行為仲裁 100% 委由 `packages/game-core`。
2. **Phase B / Phase C / Phase D 嚴格切分矩陣（對齊 `Master PRD v2.1.31` §7、§8.D #3）：**

| 功能項目 | **Phase B（渲染與跨平台 PoC）** | **Phase C（單貓陪伴 MVP 上線）** | **Phase D（商店與原生廣告驗證）** |
| --- | --- | --- | --- |
| **2D 粉彩貓渲染與動畫** | 單隻測試貓 ＋ 6 支 P0-B 動畫 ＋ Rive 3 層著色 ＋ Android 懸浮窗／iOS Widget 消費同一 `PetViewModel` | 擴充全 6 品種外觀與 Phase C 動畫（`cat_loaf`、`play`、P1 互動） | 沿用 |
| **Android 桌面 App 跳台** | 完成 Virtual Perch Grid 基礎校正與本地拋物線物理 PoC | 正式上線並持久化使用者校正格線 | 沿用 |
| **領養育種頁（`AdoptionScreen`）** | **僅靜態 UI Prototype 展示排版**（使用固定 Mock 預覽，**不接正式領養鎖定、不寫入帳號名額**） | **正式接線 `generateLitter()`、`calculatePairingPreviewProbability()`、R1 每日 3 胎上限與領養命名鎖定** | 沿用 |
| **小窩與設定頁（`HomeScreen` / `SettingsScreen`）** | 測試貓渲染舞台、HUD 消費唯讀 `PetViewModel`（固定 Mock Data，不執行真實經濟指令）、顯示尺寸與雙平台教學 | 接通完整 SQLite 存檔、時間推進、免費糧水／摸頭／逗貓棒基本照護、健康救援、Care Pause 與 iOS Widget 指令佇列 | 啟用每日簽到（`ClaimDailyCheckIn +40`）、真實積分顯示與背包已購商品消耗 |
| **商店與詳情抽屜（`ShopScreen` / `ProductDetailModal`）** | **僅固定 Mock Data 靜態 UI Prototype**（驗證版面、標籤與 3 秒倒數視覺骨架；**嚴禁實作 `BuyItem`、背包交易與真實積分入帳**） | 維持靜態骨架或隱藏入口，不提前開啟商業交易 | **正式接通 `EconomyEngine`（`OpenShop`、`InspectProduct` 3 秒入帳、`BuyItem`、背包消耗與 Remote Config 目錄）** |

3. **非文字陪伴（PRD §4.3）：** 貓咪不彈出長篇文字對話框，需求與情緒一律透過動作、表情與頭頂圖示氣泡（🐟／💧／❤️／💢／💤／🏥）呈現。

---

## 二、9:19.5 四大核心頁面規格與互動契約

基準設計視口採 **`390 × 844 pt`（9:19.5）**，相容各尺寸劉海屏與安全區域（Safe Area）。

### 2.1 開局領養育種室（`AdoptionScreen`｜Phase B 靜態 UI 展示 ／ Phase C 正式接線，對齊 PRD §8.D #1、`S1-04`）

1. **雙親挑選與即時預覽：**
   - 上半部左右並排「♂ 爸爸貓」與「♀ 媽媽貓」選擇卡，切換父母時卡片內 2D 粉彩貓即時套用 3 層著色換裝。
   - **PO 拍板精簡版孟德爾機率預覽（絕不堆砌艱澀遺傳學文字牆；正式數值由 `S1-04` 純函式 `calculatePairingPreviewProbability()` 計算提供）：**
     - 父母不同色系：`像爸爸色 XX% ｜ 像媽媽色 YY% ｜ 驚喜新色 ZZ%`（配三段比例色條）。
     - 父母同色系自動合併：`像爸媽色 XX% ｜ 驚喜新色 ZZ%`。
2. **一胎 3～5 隻與 R1 每日 3 胎上限（Phase C 接線 `generateLitter()` 與 `DailyLimits`；Phase B 僅以靜態範例呈現卡片排版）：**
   - 頂部顯示「今日免費 `X/3` 胎」徽章；Phase C 點擊「誕生這一胎」呼叫 `generateLitter()` 產出 3～5 隻真實 2D 粉彩渲染小貓卡片。
   - 卡片僅呈現：外觀預覽、性別（`♂ 男寶`／`♀ 女寶`）、隱藏小怪癖提示（**嚴格僅示「有／無」，例如「✨ 有神秘小習慣」，絕不透露怪癖數量與名稱**）、以及 2% 公三花 XXY 罕見彩蛋祝賀標章。
   - 放棄重抽前必須彈出溫馨提示：「此胎小貓將由其他玩家領養」；3 胎用完後鎖定放棄按鈕，保留最後一胎供挑選。
3. **命名與領養鎖定（Phase C 正式上線）：**
   - 挑選 1 隻小貓輸入名稱（1～12 字元），確認前提示其餘未領養兄弟姊妹將被其他玩家領養；確認後鎖定 `seed`、`appearance`、`fatherPetId`、`motherPetId` 並檢查 `AdoptionSlotPolicy`，引導進入雙平台權限教學（Android 懸浮窗授權／iOS Widget 教學）。

### 2.2 拾暖小窩主畫面（`HomeScreen`｜Phase B 靜態展示與本地互動 PoC ／ Phase C 照護上線 ／ Phase D 經濟與簽到接線，對齊 PRD §8.D #2）

1. **頂部精簡 HUD：**
   - 顯示寵物名稱、毛色標籤與積分徽章（**Phase B** 僅呈現固定 Mock Data，不執行真實指令與積分變動；**Phase C** 接通真實 `PetViewModel` 狀態條與 Care Pause；**Phase D** 接通真實積分餘額，開局預設 `200` 積分）。
   - 四大狀態條橫向 2×2 排列：`🐟 飽食 (Hunger)`、`💧 水分 (Hydration)`、`❤️ 心情 (Mood)`、`💚 健康 (Health)`。
   - 開啟 Care Pause 時於 HUD 下方顯示安心提示條「🛡️ 照護暫停保護中」（**Phase C** 正式接通 `ToggleCarePause`）。
2. **互動主舞台（內嵌 Rive 2D 粉彩貓 ＋ 房間牆面跳台）：**
   - **Phase B（渲染與物理 PoC）：** 驗證單隻測試貓 6 支 P0-B 動作、點擊地板走動／遠處小跑、點擊牆面跳台起跳、按頭摸頭與拎起重力落地之本地動畫物理，**不寫入真實遊戲存檔或積分**。
   - **Phase C（正式接通照護指令）：** 串接 `PetCat`、`PlayWithPet`（含逗貓棒 `play` 動畫）、`PokePet`、`TriggerLanding` 等正式 `GameCommand`。
   - 頭頂狀態氣泡一律**嚴格唯讀消費 `PetViewModel.behavior.iconIds`**（嚴禁 UI 層自行計算需求數值門檻或繞過冷卻仲裁，對齊 `Master PRD v2.1.31` §5.2 與 §8.B.1：例如 Priority 100 緊急求救 `health < 30 || hunger < 15 || hydration < 15` 下發 🏥／🐟／💧；Priority 80 睡眠下發 💤；Priority 60 一般需求 `hunger < 40 || hydration < 40 || mood < 45` 下發 🐟／💧／🎾，持續 `5,000 ms`、共用冷卻 `60,000 ms`）。
3. **底部導覽與快捷操作（嚴格分階段啟用，與 §1、§5 一致）：**
   - **Phase B（固定 Mock Data 靜態 UI 展示，嚴禁觸發真實 `GameCommand` 經濟結算）：** 固定 4 顆分頁入口（`🎒 背包`、`🛒 商店`、`📖 圖鑑／領養`、`⚙️ 設定`）與小窩快捷鈕（`🪶 逗貓棒`、`🎁 每日簽到`、`📱 懸浮模式`）僅供畫面切換、本地動畫展示與懸浮窗 PoC，背包與每日簽到按鈕設為 Mock 展示態，不執行真實餵食數值結算、扣庫存或發放積分。
   - **Phase C（單貓陪伴 MVP — 免費糧水與基本照護）：** 正式啟用 `🎒 背包餵食` 內之**免費無限基礎乾糧（`free_basic_kibble`，`FeedPet`）與免費潔淨飲水（`free_fresh_water`，`DrinkWater`）**、`🪶 逗貓棒`（`PlayWithPet`）、`📖 圖鑑／領養`（接通真實領養與繁育）、`⚙️ 設定`（`ToggleCarePause` 與顯示尺寸）及 `📱 懸浮模式`。
   - **Phase D（商店與經濟結算上線）：** 正式啟用 **`🎁 每日簽到（ClaimDailyCheckIn +40 積分）`**、`🎒 背包餵食` 內之**已購付費商品消耗**、`🛒 商店`（`OpenShop` / `InspectProduct` / `BuyItem`）與全部積分入帳／扣款結算。

### 2.3 商店與營養成分詳情抽屜（`ShopScreen` & `ProductDetailModal`｜Phase B 靜態 Mock Prototype ／ Phase D 正式接線，對齊 PRD §8.C.2、§8.C.3、§8.D #3）

1. **商品列表：** 支援分類篩選（全部／主食罐／乾糧／零食），每張商品卡清晰標示 `一般商品` 或 `品牌合作`、`模擬測試資料`（當 `dataType === "mock"` 時強制顯示）與積分價格。
2. **詳情抽屜（兩區塊嚴格分離）：**
   - **真實商品資訊區塊：** 品牌名稱、粗蛋白／粗脂肪／水分分析、主要原料、資料來源、更新日期與免責聲明（「實際成分以原廠包裝標示為準」）。
   - **遊戲效果與購買區塊：** 飽食／水分／心情回復值（鎖定於 7 級價位白名單內）與「購買放入背包」按鈕（**Phase B 靜態 Prototype 設為展示態／不可結算，Phase D 始接通 `BuyItem` 扣分與背包入帳**）。
3. **無廣告式 3 秒探索任務（`InspectProduct` — Phase D 正式結算）：**
   - **Phase B：** 僅呈現視覺提示徽章與靜態版面，不執行真實積分入帳。
   - **Phase D：** 開啟詳情抽屜後計時，停留達 **`>= 3 秒`** 時派發 `InspectProduct` 指令由 `EconomyEngine` 驗證與入帳（每款不重複商品 `+10` 積分、每日上限 `30` 積分，無全螢幕廣告彈窗）。

### 2.4 雙平台與照護設定頁（`SettingsScreen`，對齊 PRD §4.1、§8.D #2、`ADR-002`）

- **照護暫停保護（Care Pause）：** 單鍵開關，安心暫停需求衰退與生病計算。
- **顯示尺寸調整：** 小（約螢幕寬 `22%`）／標準（`28%`）／大（`34%`），供玩家自訂桌寵視覺存在感。
- **Android 專屬區：** 懸浮窗總開關、「暫時隱藏至通知列」、以及 **「📐 桌面 App 跳台格線校正」** 入口（詳見 §3）。
- **iOS 專屬區：** 內建 `WidgetKit` 2×2 / 4×2 桌面小工具預覽卡片與「加入桌面步驟教學」，示範透過 `App Intents` 在桌面遠端速餵與摸頭。

---

## 三、Android 桌面「App 方塊跳台系統（Virtual Perch Grid）」技術設計

> **設計核心（PO 2026-11-27 拍板）：** 讓 Android 桌面懸浮窗的貓咪不再只困在螢幕最下方漫步，而是可以把玩家手機桌面上的 **App 圖示方塊、頂部時鐘／天氣 Widget 卡片與底部 Dock 全部當成貓跳台**，自由在方塊間起跳、跨跳、蹲坐與趴睡！

### 3.1 Google Play 隱私與權限合規紅線（零無障礙權限）

- **嚴禁使用 `AccessibilityService`（無障礙服務）：** Google Play 政策嚴格限制非身心障礙輔具 App 申請無障礙權限；嚴禁透過無障礙樹偷讀第三方桌面 Launcher 的視窗或圖示座標。
- **100% 合規替代解法 —「虛擬跳台網格（Virtual Perch Grid）」：**
  1. 現代 Android 手機桌面幾乎皆採規律網格排版（`4×5`、`4×6`、`5×6`）搭配頂部 Widget 區與底部 Dock。
  2. App 內建上述 3 組預設跳台網格，並提供 **「5 秒半透明格線校正模式」**：
     - 使用者於設定頁點開校正後，系統在透明懸浮層顯示虛線跳台橫線（頂部時鐘線、各列 App 上緣線、底部 Dock 線），並可選取**自身手機桌面截圖作為底圖**，直接用手指拖拉微調列高、欄數與開啟／關閉空白位置。
     - 校準後的虛擬跳台清單僅儲存為本機座標比率 JSON（`0.0 ~ 1.0` 正規化螢幕比例，自動適配不同解析度與 DPI），完全不蒐集任何 App 名稱或使用者隱私。

### 3.2 跳台資料契約（Kotlin 本地層模型）

```ts
export interface DesktopPerchPlatform {
  /** 跳台唯一編號，如 "widget_top" | "grid_r1_c2" | "dock" */
  id: string;
  /** 跳台類型：寬 Widget、單顆 App 方塊或底部 Dock */
  kind: 'widget' | 'app_tile' | 'dock';
  /** 螢幕正規化座標（0.0 ~ 1.0），避免綁死硬體解析度 */
  x1Norm: number;
  x2Norm: number;
  /** 貓咪腳掌著陸之上緣 Y 比率 */
  yNorm: number;
  /** 是否啟用（使用者校正時可關掉桌面空白格） */
  enabled: boolean;
}
```

### 3.3 Kotlin 本地跳躍物理與防呆規則（不喚醒 JS 引擎）

1. **精準拋物線落點演算法（Ballistic Arc）：**
   - 選定目標跳台 `targetPlatform` 與著陸點 `(targetX, targetY)` 後，先播放 `130ms` 蓄力蹲低（`jump_prep`，`scaleX: 1.18, scaleY: 0.80`）。
   - 依預設重力加速度 `g` 與起跳最高點 `apexY = min(startY, targetY) - peakClearance` 精確反推垂直初速 `vy = -sqrt(2 * g * riseH)` 與水平速度 `vx = (targetX - startX) / (tUp + tDown)`，確保貓咪無論向上跳、平跳或往下跳都能**精準踩在目標 App 方塊正中央**。
2. **單向穿過與降落判定（One-Way Platform Collision）：**
   - 僅於下墜期（`vy > 0`）檢查著陸碰撞，允許貓咪從下方穿越上排 App 方塊往上跳。
   - 若指定跳往較低目標 `targetPlatformId`，下墜途中忽略非目標之中間排方塊，直到降落於目標跳台或底部 Dock。
3. **窄方塊防走空規則（Narrow Perch Safety）：**
   - 凡寬度小於貓咪身寬 `1.35×` 之單顆 `app_tile`，貓咪停留期間**禁止長距離水平走步**，僅允許原地坐姿、搖尾、打瞌睡、轉頭追蹤手指，或透過「跨跳（`jump_prep` → `jump_air`）」移動至鄰近 App 方塊／Widget／Dock。
4. **重量感回饋與懸浮視窗互動：**
   - 落地瞬間施加彈性壓扁回彈（`scaleX: 1.20, scaleY: 0.80` → 彈回 `1.0`）並於腳下釋放柔和粉彩微塵粒子；於 App 內模擬桌面預覽時，同步對受踩方塊施加輕微彈性下陷微彈回饋。
   - 玩家拎起貓咪放手後，貓咪依重力自然降落於正下方第一個經過的跳台或 Dock；若連續下墜距離超過螢幕高度 `25%`：**Phase B** 僅驗證短生命週期 Headless JS 喚醒流程與記憶體內 Mock／Snapshot 事件回呼（**嚴禁於 Phase B 呼叫正式 `GameEngine.dispatch(TriggerLanding)`、改變真實數值或寫入存檔**）；**Phase C** 始依 `ADR-002` §3.2 正式派發 `TriggerLanding` 指令給 `GameEngine` 並更新存檔。
   - **不干擾點擊原則：** 貓咪以外之透明區域一律 `FLAG_NOT_TOUCHABLE` 穿透給底層手機桌面，玩家照常點開 LINE、相機等任何 App；僅貓咪本體邊界框接收摸頭／拖曳手勢，且永遠維持 `FLAG_NOT_FOCUSABLE` 不搶鍵盤焦點。

---

## 四、渲染層物理過渡片段 vs `Master PRD` §8.B.3 `AnimationId` 邊界切分

> 為確保 Phase B 前端與 Kotlin 層實作絕不改動或汙染 `packages/game-core` 既有契約，以下明確切分「核心行為指令」與「本地渲染過渡片段」：

| 層級 | 識別項目 | 負責層 | 說明 |
| --- | --- | --- | --- |
| **Game Core 正式契約 (`PetViewModel.behavior.animationId`)** | Phase B 實作子集：嚴格限縮於 6 支 P0-B（`idle`、`walk`、`sit`、`sleep`、`eat`、`pet`）；完整 15 支正式枚舉（另含 Phase C `cat_loaf`/`play` 與 P1 `drag`/`drop`/`landing` 等）詳見 `Master PRD v2.1.31` §8.B.3 | `packages/game-core`（唯讀下發） | 由 `BehaviorEngine` 依 6 級優先順序仲裁產生，跨平台唯一真相。 |
| **渲染層本地移動過渡片段（非 `AnimationId` 枚舉）** | `run_chase`（逗貓棒／遠距快跑）、`jump_prep`（起跳蹲低蓄力）、`jump_air`（拋物線滯空）、`land_squash`（一般低高度落地彈性回彈，區別於 P1 正式高空掉落抗議 `landing`）、`turn_25d_parallax`（2.5D 球面視差轉身） | React Native / Android Kotlin 渲染層本地驅動 | 僅依本地座標位移與物理速度觸發 Rive State Machine 過渡節點，**不回寫也不新增 `GameCore` 枚舉**。 |

---

## 五、分階段實作與獨立 QA 驗收清單

### 5.1 Phase B 驗收清單（渲染與跨平台 PoC 必過）
- [ ] 單隻測試貓於 Rive 完成 6 支 P0-B 動作與 3 層 PNG 預合成換色，100% 遵守 [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md) §4.3 兩大渲染鐵律（眼皮 Clipping Path 零色塊 ＋ 2.5D 視差轉身零紙片翻面＋異色瞳左右眼不對調）。
- [ ] React Native、Android Kotlin 懸浮窗與 iOS SwiftUI Widget 皆唯讀消費同一份 `PetViewModel`（含 `behavior.iconIds`），無 UI 層自行計算需求門檻。
- [ ] Android 懸浮窗嚴格不申請 `AccessibilityService`，可於 `4×5`／`4×6`／`5×6` 虛擬跳台格線與頂部 Widget／底部 Dock 間精準拋物線跳躍、停靠與拎起掉落，且全時維持 `FLAG_NOT_FOCUSABLE`。
- [ ] `HomeScreen` 快捷操作（背包、簽到）、`ShopScreen` / `ProductDetailModal` 與 `AdoptionScreen` 具備固定 Mock Data 靜態 UI Prototype，且明確**不執行**真實購買、簽到、積分結算與領養寫入。

### 5.2 Phase C 驗收清單（單貓陪伴 MVP 接線）
- [ ] `AdoptionScreen` 正式接通 `generateLitter()`、`calculatePairingPreviewProbability()`、R1 每日 3 胎上限、隱藏小怪癖只示「有／無」、2% 公三花彩蛋、領養命名鎖定與 `AdoptionSlotPolicy` 檢查。
- [ ] `HomeScreen` 正式接通免費基礎糧水（`FeedPet` / `DrinkWater`）、撫摸／逗貓棒（`PetCat` / `PlayWithPet`）、`PokePet`、`TriggerLanding` 與 `ToggleCarePause`，尚未啟用每日簽到與付費商品經濟結算。
- [ ] iOS 透過 `App Groups` ＋ `WidgetKit` ＋ `App Intents` 呈現靜態快照與具 `commandId` 單一交易原子冪等防重播之速餵／摸頭指令佇列，開 App 依時間戳補算。

### 5.3 Phase D 驗收清單（商店與原生廣告驗證）
- [ ] `HomeScreen` 每日簽到（`ClaimDailyCheckIn +40`）、背包已購商品消耗與 `ShopScreen` / `ProductDetailModal` 正式接通 `EconomyEngine`：`OpenShop`、`InspectProduct`（停留 `>= 3 秒` 給 `+10`、日上限 `30`）、`BuyItem` 與 Remote Config 目錄。
