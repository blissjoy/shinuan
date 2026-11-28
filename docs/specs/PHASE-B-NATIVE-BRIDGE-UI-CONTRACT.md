<a id="top"></a>

# Phase B 技術設計書｜雙平台原生橋接與靜態 UI 契約（`SHINUAN-B3-01` ＋ `SHINUAN-B3-02` ＋ `SHINUAN-B4-01`）

> **導覽與追溯：** [← 回到規格入口](README.md#phase-b) ｜ [Phase B 規格拆解地圖](PHASE-B-SPEC-MAP.md) ｜ [預合成與 Rive 介面契約](PHASE-B-RIVE-COMPOSITOR-CONTRACT.md) ｜ [手機 UI/UX 與桌面跳台設計](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) ｜ [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ADR-002 雙平台原生橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md) ｜ [ADR-003 JSON→SQLite 存檔](../decisions/ADR-003-save-storage-json-to-sqlite.md)

- **文件性質：** Phase B 實作層細部技術契約設計書，專責鎖定 **`SHINUAN-B3-01`（RN 宿主＋Android 懸浮窗與 Virtual Perch Grid 跳台 PoC）**、**`SHINUAN-B3-02`（iOS `WidgetKit` ＋ `App Groups` 唯讀快照與三端一致性）** 與 **`SHINUAN-B4-01`（9:19.5 四大頁面固定 Mock 靜態 UI Prototype 與結案驗證）** 之資料 Schema、橋接介面、權限合規門檻與獨立 QA 測試斷言。
- **對應規格基準：** `Master PRD v2.1.31`（§4.1、§4.3、§5.2 `PetViewModel`、§7 Phase B、§8.B.1、§8.B.3、§8.D、§10.1～§10.2）、`packages/contracts`（`view-model.ts`、`behavior.ts`、`genetics.ts`、`pet.ts`）、`ADR-002`。
- **核心設計紅線：** Phase B 三端（React Native、Android Kotlin 懸浮窗、iOS SwiftUI Widget）**一律唯讀消費同一份 `PetViewModel` 契約**；嚴禁於 Phase B 實作真實領養寫入、正式 `GameEngine.dispatch` 經濟／存檔結算、SQLite 遷移或 `AccessibilityService` 權限。

---

## 快速跳轉目錄

- [一、`SHINUAN-B3-01`｜Android Kotlin 懸浮窗、Virtual Perch Grid 與 Headless JS Mock 契約](#sec-1)
- [二、`SHINUAN-B3-02`｜iOS `App Groups` `widget-snapshot.json` 與三端一致性契約](#sec-2)
- [三、`SHINUAN-B4-01`｜9:19.5 四大核心頁面固定 Mock Fixture 與禁寫契約](#sec-3)
- [四、Phase B 權限、隱私與降級防呆紅線](#sec-4)
- [五、獨立 QA 驗收測試清單（`TC-B3-01` ～ `TC-B4-02`）](#sec-5)

---

<a id="sec-1"></a>

## 一、`SHINUAN-B3-01`｜Android Kotlin 懸浮窗、Virtual Perch Grid 與 Headless JS Mock 契約

### 1.1 Android 視窗旗標與生命週期契約（對齊 `ADR-002` §3）

1. **強制 `WindowManager.LayoutParams` 鎖定：**
   - `type = TYPE_APPLICATION_OVERLAY`（API 26+）
   - `format = PixelFormat.TRANSLUCENT`
   - `flags` **必須恆含 `FLAG_NOT_FOCUSABLE`**（絕不搶奪系統輸入法／鍵盤焦點）；貓咪本體邊界框外之透明區域必須穿透點擊（採視窗緊貼貓咪容器動態位移，或於非互動區域設置 `FLAG_NOT_TOUCHABLE` 穿透至底層 Launcher）。
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
  /** Unix timestamp (ms) */
  readonly updatedAt: number;
}
```

- **Fail-Closed 驗證與預設回退：** 載入 `VirtualPerchGridConfig` 若發生 JSON 損毀、`schemaVersion !== 1`、`id` 空白或重複、`x1Norm >= x2Norm`、`yNorm <= 0`、超界（非有限數或超出 `[0, 1]`）或無任何 `enabled === true` 之 `dock` 平台，Kotlin 層必須自動回退至內建 `'4x6'` 預設格線（不崩潰）。
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
      /** 本次連續下墜距離占螢幕總高度比率，觸發條件嚴格為 > 0.25（且 <= 1） */
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
  1. Phase B Headless JS Task 收到 `PhaseBOverlayMockEvent` 後，**僅允許寫入記憶體內診斷紀錄並回傳 `PhaseBOverlayMockAck`（`persistedToStorage: false`）**，執行完畢立即釋放 JS 任務。
  2. Kotlin 層喚醒 Headless JS 必須套用 **2,000 ms 硬性超時與異常降級保護**：若逾時、JS 任務未就緒或回傳格式無效，懸浮窗不得阻塞主執行緒或閃退，須記錄診斷日誌並安全維持本機平滑動作狀態。
  3. **嚴禁於 Phase B 呼叫正式 `GameEngine.dispatch(TriggerLanding)`、修改任何遊戲數值或寫入檔案／SQLite**；正式指令接線與持久化留待 **Phase C**。

[↑ 回到頂部](#top)

---

<a id="sec-2"></a>

## 二、`SHINUAN-B3-02`｜iOS `App Groups` `widget-snapshot.json` 與三端一致性契約

### 2.1 共享容器與快照檔案 Schema（`widget-snapshot.json`，Schema v1）

- **唯一共享容器識別碼（對齊 `ADR-002` §4）：** `group.com.shizhan.shinuan`
- **相對檔案路徑：**
  - 快照 JSON：`<AppGroupRoot>/shinuan/widget-snapshot.json`
  - 預合成靜態貓咪圖：`<AppGroupRoot>/shinuan/cat-snapshot.png`（由 [PHASE-B-RIVE-COMPOSITOR-CONTRACT.md](PHASE-B-RIVE-COMPOSITOR-CONTRACT.md) §2.3 預合成器輸出，免於 Swift Extension 重跑著色）

```ts
import type { PetViewModel } from '@shinuan/contracts';

export interface IosWidgetSnapshotV1 {
  readonly schemaVersion: 1;
  /** 完整唯讀 PetViewModel（三端唯一真相，嚴禁含 interruptible 或 cooldownMs） */
  readonly viewModel: PetViewModel;
  /** 與 GameState 同步之最後模擬時間戳（Unix ms），供 Widget 顯示「更新於 X 分鐘前」 */
  readonly lastSimulatedAt: number;
  /** App Group 容器內相對路徑，例如 "shinuan/cat-snapshot.png" */
  readonly snapshotImageRelativePath: string;
  /** 預合成器快取鍵，確保換色後 Widget 同步刷新 */
  readonly compositorCacheKey: string;
  /** 寫出時間戳（Unix ms） */
  readonly writtenAt: number;
}
```

- **原子寫入與唯讀規則：**
  1. 主 App 寫出 `widget-snapshot.json` 一律採先寫 `.tmp` 再原子 `replaceItemAt`／rename 覆蓋，完成後呼叫 `WidgetCenter.shared.reloadAllTimelines()`，避免 Widget 讀到半截 JSON。
  2. SwiftUI `WidgetKit` Timeline Provider **嚴禁重寫任何需求衰退、健康救援或行為仲裁公式**；僅唯讀 `viewModel.needs`、`viewModel.behavior.iconIds`、`viewModel.display.{isSleeping, isHealthCritical, isCarePaused}` 與 `cat-snapshot.png` 呈現 UI。
  3. 當 `widget-snapshot.json` 缺失或解析失敗時，Widget 必須安全顯示「開啟拾暖伴伴喚醒你的小貓」預設預覽卡，不得閃退。
  4. **階段切分（對齊 `ADR-002` §4 & `ADR-003`）：** Phase B **不實作** `App Intents` 寫入 `pending-widget-commands.json` 與 SQLite 單一交易原子冪等落盤（均屬 **Phase C**）。

### 2.2 三端 `PetViewModel` 一致性比對契約（RN ／ Android Overlay ／ iOS Widget）

三端皆須接入同一組標準測試夾具（至少涵蓋 4 組狀態快照）：

| 測試夾具 ID | `animationId` | `tailState` | `iconIds` | `display` 旗標 | 三端必一致項目 |
| --- | :---: | :---: | :---: | --- | --- |
| `fixture_calm_idle` | `'idle'` | `'neutral'` | `[]` | 全 `false` | 均播放／顯示平靜態、無氣泡、四數值完全一致 |
| `fixture_hungry_alert` | `'walk'` | `'question_mark'` | `['fish', 'water']` | 全 `false` | 均嚴格顯示 `🐟`＋`💧`（不自行增刪圖示） |
| `fixture_sleep_night` | `'sleep'` | `'curled_sleep'` | `['sleep_zzz']` | `isSleeping: true` | 均顯示睡眠態與 `💤` |
| `fixture_care_paused_low` | `'sit'` | `'tucked_drooped'` | `['hospital']` | `isHealthCritical: true, isCarePaused: true` | 均顯示 `🏥`、委屈態與 Care Pause 保護提示，且未自行計算額外門檻 |

> **夾具完整度要求：** 上述 4 組實作 JSON 夾具皆須符合完整 `PetViewModel` 型別定義（含 `needs` 四數值、`appearance`、`behavior` 與 `display.recoveryState` 等全部必填欄位，不得省略）。

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
1. 三端（React Native、Android 懸浮窗含 Virtual Perch Grid、iOS WidgetKit）實機／模擬器截圖與同一 `PetViewModel` 夾具對帳表；
2. `TC-B1-01` ～ `TC-B4-02` 全數實測結果與原始輸出摘要；
3. `AndroidManifest.xml` 權限清單稽核證據（確認零 `BIND_ACCESSIBILITY_SERVICE`／`AccessibilityService` 與零 `RECEIVE_BOOT_COMPLETED`）；
4. Phase A 全自動化測試套件（`TC-01`～`TC-10`、`TC-MH-01`～`TC-MH-12`）與 `node scripts/check-shinuan-integrity.mjs` 維持全綠無回歸證據。

[↑ 回到頂部](#top)

---

<a id="sec-4"></a>

## 四、Phase B 權限、隱私與降級防呆紅線

1. **Android 零無障礙與零背景開機常駐紅線（對齊 PRD §4.1、`ADR-002` §3.3）：** `AndroidManifest.xml` 嚴禁宣告 `android.permission.BIND_ACCESSIBILITY_SERVICE`、任何 `AccessibilityService` 元件或 `android.permission.RECEIVE_BOOT_COMPLETED`。
2. **不搶焦點與不擋操作紅線：** Android 懸浮窗全時維持 `FLAG_NOT_FOCUSABLE`，系統軟鍵盤與底層第三方 App 點擊操作必須 100% 暢通。
3. **跨平台單一真相紅線：** React Native、Kotlin 與 Swift 皆不得引入任何數值衰退、健康救援或經濟平衡公式；`packages/game-core` 與 `packages/contracts` 在 Phase B 維持零修改。
4. **隱私最小化紅線：** Virtual Perch Grid 僅保存 `[0, 1]` 螢幕座標比率，不得讀取或寫出使用者已安裝 App 清單或桌面截圖原圖至遠端。

[↑ 回到頂部](#top)

---

<a id="sec-5"></a>

## 五、獨立 QA 驗收測試清單（`TC-B3-01` ～ `TC-B4-02`）

| 測項 ID | 所屬小單 | 驗證目標與斷言條件 |
| --- | :---: | --- |
| **`TC-B3-01`** | `SHINUAN-B3-01` | **Android 權限與焦點安全稽核：** 靜態掃描 `AndroidManifest.xml` 確認 **0 筆** `BIND_ACCESSIBILITY_SERVICE`／`AccessibilityService` 與 **0 筆** `RECEIVE_BOOT_COMPLETED` 宣告；實測懸浮窗開啟期間點擊底層 App 正常穿透開啟，於輸入框打字時輸入法不收合（全時 `FLAG_NOT_FOCUSABLE`）；撤銷 `SYSTEM_ALERT_WINDOW` 權限時安全降級回 App 內模式零閃退。 |
| **`TC-B3-02`** | `SHINUAN-B3-01` | **Virtual Perch Grid 物理、防走空與損毀回退：** 驗證 `4×5`/`4×6`/`5×6` 格線切換與單向穿過拋物線落點精準；於寬度 `< 1.35×` 貓寬之窄 `app_tile` 上確認禁止長距水平走步；餵入損毀、`schemaVersion !== 1`、`yNorm <= 0`、重複／空白 `id` 或超界 JSON 時確認 Fail-Closed 自動回退內建 `'4x6'` 格線；高空掉落（`dropHeightRatio > 0.25`）確認僅觸發 `PhaseBOverlayMockEvent`（`dryRunMockOnly: true`）且回傳 `persistedToStorage: false`（零正式 `GameEngine.dispatch`、零檔案寫入），逾時（`> 2,000 ms`）安全降級不閃退。 |
| **`TC-B3-03`** | `SHINUAN-B3-02` | **iOS `App Groups` 原子快照與降級防呆：** 驗證主 App 原子寫出 `widget-snapshot.json` 與 `cat-snapshot.png` 至 `group.com.shizhan.shinuan` 且 SwiftUI Widget 正常渲染；刪除或損毀 `widget-snapshot.json` 時 Widget 安全顯示預設引導卡不閃退；確認 Swift 端零實作遊戲公式且未提前寫入 Phase C `pending-widget-commands.json`。 |
| **`TC-B3-04`** | `SHINUAN-B3-02` | **三端 `PetViewModel` 一致性對帳：** 以 §2.2 全部 4 組完整 `PetViewModel` 標準夾具（`fixture_calm_idle`、`fixture_hungry_alert`、`fixture_sleep_night`、`fixture_care_paused_low`）依序驅動 RN 主畫面、Android 懸浮窗與 iOS Widget，逐項驗證外觀、四數值（RN 與 iOS 核對畫面顯示；Android 懸浮窗透過所注入之 `PetViewModel` Snapshot／除錯檢視對帳）、`iconIds` 與 Care Pause／`recoveryState` 狀態呈現 100% 一致。 |
| **`TC-B4-01`** | `SHINUAN-B4-01` | **9:19.5 四大核心頁面排版與動線驗證：** 於基準視口 `390 × 844 pt`（含劉海／Safe Area）走完 `AdoptionScreen` → `HomeScreen` → `ShopScreen` / `ProductDetailModal` → `SettingsScreen` 全靜態動線，確認無文字截斷、無重疊遮擋、商店「真實成分」與「遊戲效果」雙區塊清晰分離且 `mock` 商品強制顯示模擬標籤。 |
| **`TC-B4-02`** | `SHINUAN-B4-01` | **Phase B 禁寫邊界與 Phase A 零回歸稽核：** 連續操作四大頁面全部按鈕（抽胎、領養預覽、購買按鈕、每日簽到、3 秒倒數），驗證持久化檔案系統與 SQLite **0 筆真實遊戲寫入**、積分／領養額度不變動；並確認 `node scripts/check-shinuan-integrity.mjs` 與 Phase A 全測試套件全綠無回歸。 |

[↑ 回到頂部](#top) ｜ [← 回到 Phase B 拆解地圖](PHASE-B-SPEC-MAP.md)
