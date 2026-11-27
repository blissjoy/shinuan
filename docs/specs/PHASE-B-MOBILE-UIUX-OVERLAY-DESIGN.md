<a id="top"></a>

# Phase B 設計規格書｜手機 9:19.5 全流程 UI/UX 與 Android 桌面 App 方塊跳台系統

> **導覽與追溯：** [← 回到規格入口](README.md#phase-b) ｜ [Phase B 2D 美術與渲染規範](PHASE-B-2D-ART-PIPELINE-SPEC.md) ｜ [Master PRD v2.1.30](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ADR-001 動畫引擎 Rive](../decisions/ADR-001-animation-engine-rive.md) ｜ [ADR-002 雙平台原生橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md)

- **文件性質：** Phase B 手機端介面與桌面懸浮窗物理互動技術設計書（2026-11-27 經 Warfront 2 互動原型實測與 PO 拍板定案，供後續交付 Claude 開發與獨立 QA 驗收）
- **對應規格基準：** `Master PRD v2.1.30`（§4.1、§4.3、§5.2 `PetViewModel`、§8.B.3、§8.C.2～§8.C.3、§8.D、§10.1～§10.2）、`ADR-001`、`ADR-002`
- **參考實測原型（Dropbox 離線驗證）：**
  - 手機全流程可點擊原型：`D:\temp\.gemini\scratch\shinuan-art-poc\mobile-app-prototype.html`
  - 桌面 App 方塊跳台物理原型：`D:\temp\.gemini\scratch\shinuan-art-poc\mobile-cat-motion-demo.html`
  - Phase B 測試貓 21 件素材庫：`D:\Dropbox\ai-bridge\shinuan\art-assets\phase-b-exotic-flat-face\`

---

## 一、階段邊界與核心設計原則（避免超前實作）

1. **Game Core 單一真相原則：** 手機 UI 與 Android Kotlin 懸浮窗僅為**呈現與觸控收集層**，唯讀消費 `PetViewModel`，所有數值衰退、回血、經濟與行為仲裁 100% 委由 `packages/game-core`。
2. **Phase B vs Phase D 功能邊界（對齊 PRD §8.D #3）：**
   - **Phase B：** 完成 `AdoptionScreen`、`HomeScreen`、`SettingsScreen`、Android 懸浮窗（含桌面 App 方塊跳台）與 iOS Widget 預覽骨架；`ShopScreen` & `ProductDetailModal` 先以固定 Mock Data 建立靜態 UI Prototype（驗證排版與 3 秒閱讀動線，不含正式導購與遠端目錄）。
   - **Phase D：** 正式接通 `EconomyEngine` 積分結算、背包扣減、商品探索獎勵入帳與遠端商品目錄。
3. **非文字陪伴（PRD §4.3）：** 貓咪不彈出長篇文字對話框，需求與情緒一律透過動作、表情與頭頂圖示氣泡（🐟／💧／❤️／💢／💤／🏥）呈現。

---

## 二、9:19.5 四大核心頁面規格與互動契約

基準設計視口採 **`390 × 844 pt`（9:19.5）**，相容各尺寸劉海屏與安全區域（Safe Area）。

### 2.1 開局領養育種室（`AdoptionScreen`，對齊 PRD §8.D #1、`S1-04`）

1. **雙親挑選與即時預覽：**
   - 上半部左右並排「♂ 爸爸貓」與「♀ 媽媽貓」選擇卡，切換父母時卡片內 2D 粉彩貓即時套用 3 層著色換裝。
   - **PO 拍板精簡版孟德爾機率預覽（絕不堆砌艱澀遺傳學文字牆）：**
     - 父母不同色系：`像爸爸色 XX% ｜ 像媽媽色 YY% ｜ 驚喜新色 ZZ%`（配三段比例色條）。
     - 父母同色系自動合併：`像爸媽色 XX% ｜ 驚喜新色 ZZ%`。
2. **一胎 3～5 隻與 R1 每日 3 胎上限：**
   - 頂部顯示「今日免費 `X/3` 胎」徽章；點擊「誕生這一胎」呼叫 `generateLitter()` 產出 3～5 隻真實 2D 粉彩渲染小貓卡片。
   - 卡片僅呈現：外觀預覽、性別（`♂ 男寶`／`♀ 女寶`）、隱藏小怪癖提示（**嚴格僅示「有／無」，例如「✨ 有神秘小習慣」，絕不透露怪癖數量與名稱**）、以及 2% 公三花 XXY 罕見彩蛋祝賀標章。
   - 放棄重抽前必須彈出溫馨提示：「此胎小貓將由其他玩家領養」；3 胎用完後鎖定放棄按鈕，保留最後一胎供挑選。
3. **命名與領養鎖定：**
   - 挑選 1 隻小貓輸入名稱（1～12 字元），確認前提示其餘未領養兄弟姊妹將被其他玩家領養；確認後鎖定 `seed`、`appearance`、`fatherPetId`、`motherPetId`，引導進入雙平台權限教學（Android 懸浮窗授權／iOS Widget 教學）。

### 2.2 拾暖小窩主畫面（`HomeScreen`，對齊 PRD §8.D #2）

1. **頂部精簡 HUD：**
   - 顯示寵物名稱、毛色標籤與積分徽章（開局預設 `200` 積分）。
   - 四大狀態條橫向 2×2 排列：`🐟 飽食 (Hunger)`、`💧 水分 (Hydration)`、`❤️ 心情 (Mood)`、`💚 健康 (Health)`。
   - 開啟 Care Pause 時於 HUD 下方顯示安心提示條「🛡️ 照護暫停保護中」。
2. **互動主舞台（內嵌 Rive 2D 粉彩貓 ＋ 房間牆面跳台）：**
   - 支援點擊地板走動／遠處小跑、點擊牆面貓跳台起跳、按住貓頭左右嚕毛摸頭（彈性傾頭＋壓耳瞇笑＋飄 ❤️）、拎起懸空踢腳與重力落地、以及召喚逗貓棒追跳。
   - 當 `Hunger < 50` 或 `Hydration < 50`（且非 Care Pause）時，貓咪頭頂自動浮出 🐟 或 💧 輕微上下浮動氣泡。
3. **底部導覽與快捷操作：**
   - 固定 4 顆主分頁或快捷入口：**🎒 背包餵食（開底部抽屜直接餵免費無限糧／水或已購商品）**、**🛒 商店**、**📖 圖鑑／領養**、**⚙️ 設定**；另於小窩內附快捷鈕切換「🪶 逗貓棒」、「🎁 每日簽到（+40）」與「📱 懸浮模式」。

### 2.3 商店與營養成分詳情抽屜（`ShopScreen` & `ProductDetailModal`，對齊 PRD §8.C.2、§8.C.3、§8.D #3）

1. **商品列表：** 支援分類篩選（全部／主食罐／乾糧／零食），每張商品卡清晰標示 `一般商品` 或 `品牌合作`、`模擬測試資料`（當 `dataType === "mock"` 時強制顯示）與積分價格。
2. **詳情抽屜（兩區塊嚴格分離）：**
   - **真實商品資訊區塊：** 品牌名稱、粗蛋白／粗脂肪／水分分析、主要原料、資料來源、更新日期與免責聲明（「實際成分以原廠包裝標示為準」）。
   - **遊戲效果與購買區塊：** 飽食／水分／心情回復值（鎖定於 7 級價位白名單內）與「購買放入背包」按鈕。
3. **無廣告式 3 秒探索任務（`InspectProduct`）：**
   - 開啟詳情抽屜後於本機靜默計時；停留達 **`>= 3 秒`** 且該商品當日未領過，安靜將徽章更新為「✓ 探索完成 ＋10 積分（今日 `X/30`）」（每日上限 30 積分，無全螢幕廣告彈窗）。

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
   - 玩家拎起貓咪放手後，貓咪依重力自然降落於正下方第一個經過的跳台或 Dock；若連續下墜距離超過螢幕高度 `25%`，依 `ADR-002` §3.2 喚醒短生命週期 Headless JS 派發 `TriggerLanding` 指令給 `GameEngine`。
   - **不干擾點擊原則：** 貓咪以外之透明區域一律 `FLAG_NOT_TOUCHABLE` 穿透給底層手機桌面，玩家照常點開 LINE、相機等任何 App；僅貓咪本體邊界框接收摸頭／拖曳手勢，且永遠維持 `FLAG_NOT_FOCUSABLE` 不搶鍵盤焦點。

---

## 四、渲染層物理過渡片段 vs `Master PRD` §8.B.3 `AnimationId` 邊界切分

> 為確保 Phase B 前端與 Kotlin 層實作絕不改動或汙染 `packages/game-core` 既有契約，以下明確切分「核心行為指令」與「本地渲染過渡片段」：

| 層級 | 識別項目 | 負責層 | 說明 |
| --- | --- | --- | --- |
| **Game Core 正式契約 (`PetViewModel.behavior.animationId`)** | `idle`、`walk`、`sit`、`sleep`、`eat`、`pet`、`drag`（對齊 Master PRD §8.B.3） | `packages/game-core`（唯讀下發） | 由 `BehaviorEngine` 依 6 級優先順序仲裁產生，跨平台唯一真相。 |
| **渲染層本地移動過渡片段（非 `AnimationId` 枚舉）** | `run_chase`（逗貓棒／遠距快跑）、`jump_prep`（起跳蹲低蓄力）、`jump_air`（拋物線滯空）、`land_squash`（落地回彈）、`turn_25d_parallax`（2.5D 球面視差轉身） | React Native / Android Kotlin 渲染層本地驅動 | 僅依本地座標位移與物理速度觸發 Rive State Machine 過渡節點，**不回寫也不新增 `GameCore` 枚舉**。 |

---

## 五、Phase B 實作與獨立 QA 驗收清單

- [ ] 領養流程完整呈現簡潔版孟德爾機率（`像爸爸 % / 像媽媽 % / 驚喜新色 %`）、一胎 3～5 隻、R1 每日 3 胎上限、隱藏小怪癖只示「有／無」與 2% 公三花彩蛋。
- [ ] 小窩與桌面懸浮貓 100% 遵守 [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md) §4.3 兩大渲染鐵律（眼皮 Clipping Path 零色塊 ＋ 2.5D 視差轉身零紙片翻面＋異色瞳左右眼不對調）。
- [ ] Android 懸浮窗嚴格不申請 `AccessibilityService`，可於 `4×5`／`4×6`／`5×6` 虛擬跳台格線與頂部 Widget／底部 Dock 間精準拋物線跳躍、停靠與拎起掉落，且全時維持 `FLAG_NOT_FOCUSABLE`。
- [ ] iOS 透過 `App Groups` ＋ `WidgetKit` ＋ `App Intents` 呈現靜態貓咪快照與速餵／摸頭指令佇列，開 App 依時間戳補算。
- [ ] 商店詳情頁清楚區分「真實商品資訊」與「遊戲效果」，並具備停留 `>= 3 秒` 探索計時與 `mock` 標示。
