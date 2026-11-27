# ADR-002：Phase B 雙平台原生橋接架構（React Native ＋ Android Kotlin 懸浮窗 ＋ iOS WidgetKit）

- **狀態：** `ACCEPTED`（PO 已於 2026-11-26 拍板核准，透過 `SHINUAN-DOC-03` 納入 `docs/decisions/ADR-002-mobile-native-bridge-architecture.md`）
- **決策日期：** 2026-11-26
- **關聯規格：** `Master PRD v2.1.30`（§4.1、§4.2、§5.1、§5.2 `PetViewModel`、§10.1、§10.2）、`ADR-001`

---

## 1. 背景與核心約束

1. **Game Core 單一真相原則：** 所有需求衰退、健康救援、經濟與行為仲裁邏輯 100% 鎖定於純 TypeScript `packages/game-core`，**嚴禁在 Kotlin 或 Swift 中重寫任何遊戲規則**。
2. **省電底線：** 捨棄耗電背景常駐服務；離線期間以 `lastSimulatedAt` 時間戳補算。
3. **雙平台能力天生不對稱：**
   - **Android：** 支援全域透明懸浮窗（`WindowManager` + `SYSTEM_ALERT_WINDOW`），可長期浮於其他 App 之上並接受點擊、拖曳、掉落物理互動。
   - **iOS：** 不允許全域懸浮窗；外部呈現改採 `WidgetKit`（SwiftUI 獨立 Extension 行程，受系統 15～60 分鐘排程限制，不跑持續動畫）＋ `App Intents` 有限快捷操作。

---

## 2. 整體架構分層圖

```text
┌──────────────────────────────────────────────────────────────────────┐
│                   React Native App (apps/mobile)                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  packages/game-core (純 TS 單一真相：Time/Economy/Behavior)     │  │
│  │  outputs: PetViewModel (唯讀契約) + 12 張預合成粉彩零件 PNG       │  │
│  └───────────────┬───────────────────────────────┬────────────────┘  │
└──────────────────┼───────────────────────────────┼───────────────────┘
                   │ JSI / Native Module           │ App Groups 共享容器
                   ▼                               ▼
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│  Android Kotlin Overlay Service    │  │  iOS WidgetKit Extension (SwiftUI) │
│  - WindowManager (TRANSLUCENT)     │  │  - 讀取 shared WidgetSnapshot JSON │
│  - RiveAnimationView (TextureView) │  │  - 讀取預合成靜態貓咪 PNG 快照       │
│  - 本機觸控物理（拖曳/掉落/眼球）    │  │  - App Intents 寫入 pending 指令佇列 │
│  - 互動事件 → 短生命週期 Headless JS │  │    → App 開啟時由 GameCore 依時序結算 │
└────────────────────────────────────┘  └────────────────────────────────────┘
```

---

## 3. Android Kotlin 懸浮窗橋接設計（省電＋零焦點干擾）

1. **視窗旗標與隱私安全（對齊 PRD §4.1、§10.1）：**
   - API 26+ 使用 `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY` 與 `PixelFormat.TRANSLUCENT`。
   - 強制設置 **`FLAG_NOT_FOCUSABLE`**（絕不搶奪系統鍵盤焦點；使用者在 LINE / 瀏覽器輸入文字時，懸浮窗完全不攔截鍵盤或造成輸入法收合）。
   - 僅於領養完成後引導授權 `SYSTEM_ALERT_WINDOW`；若使用者拒絕或日後於系統設定撤銷權限，自動無痛降級為「App 內模式」並保存進度，絕不閃退。
2. **背景零常駐 JS 引擎的互動回流機制：**
   - **純視覺與物理互動在 Kotlin 本地跑：** 貓咪螢幕漫步、邊界轉向、手指拖曳、虛擬重力掉落、摸頭輕晃與眼球追蹤，全部在 Kotlin 層對 `RiveAnimationView`（`TextureView`）低耗電本地執行，完全不喚醒 JS。
   - **僅在真正需要改數值／仲裁時觸發事件回流：** 當玩家點擊摸頭（`PetCat`）、連戳（`PokePet`）、或高空掉落超過螢幕高度 25%（`TriggerLanding`）時，Kotlin 紀錄精確 `timestamp`，透過輕量 **Headless JS Task**（若 App 在背景）或直接透過 JSI（若 App 在前景）呼叫 `GameEngine.dispatch(command)` → 更新存檔與最新 `PetViewModel` → 回傳最新動畫指令給 Kotlin 懸浮窗後隨即釋放 JS 任務。
3. **省電與生命週期護欄：**
   - 偵測 Android 省電模式（`PowerManager.isPowerSaveMode`）自動將 Rive 渲染頻率降至 `15~24 FPS`；
   - 螢幕關閉（`ACTION_SCREEN_OFF`）立即暫停 `riveView.onPause()`，亮屏（`ACTION_USER_PRESENT`）才恢復；
   - 隱藏至通知列或停止服務時完整執行 `onPause()` / `onDestroy()` / `removeView()`，零記憶體洩漏；
   - 手機重開機後 MVP **不自動背景啟動**（對齊 PRD §4.1）。
4. **桌面「App 方塊跳台系統（Virtual Perch Grid）」（2026-11-27 PO 拍板增補）：**
   - **嚴格合規（零無障礙權限）：** 絕不申請敏感 `AccessibilityService` 竊讀第三方桌面 App 真實座標，避免違反 Google Play 政策。
   - **虛擬跳台網格校正：** 內建 `4×5`／`4×6`／`5×6` 常見桌面格線＋頂部 Widget 區＋底部 Dock 預設，並提供「5 秒半透明格線拖拉校正（可疊個人桌面截圖貼齊）」，讓貓咪於 Kotlin 本地層依精準拋物線物理在玩家自己的 App 方塊與時鐘卡片間跳躍、蹲坐與趴睡，且維持透明區觸控穿透與 `FLAG_NOT_FOCUSABLE`。完整資料契約與物理防呆規則詳見 [PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md](../specs/PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md)。

---

## 4. iOS `WidgetKit` ＋ `App Groups` 橋接設計

1. **共享資料容器（`App Groups`）：**
   - 啟用 `group.com.shizhan.shinuan`；主 App 每次執行 `GameEngine.dispatch` 或進入背景（`applicationDidEnterBackground`）時，寫出精簡 `widget-snapshot.json`（含 `PetViewModel`、`lastSimulatedAt` 與目前 1 張預合成靜態貓咪 PNG 路徑）並呼叫 `WidgetCenter.shared.reloadAllTimelines()`。
2. **Timeline Provider 唯讀預估展示：**
   - SwiftUI Widget Extension **絕不重寫完整遊戲公式**，僅唯讀 `widget-snapshot.json` 呈現貓咪外觀、四大血條與狀態圖示（如睡眠 💤、Care Pause 標誌、或距上次更新已久之「來看看我」溫馨提醒）。
3. **App Intents 快捷操作（防雙頭馬車設計）：**
   - 使用者在桌面 Widget 點「喝水」或「摸頭」快捷按鈕時，Swift App Intent 將 `{ type, timestamp }` 追加寫入共享容器 `pending-widget-commands.json` 並顯示即時視覺回饋；
   - 待玩家開啟主 App 時，`GameEngine` 第一時間讀取並清空 `pending-widget-commands.json`，**嚴格依各筆 `command.timestamp` 順序呼叫 `GameEngine.dispatch`**（先 `TimeEngine.advanceTo(command.timestamp)` 再套用互動），確保 `lastSimulatedAt` 單一時間權威 100% 不偏移！

---

## 5. PO 拍板確認紀錄（2026-11-26 ～ 2026-11-27）

- [x] 核准 Android 懸浮窗採 **「Kotlin 原生 `RiveAnimationView`（`TextureView`）負責本地物理＋按需 Headless JS 回流 `GameCore`」** 省電架構。
- [x] 核准 iOS Widget 採 **「`App Groups` 共享 `WidgetSnapshot` ＋ `App Intents` 寫入 `pending-widget-commands.json` 待主 App 依時間戳補算」**，嚴格不在 Swift 重寫遊戲規則。
- [x] （2026-11-27 增補）核准 Android 桌面導入 **「App 方塊跳台系統（Virtual Perch Grid）」**，採預設桌面格線＋5 秒半透明校正之零無障礙權限合規方案。
