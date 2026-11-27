# ADR-001：Phase B 2D 骨骼動畫引擎與動態換色管線選型（Rive vs Spine 2D）

- **狀態：** `ACCEPTED`（PO 已於 2026-11-26 拍板核准，透過 `SHINUAN-DOC-03` 納入 `docs/decisions/ADR-001-animation-engine-rive.md`）
- **決策日期：** 2026-11-26
- **關聯規格：** `Master PRD v2.1.31`（§5.2、§7 Phase B、§8.B.3 動畫矩陣）、`docs/specs/PHASE-B-2D-ART-PIPELINE-SPEC.md`

---

## 1. 背景與問題陳述

拾暖伴伴（`shinuan`）在 Phase B 須以一套 2D 粉彩繪本貓咪素材同時滿足 5 項嚴苛條件：
1. **跨三端一致渲染：** React Native 主 App（Android + iOS）、Android 原生 Kotlin `WindowManager` 透明懸浮窗、以及 iOS SwiftUI Widget（靜態快照）。
2. **千變萬化基因換色與換裝：** 支援 6 大品種（12 個模組化零件）與 9 基因座真實毛色／眼色／鼻頭／肉球，且 100% 保留 PO 手繪粉彩繪本筆觸與暖棕線稿。
3. **極致省電與低記憶體：** 懸浮窗常駐於使用者日常滑手機之上，不得使用肥大 WebView 或耗電 3D 引擎。
4. **互動手感：** 支援摸頭彈性晃動、眼球即時追蹤手指、8 種獨立尾巴情緒動畫軌、與 6 支 P0-B 核心動作。
5. **獨立團隊／新創友善授權成本：** 不得在專案初期投入高額前期授權費，也不應在營收成長期遇到昂貴授權懸崖。

---

## 2. 候選方案實查對比（2026 最新授權與技術現況）

| 評估維度 | **方案 A：Rive（推薦）** | 方案 B：Spine 2D | 方案 C：傳統逐格 Sprite Sheet |
| --- | --- | --- | --- |
| **React Native 官方支援** | **有官方 `@rive-app/react-native`**（底層 C++ Nitro Modules，高效能零 WebView） | **無官方 React Native Runtime**（須自包 WebView＋`spine-pixi` 吃記憶體，或自寫雙平台原生橋接維護） | 原生 Image 序列即可，無須 Runtime |
| **Android Kotlin 懸浮窗相容性** | **極佳：** 官方 `rive-android` 的 `RiveAnimationView` 繼承 **`TextureView`**，搭配 `PixelFormat.TRANSLUCENT` 天生支援 `WindowManager` 透明疊加（無 `SurfaceView` Z-order 黑洞問題） | 官方有 `spine-android`（libGDX / Compose），但與 RN 無法共用同一套輕量 JS 綁定 | 極佳，但檔案體積暴增 |
| **iOS 官方支援** | 有官方 `rive-ios`（Swift / SwiftUI）；Widget 可直接讀預合成靜態 PNG | 有官方 `spine-ios` | 原生支援 |
| **商業授權與成本** | **所有 Runtime 皆 MIT 免費開源、零抽成、零營收懸崖**；編輯器 Cadet 年繳約 **\$9/人/月**（移除 Splash Screen） | Essential **\$99**（無網格變形與 IK）；Professional **\$449** 一次買斷；年營收／融資達 **\$500K USD** 強制轉 Enterprise **\$2,499/年 + \$379/人/年** | \$0 |
| **動態換色＋12 零件換裝支援** | **原生 Image Data Binding / `FileAssetDelegate`**，支援執行期直接注入動態合成之 Bitmap／ByteArray 替換零件圖 | 支援 Slot Tint 與 Skin 替換，功能強大 | 無法支撐 6 品種 × 上萬毛色 × 15 支動作組合（爆炸性繪圖量） |
| **內建狀態機與互動控制** | **內建視覺化 State Machine**，支援多層動畫軌（主動作＋獨立尾巴軌）與即時數值輸入驅動眼球／頭部追蹤 | 需由程式自行寫狀態機混合控制 | 無平滑過渡，互動僵硬 |

---

## 3. 正式決策（Accepted Decision）

**正式採用 `Rive` 作為 Phase B ～ C 唯一 2D 骨骼動畫引擎，並搭配「一次性 3 層預合成 ＋ Image Data Binding 注入」著色管線：**

1. **為什麼「預合成一次 → 塞進 Rive 零件槽」比「每影格跑客製 Shader」更好？**
   - 依 `Master PRD v2.1.31` §3.1，每隻貓咪誕生後外觀與基因**永久鎖定不變**。
   - 因此僅需在**領養換色**或**App 啟動初始化**時，由共用 2D 合成器花費 `< 20 ms` 將該貓咪對應之 12 個零件的 3 層 PNG（純灰階 `fur_base` × `primaryHex` ＋ 柔邊 `mask_<pattern>` × `secondaryHex` ＋ 永不染色 `linework`）一次合成為 12 張乾淨 RGBA 零件圖，透過 Rive **Image Data Binding / `FileAssetDelegate`** 注入 `.riv` 骨架檔。
   - **三大決定性優勢：**
     1. **每影格零額外著色開銷：** Android 懸浮窗極致省電、低發熱、60/24 FPS 穩定不掉幀；
     2. **三端 100% 像素一致：** React Native 主房間、Android Kotlin 懸浮窗、iOS Widget 靜態快照全部顯示同一組預合成粉彩零件，絕無色差；
     3. **完全規避 Rive 向量染色不適用於點陣筆觸的限制：** 完整保留 PO 繪本粉彩毛流與暖棕手繪線稿！

---

## 4. 風險與緩解策略

1. **風險 1：Android `WindowManager` 懸浮窗若未正確釋放 `RiveAnimationView` 可能造成記憶體洩漏或背景空轉耗電。**
   - **緩解：** 懸浮窗隱藏至通知列或移除時，強制呼叫 `riveView.onPause()`、`riveView.onDestroy()` 與 `windowManager.removeView()`（納入 Phase B 整合檢查清單）。
2. **風險 2：Rive 編輯器付費帳號（Cadet ~\$9/月）僅需在產出／修改 `.riv` 檔案時訂閱。**
   - **緩解：** 已匯出之 `.riv` 檔與 MIT Runtime 無執行期綁定或續費限制，成本完全可控。
3. **風險 3：Rive 在超低階 Android 舊機若遇 GPU 驅動相容問題。**
   - **緩解：** 預留靜態預合成合成圖降級路徑（極端異常時回退顯示靜態預合成貓圖＋淡入淡出，絕不閃退）。

---

## 5. PO 拍板確認紀錄（2026-11-26）

- [x] 核准 Phase B 正式選定 **Rive**（放棄 Spine 2D 與逐格 Sprite Sheet 作為主引擎）。
- [x] 核准採用 **「啟動／換色時一次性 3 層 PNG 預合成 → Rive Image Data Binding 注入 12 零件」** 架構。
