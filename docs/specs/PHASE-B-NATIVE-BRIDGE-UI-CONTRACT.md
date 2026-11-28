<a id="top"></a>

# Phase B 技術設計書｜雙平台原生橋接與靜態 UI 契約（`SHINUAN-B3-01` ＋ `SHINUAN-B3-02` ＋ `SHINUAN-B4-01`）

> **導覽與追溯：** [← 回到規格入口](README.md#phase-b) ｜ [Phase B 規格拆解地圖](PHASE-B-SPEC-MAP.md) ｜ [預合成與 Rive 介面契約](PHASE-B-RIVE-COMPOSITOR-CONTRACT.md) ｜ [手機 UI/UX 與桌面跳台設計](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) ｜ [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ADR-002 雙平台原生橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md) ｜ [ADR-003 JSON→SQLite 存檔](../decisions/ADR-003-save-storage-json-to-sqlite.md)

- **文件性質：** Phase B 實作層細部技術契約設計書，專責鎖定 **`SHINUAN-B3-01`（RN 宿主＋Android 懸浮窗與 Virtual Perch Grid 跳台 PoC）**、**`SHINUAN-B3-02`（iOS `WidgetKit` ＋ `App Groups` 唯讀快照、`App Intents` Dry-Run Mock 佇列與三端一致性）** 與 **`SHINUAN-B4-01`（9:19.5 四大頁面固定 Mock 靜態 UI Prototype 與結案驗證）** 之資料 Schema、橋接介面、權限合規門檻與獨立 QA 測試斷言。
- **對應規格基準：** `Master PRD v2.1.31`（§4.1、§4.3、§5.2 `PetViewModel` 與 iOS `App Intents` 佇列驗證、§7 Phase B、§8.B.1、§8.B.3、§8.D、§10.1～§10.2）、`packages/contracts`（`view-model.ts`、`behavior.ts`、`genetics.ts`、`pet.ts`）、`ADR-002`。
- **核心設計紅線：** Phase B 三端（React Native、Android Kotlin 懸浮窗、iOS SwiftUI Widget）**一律唯讀消費同一份 `PetViewModel` 契約**；嚴禁於 Phase B 實作真實領養寫入、正式 `GameEngine.dispatch` 經濟／存檔結算、SQLite 遷移或 `AccessibilityService` 權限。

---

## 快速跳轉目錄

- [一、`SHINUAN-B3-01`｜Android Kotlin 懸浮窗、Virtual Perch Grid 與 Headless JS Mock 契約](#sec-1)
- [二、`SHINUAN-B3-02`｜iOS `App Groups` 快照、`App Intents` Dry-Run Mock 佇列與三端一致性契約](#sec-2)
- [三、`SHINUAN-B4-01`｜9:19.5 四大核心頁面固定 Mock Fixture 與禁寫契約](#sec-3)
- [四、Phase B 權限、隱私與降級防呆紅線](#sec-4)
- [五、獨立 QA 驗收測試清單（`TC-B3-01` ～ `TC-B4-02`）](#sec-5)

---

<a id="sec-1"></a>

## 一、`SHINUAN-B3-01`｜Android Kotlin 懸浮窗、Virtual Perch Grid 與 Headless JS Mock 契約

### 1.1 Android 視窗旗標與生命週期契約（對齊 `ADR-002` §3）

1. **強制 `WindowManager.LayoutParams` 與觸控穿透鎖定：**
   - `type = TYPE_APPLICATION_OVERLAY`（API 26+）
   - `format = PixelFormat.TRANSLUCENT`
   - `flags` **必須恆含 `FLAG_NOT_FOCUSABLE`**（絕不搶奪系統輸入法／鍵盤焦點）。
   - **唯一合法透明區穿透方案（相容 Android 12+ / API 31+）：** 採**「單一緊貼貓咪與氣泡容器之最小邊界框 `WindowManager` 視窗動態位移」**——視窗寬高嚴格貼齊貓咪互動命中區矩形，隨物理移動即時更新 `LayoutParams.x / y`，所有螢幕其餘區域皆位於視窗範圍之外天然穿透至底層 Launcher／App。**嚴禁**對該互動視窗設定視窗層級 `FLAG_NOT_TOUCHABLE`（會導致連貓咪本體亦失去觸控能力），亦**嚴禁**建立全螢幕覆蓋式透明視窗以免觸發 Android 12+（API 31+）不受信任觸控遮蔽封鎖（`Untrusted touch due to occlusion`）。
2. **渲染視圖與省電生命週期：**
   - 懸浮窗內嵌 `rive-android` `RiveAnimationView`（繼承 `TextureView`，避開 `SurfaceView` Z-order 黑洞），透過 [PHASE-B-RIVE-COMPOSITOR-CONTRACT.md](PHASE-B-RIVE-COMPOSITOR-CONTRACT.md) §3 鎖定之 `ShinuanCatRoot` / `CatMainSM` 驅動。
   - 監聽 `ACTION_SCREEN_OFF` 立即 `riveView.onPause()`、`ACTION_USER_PRESENT` 恢復；`PowerManager.isPowerSaveMode` 啟用時自動限頻至 `15~24 FPS`；停止服務時完整執行 `onPause()` → `onDestroy()` → `removeView()`，零記憶體洩漏。
   - 若使用者拒絕或撤銷 `SYSTEM_ALERT_WINDOW`，立即無痛降級回 React Native App 內模式，不得閃退。

### 1.2 Virtual Perch Grid 校正資料 Schema（`virtual-perch-grid.v1.json`）

本機儲存使用者校正之桌面虛擬跳台，**僅記錄螢幕正規化座標比率（`0.0 ~ 1.0`），嚴禁儲存任何第三方 App 名稱、套件名稱（package name）或圖示資訊**：

```ts
export type PerchGridPresetId = '4x5' | '4x6' | '5x6';

export interface DesktopPerchPlatform {
  /** 唯一編號，如 "widget_top" | "grid_r1_c2" | "dock" */
  readonly id: string;
  readonly kind: 'widget' | 'app_tile' | 'dock';
  /** 螢幕正規化水平區間：必須滿足 0 <= x1Norm < x2Norm <= 1 */
  readonly x1Norm: number;
  readonly x2Norm: number;
  /** 著陸之上緣 Y 比率：必須滿足 0 < yNorm <= 1 */
  readonly yNorm: number;
  readonly enabled: boolean;
}

export interface VirtualPerchGridConfig {
  readonly schemaVersion: 1;
  readonly presetId: PerchGridPresetId;
  /** 寵物顯示尺寸比例：'small'(0.22) | 'standard'(0.28) | 'large'(0.34) */
  readonly catScalePreset: 'small' | 'standard' | 'large';
  /** 至少須包含 1 個 enabled=true 之 'dock' 保底著陸平台 */
  readonly platforms: readonly DesktopPerchPlatform[];
  /** Unix timestamp (ms)，須為有限非負數 */
  readonly updatedAt: number;
}
```

- **Fail-Closed 完整 Schema 驗證與預設回退：** Kotlin 層載入 `VirtualPerchGridConfig` 須執行完整執行期 Schema 檢核；凡發生以下任一異常，一律自動回退至內建 `'4x6'` 預設格線（零閃退）：
  - JSON 語法損毀或根節點非物件；
  - `schemaVersion !== 1`、`presetId` 不屬於 `'4x5' | '4x6' | '5x6'`、`catScalePreset` 不屬於 `'small' | 'standard' | 'large'`；
  - `updatedAt` 非有限非負數（`!Number.isFinite(updatedAt) || updatedAt < 0`）；
  - `platforms` 非陣列，或任一平台項目缺欄位、型別錯誤（`id` 非非空字串或重複、`kind` 不屬於 `'widget' | 'app_tile' | 'dock'`、`enabled` 非 `boolean`）；
  - 任一座標值 `x1Norm`、`x2Norm`、`yNorm` 非有限數，或違反 `0 <= x1Norm < x2Norm <= 1`、`0 < yNorm <= 1`；
  - `platforms` 中不存在至少 1 個 `kind === 'dock' && enabled === true` 之保底著陸平台。
- **物理與防呆數值鎖定（對齊 `PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md` §3.3）：**
  - 起跳蓄力 `jump_prep`：`130 ms`、`scaleX = 1.18`、`scaleY = 0.80`；落地回彈 `land_squash`：`scaleX = 1.20`、`scaleY = 0.80` → 彈回 `1.0`。
  - 單向穿過碰撞：僅於下墜期（`vy > 0`）檢查碰撞；指定向下跨跳至 `targetPlatformId` 時忽略非目標之中間排平台。
  - 窄方塊防走空：凡 `(x2Norm - x1Norm) * screenWidthPx < catWidthPx * 1.35` 之單顆 `app_tile`，停留期間**嚴禁水平走步**，僅允許原地靜態動作、轉頭追指或拋物線跨跳。

### 1.3 Phase B 高空掉落 Headless JS Mock Event 契約（嚴格隔離 Phase C）

為驗證「高空掉落超過螢幕高度 `25%` 時 Kotlin 按需喚醒短生命週期 Headless JS」之跨層通訊鏈路，同時嚴格遵守 Phase B 禁寫紅線，定義 Phase B 專屬 Mock 事件封裝如下：

```ts
export interface PhaseBOverlayMockEventBase {
  readonly contractVersion: 'phase-b-mock-v1';
  readonly eventId: string; // UUID
  readonly timestamp: number; // Unix ms
  /** Phase B 強制固定為 true，接收端據此拒絕任何正式存檔或經濟寫入 */
  readonly dryRunMockOnly: true;
}

export type PhaseBOverlayMockEvent =
  | (PhaseBOverlayMockEventBase & {
      readonly eventType: 'MOCK_HIGH_DROP_LANDING';
      /** 本次連續下墜距離占螢幕總高度比率，觸發條件嚴格為有限數且 0.25 < dropHeightRatio <= 1.0 */
      readonly dropHeightRatio: number;
    })
  | (PhaseBOverlayMockEventBase & {
      readonly eventType: 'MOCK_PET_GESTURE';
      /** 非掉落事件固定為 0 */
      readonly dropHeightRatio: 0;
    });

export interface PhaseBOverlayMockAck {
  readonly eventId: string;
  readonly receivedAt: number;
  /** 僅回傳記憶體內 Mock PetViewModel 快照，不修改真實 GameState */
  readonly echoedAnimationId: 'idle' | 'walk' | 'sit' | 'sleep' | 'eat' | 'pet';
  readonly persistedToStorage: false;
}
```

- **硬性階段護欄與超時降級：**
  1. **嚴格掉落比率驗證：** Kotlin 僅於 `Number.isFinite(dropHeightRatio) && dropHeightRatio > 0.25 && dropHeightRatio <= 1.0` 時發送 `MOCK_HIGH_DROP_LANDING`（`<= 0.25` 不觸發；`> 1.0`、負數、`NaN`、`Infinity` 一律拒絕）。
  2. Phase B Headless JS Task 收到 `PhaseBOverlayMockEvent` 後，**僅允許寫入記憶體內診斷紀錄並回傳 `PhaseBOverlayMockAck`（`persistedToStorage: false`）**，執行完畢立即釋放 JS 任務。
  3. Kotlin 層喚醒 Headless JS 必須套用 **2,000 ms 硬性超時與異常降級保護（精確語義：`elapsedMs >= 2000` 即判定逾時）**：若達到 deadline、JS 任務未就緒或回傳格式無效，懸浮窗不得阻塞主執行緒或閃退，須記錄診斷日誌並安全維持本機平滑動作狀態。
  4. **嚴禁於 Phase B 呼叫正式 `GameEngine.dispatch(TriggerLanding)`、修改任何遊戲數值或寫入檔案／SQLite**；正式指令接線與持久化留待 **Phase C**。

[↑ 回到頂部](#top)

---

<a id="sec-2"></a>

## 二、`SHINUAN-B3-02`｜iOS `App Groups` 快照、`App Intents` Dry-Run Mock 佇列與三端一致性契約

### 2.1 共享容器與快照檔案 Schema（`widget-snapshot.json`，Schema v1）

- **唯一共享容器識別碼（對齊 `ADR-002` §4）：** `group.com.shizhan.shinuan`
- **相對檔案路徑（嚴格鎖定於 `shinuan/` 子目錄內）：**
  - 快照 JSON：`<AppGroupRoot>/shinuan/widget-snapshot.json`
  - 不可變版本化預合成靜態貓咪圖：`<AppGroupRoot>/shinuan/cat-snapshot-<compositorCacheKey>.png`（`compositorCacheKey` 僅允許匹配 `^[A-Za-z0-9_-]{1,64}$`，由 [PHASE-B-RIVE-COMPOSITOR-CONTRACT.md](PHASE-B-RIVE-COMPOSITOR-CONTRACT.md) §2.3 預合成器輸出，免於 Swift Extension 重跑著色）

```ts
import type { PetViewModel } from '@shinuan/contracts';

export interface IosWidgetSnapshotV1 {
  readonly schemaVersion: 1;
  /** 完整唯讀 PetViewModel（三端唯一真相，嚴禁含 interruptible 或 cooldownMs） */
  readonly viewModel: PetViewModel;
  /** 與 GameState 同步之最後模擬時間戳（Unix ms），供 Widget 顯示「更新於 X 分鐘前」 */
  readonly lastSimulatedAt: number;
  /** App Group 容器內相對路徑，必須嚴格符合 "shinuan/cat-snapshot-<compositorCacheKey>.png" */
  readonly snapshotImageRelativePath: string;
  /** 預合成器快取鍵（^[A-Za-z0-9_-]{1,64}$），確保換色後 Widget 同步刷新 */
  readonly compositorCacheKey: string;
  /** 寫出時間戳（Unix ms） */
  readonly writtenAt: number;
}
```

- **原子發布順序、路徑安全與 Fail-Closed 規則：**
  1. **圖片先行 → JSON 原子發布順序：** 主 App 必須**先**將不可變版本圖片寫入 `.tmp` 再原子 rename 為 `<AppGroupRoot>/shinuan/cat-snapshot-<compositorCacheKey>.png`，確認圖片完整落盤後，**再**先寫 `.tmp` 並以原子 `replaceItemAt`／rename 覆蓋引用該版本路徑之 `widget-snapshot.json`（並於發布成功後清理已不被引用之舊版本 PNG），最後呼叫 `WidgetCenter.shared.reloadAllTimelines()`，徹底避免 Widget 讀到新 JSON 卻讀到舊圖或尚未寫完的圖片。
  2. **嚴格 Schema 與路徑穿越防呆：** SwiftUI `WidgetKit` Timeline Provider 載入 `widget-snapshot.json` 時，必須驗證 `schemaVersion === 1`、所有必填欄位型別正確、`compositorCacheKey` 符合 `^[A-Za-z0-9_-]{1,64}$`，且 `snapshotImageRelativePath` 經規範化（`standardizedFileURL`）後**嚴格落在 `<AppGroupRoot>/shinuan/` 子目錄內**（明確拒絕絕對路徑、`..` 路徑穿越、符號連結逃逸或與 `compositorCacheKey` 預期檔名不符之路徑）。
  3. **唯讀零重算原則：** SwiftUI Widget Extension **嚴禁重寫任何需求衰退、健康救援或行為仲裁公式**；僅唯讀 `viewModel.needs`、`viewModel.behavior`、`viewModel.display` 與已驗證之預合成 PNG 呈現 UI。
  4. **分級 Fallback：**
     - 當 `widget-snapshot.json` 缺失、JSON 損毀、Schema 驗證失敗或圖片路徑非法時，Widget 安全顯示「開啟拾暖伴伴喚醒你的小貓」預設預覽卡，不得閃退。
     - 當 `widget-snapshot.json` 通過驗證但目標 PNG 遺失、解碼損毀或與 `compositorCacheKey` 不符時，Widget 仍安全顯示文字／數值並以內建安全貓咪剪影佔位圖替代，不得破圖或閃退。

### 2.2 Phase B `App Intents` Dry-Run Mock 快捷操作佇列契約（對齊 `Master PRD v2.1.31` §5.2，嚴格隔離 Phase C）

為落實 `Master PRD v2.1.31` §5.2 規定「Phase B 驗證桌面 Widget 狀態展示、`App Intents` 快捷操作佇列與 `App Group` 資料共享」，同時維持 Phase B 零正式寫入紅線，本階段與 §1.3 Android Headless JS Mock 對稱，採用 **Dry-Run Mock 佇列通道驗證**（獨立檔案命名，與 Phase C 正式 `pending-widget-commands.json` 零碰撞）：

- **Phase B 專屬 Mock 佇列路徑：** `<AppGroupRoot>/shinuan/pending-widget-mock-commands.json`

```ts
export interface PhaseBWidgetMockCommandEnvelope {
  readonly contractVersion: 'phase-b-widget-mock-v1';
  /** Swift App Intent 產生之唯一 UUID，供主 App 驗證去重通道 */
  readonly commandId: string;
  readonly type: 'DrinkWater' | 'PetCat';
  readonly timestamp: number; // Unix ms
  /** Phase B 強制固定為 true，主 App 據此拒絕任何正式 GameEngine.dispatch 與存檔落盤 */
  readonly dryRunMockOnly: true;
}

export interface PhaseBWidgetMockQueueFile {
  readonly schemaVersion: 1;
  readonly commands: readonly PhaseBWidgetMockCommandEnvelope[];
}

export interface PhaseBWidgetMockAck {
  readonly commandId: string;
  readonly deduplicated: boolean;
  readonly receivedAt: number;
  readonly persistedToStorage: false;
}
```

- **Phase B Mock 佇列與階段邊界鎖定：**
  1. Swift `App Intents`（「喝水」／「摸頭」快捷按鈕）以 `.tmp` → 原子 `replaceItemAt` 追加寫入 `pending-widget-mock-commands.json`（上限 50 筆；Fail-Closed 拒絕 `dryRunMockOnly !== true` 或損毀項目）並提供即時視覺回饋。
  2. 主 App 開啟時讀取 `pending-widget-mock-commands.json`，依 `timestamp` 升冪排序並以**記憶體內 `Set<string>` 驗證 `commandId` 去重**，產出 `PhaseBWidgetMockAck`（`persistedToStorage: false`）寫入記憶體診斷面板後清空該 Mock 檔案。
  3. **硬性階段切分（對齊 `ADR-002` §4 & `ADR-003`）：** Phase B **嚴禁**寫入正式 `pending-widget-commands.json`、**嚴禁**呼叫正式 `GameEngine.dispatch`、**嚴禁**變更真實遊戲數值或建立 SQLite `processed_widget_commands_json` 單一交易原子冪等落盤（正式指令結算與 SQLite 原子落盤留待 **Phase C**）。

### 2.3 三端 `PetViewModel` 一致性比對契約（RN ／ Android Overlay ／ iOS Widget）

三端皆須接入同一組標準測試夾具（至少涵蓋 4 組完整 `PetViewModel` 狀態快照）：

| 測試夾具 ID | `animationId` | `tailState` | `iconIds` | `display` 三 boolean 旗標（`isSleeping` / `isHealthCritical` / `isCarePaused`） | `display.recoveryState` | 三端必一致項目 |
| --- | :---: | :---: | :---: | --- | :---: | --- |
| `fixture_calm_idle` | `'idle'` | `'neutral'` | `[]` | `false / false / false` | `'NORMAL'` | 均顯示平靜態、無氣泡、外觀／四數值／`display` 全欄位一致 |
| `fixture_hungry_alert` | `'walk'` | `'question_mark'` | `['fish', 'water']` | `false / false / false` | `'NORMAL'` | 均嚴格顯示 `🐟`＋`💧`（不自行增刪圖示）與一致外觀／數值 |
| `fixture_sleep_night` | `'sleep'` | `'curled_sleep'` | `['sleep_zzz']` | `true / false / false` | `'NORMAL'` | 均顯示睡眠態與 `💤`，外觀／四數值／`display` 全欄位一致 |
| `fixture_care_paused_low` | `'sit'` | `'tucked_drooped'` | `['hospital']` | `false / true / true` | `'CRITICAL'` | 均顯示 `🏥`、委屈態與 Care Pause 保護提示，且未自行計算額外門檻 |

> **夾具完整度要求：** 上述 4 組實作 JSON 夾具皆須符合 `packages/contracts/src/view-model.ts` 完整 `PetViewModel` 型別定義（含 `petId`、`name`、`microchipId`、`appearance`、`needs` 四數值、`behavior`、`display` 三 boolean 旗標與 `recoveryState`、`updatedAt` 等全部必填欄位，不得省略）。

[↑ 回到頂部](#top)

---

<a id="sec-3"></a>

## 三、`SHINUAN-B4-01`｜9:19.5 四大核心頁面固定 Mock Fixture 與禁寫契約

### 3.1 視口與四大頁面靜態 Prototype 契約（`390 × 844 pt`）

| 頁面 | Phase B 必須驗證之靜態排版與互動 | Phase B 嚴格禁寫邊界（違反即 FAIL） |
| --- | --- | --- |
| **`AdoptionScreen`** | 左右雙親選擇卡（切卡即時跑 `B1-02` 3 層預合成換色）、簡潔版孟德爾 `%` 預覽條（固定 Mock 數值）、一胎 3～5 隻小貓卡片（隱藏怪癖僅示「有／無」、公三花彩蛋標章） | **嚴禁**呼叫真實 `generateLitterFromParents()` 扣減每日 3 胎額度、寫入領養鎖定或更動 `AccountMeta` |
| **`HomeScreen`** | 頂部 2×2 血條 HUD（消費固定 Mock `PetViewModel`）、Rive 測試貓舞台（6 支 P0-B ＋ 本地走跳摸頭物理）、唯讀 `iconIds` 氣泡、底部 4 分頁與快捷按鈕切換 | **嚴禁**觸發真實 `FeedPet`、`DrinkWater`、`ClaimDailyCheckIn`、`ToggleCarePause` 持久化寫入或真實積分變動 |
| **`ShopScreen` / `ProductDetailModal`** | 分類篩選（全部／主食罐／乾糧／零食）、`一般商品`／`品牌合作`＋`模擬測試資料`標籤、詳情抽屜「真實成分」與「遊戲效果」雙區塊分離、3 秒探索倒數純 UI 動畫骨架 | **嚴禁**執行 `BuyItem`、`InspectProduct` 真實積分入帳、背包庫存扣減或連線 Remote Config |
| **`SettingsScreen`** | 寵物顯示尺寸切換（`22%`/`28%`/`34%`）、Android 懸浮窗開關與 5 秒格線校正頁入口、iOS Widget 教學卡片 | 除本機 `VirtualPerchGridConfig` PoC 預覽外，**嚴禁**建立或遷移 Phase C SQLite 資料庫 |

### 3.2 Phase B 結案報告必填項目（`docs/acceptance/PHASE-B-CLOSEOUT-REPORT.md`）

`SHINUAN-B4-01` 交付結案報告時，必須逐項附上：
1. 三端（React Native、Android 懸浮窗含 Virtual Perch Grid、iOS WidgetKit 含 `App Intents` Dry-Run Mock 佇列）實機／模擬器截圖與同一 `PetViewModel` 夾具對帳表；
2. `TC-B1-01` ～ `TC-B4-02` 全數實測結果與原始輸出摘要；
3. `AndroidManifest.xml` 權限清單稽核證據（確認零 `BIND_ACCESSIBILITY_SERVICE`／`AccessibilityService` 與零 `RECEIVE_BOOT_COMPLETED`）；
4. Phase A 全自動化測試套件（`TC-01`～`TC-10`、`TC-MH-01`～`TC-MH-12`）與 `node scripts/check-shinuan-integrity.mjs` 維持全綠無回歸證據。

[↑ 回到頂部](#top)

---

<a id="sec-4"></a>

## 四、Phase B 權限、隱私與降級防呆紅線

1. **Android 零無障礙與零背景開機常駐紅線（對齊 PRD §4.1、`ADR-002` §3.3）：** `AndroidManifest.xml` 嚴禁宣告 `android.permission.BIND_ACCESSIBILITY_SERVICE`、任何 `AccessibilityService` 元件或 `android.permission.RECEIVE_BOOT_COMPLETED`。
2. **不搶焦點與 Android 12+ 安全穿透紅線：** Android 懸浮窗全時維持 `FLAG_NOT_FOCUSABLE` 並採緊貼貓咪容器動態位移視窗（嚴禁全螢幕透明視窗或對互動視窗套用 `FLAG_NOT_TOUCHABLE`），確保系統軟鍵盤與底層第三方 App 點擊 100% 暢通且零 `Untrusted touch due to occlusion`。
3. **跨平台單一真相紅線：** React Native、Kotlin 與 Swift 皆不得引入任何數值衰退、健康救援或經濟平衡公式；`packages/game-core` 與 `packages/contracts` 在 Phase B 維持零修改。
4. **隱私最小化與路徑安全紅線：** Virtual Perch Grid 僅保存 `[0, 1]` 螢幕座標比率，不得讀取或寫出使用者已安裝 App 清單或桌面截圖原圖至遠端；iOS `App Groups` 圖片路徑嚴格限制於 `<AppGroupRoot>/shinuan/` 內並防禦路徑穿越。

[↑ 回到頂部](#top)

---

<a id="sec-5"></a>

## 五、獨立 QA 驗收測試清單（`TC-B3-01` ～ `TC-B4-02`）

| 測項 ID | 所屬小單 | 驗證目標與斷言條件 |
| --- | :---: | --- |
| **`TC-B3-01`** | `SHINUAN-B3-01` | **Android 權限、焦點與 API 31+ 穿透安全稽核：** 靜態掃描 `AndroidManifest.xml` 確認 **0 筆** `BIND_ACCESSIBILITY_SERVICE`／`AccessibilityService` 與 **0 筆** `RECEIVE_BOOT_COMPLETED` 宣告；於 **Android 12+（API 31+）** 實機／模擬器實測懸浮窗開啟期間點擊窗外底層 App 正常穿透開啟、Logcat 確認 **0 筆 `Untrusted touch due to occlusion`**、於輸入框打字時輸入法不收合（全時 `FLAG_NOT_FOCUSABLE`）；撤銷 `SYSTEM_ALERT_WINDOW` 權限時安全降級回 App 內模式零閃退。 |
| **`TC-B3-02`** | `SHINUAN-B3-01` | **Virtual Perch Grid 物理、完整 Schema Fail-Closed 與 Headless JS 邊界驗證：** 驗證 `4×5`/`4×6`/`5×6` 格線切換與單向穿過拋物線落點精準；於寬度 `< 1.35×` 貓寬之窄 `app_tile` 禁止長距水平走步；逐項餵入 JSON 損毀、錯 `schemaVersion`、未知 `presetId`/`catScalePreset`/`kind`、非陣列 `platforms`、非 boolean `enabled`、非法 `updatedAt`、空白／重複 `id`、`x1Norm >= x2Norm`、`yNorm <= 0`、非有限座標與缺 `dock` 案例，均確認 Fail-Closed 自動回退內建 `'4x6'`；驗證 `dropHeightRatio` 邊界（`0.25` 不觸發、`0.2501` 觸發、`1.0` 合法觸發、`> 1.0`／`< 0`／`NaN`／`Infinity` 拒絕）均僅觸發 `PhaseBOverlayMockEvent`（`dryRunMockOnly: true`、`persistedToStorage: false`，零正式 `GameEngine.dispatch` 與零寫檔）；驗證 Headless JS 逾時語義（`elapsedMs = 1999` 正常回傳、`elapsedMs = 2000` 及 `2500` 判定逾時並安全降級不閃退）。 |
| **`TC-B3-03`** | `SHINUAN-B3-02` | **iOS `App Groups` 原子快照、路徑安全與 `App Intents` Dry-Run Mock 佇列驗證：** 驗證主 App 遵循「先寫不可變版本化 PNG → 再原子替換 `widget-snapshot.json`」於 `group.com.shizhan.shinuan` 發布且 SwiftUI Widget 正常渲染；驗證缺檔、損毀 JSON、未知 `schemaVersion`、非法欄位型別、絕對路徑／`..` 路徑穿越時安全顯示預設引導卡，以及 PNG 遺失／損毀／`compositorCacheKey` 不符時安全呈現內建佔位圖不閃退；驗證點擊 Widget `App Intents`（「喝水」／「摸頭」）原子寫入 `pending-widget-mock-commands.json`（`dryRunMockOnly: true`），主 App 啟動後依 `timestamp` 排序並於記憶體內驗證重複 `commandId` 去重、回傳 `persistedToStorage: false` 且清空 Mock 檔；確認 Swift 零重寫遊戲公式，且零寫入 Phase C 正式 `pending-widget-commands.json` 或 SQLite。 |
| **`TC-B3-04`** | `SHINUAN-B3-02` | **三端 `PetViewModel` 完整欄位一致性對帳：** 以 §2.3 全部 4 組完整 `PetViewModel` 標準夾具（`fixture_calm_idle`、`fixture_hungry_alert`、`fixture_sleep_night`、`fixture_care_paused_low`）依序驅動 RN 主畫面、Android 懸浮窗與 iOS Widget，逐項比對 `animationId`、`tailState`、`iconIds`、外觀（`appearance`）、四數值（RN 與 iOS 核對畫面顯示；Android 懸浮窗透過所注入之 `PetViewModel` Snapshot／除錯檢視對帳）與全部 `display` 欄位（`isSleeping`、`isHealthCritical`、`isCarePaused`、`recoveryState`）100% 一致。 |
| **`TC-B4-01`** | `SHINUAN-B4-01` | **9:19.5 四大核心頁面排版與動線驗證：** 於基準視口 `390 × 844 pt`（含劉海／Safe Area）走完 `AdoptionScreen` → `HomeScreen` → `ShopScreen` / `ProductDetailModal` → `SettingsScreen` 全靜態動線，確認無文字截斷、無重疊遮擋、商店「真實成分」與「遊戲效果」雙區塊清晰分離且 `mock` 商品強制顯示模擬標籤。 |
| **`TC-B4-02`** | `SHINUAN-B4-01` | **Phase B 禁寫邊界與 Phase A 零回歸稽核：** 連續操作四大頁面全部按鈕（抽胎、領養預覽、購買按鈕、每日簽到、3 秒倒數），驗證持久化檔案系統與 SQLite **0 筆真實遊戲寫入**、積分／領養額度不變動；並確認 `node scripts/check-shinuan-integrity.mjs` 與 Phase A 全測試套件全綠無回歸。 |

[↑ 回到頂部](#top) ｜ [← 回到 Phase B 拆解地圖](PHASE-B-SPEC-MAP.md)
