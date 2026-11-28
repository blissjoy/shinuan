<a id="top"></a>

# Phase B 技術設計書｜3 層動態預合成器與 Rive 骨骼介面契約（`SHINUAN-B1-02` ＋ `SHINUAN-B2-01`）

> **導覽與追溯：** [← 回到規格入口](README.md#phase-b) ｜ [Phase B 規格拆解地圖](PHASE-B-SPEC-MAP.md) ｜ [2D 美術與拆圖規範](PHASE-B-2D-ART-PIPELINE-SPEC.md) ｜ [手機 UI/UX 與桌面跳台設計](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) ｜ [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ADR-001 動畫引擎 Rive](../decisions/ADR-001-animation-engine-rive.md) ｜ [ADR-002 雙平台原生橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md)

- **文件性質：** Phase B 實作層細部技術契約設計書，專責鎖定 **`SHINUAN-B1-02`（3 層動態預合成器）** 與 **`SHINUAN-B2-01`（Rive 共用骨骼 `.riv` 與 State Machine 介面契約）** 之精確演算法、資產槽位名稱、Input 變數與自動化驗收斷言。
- **對應規格基準：** `Master PRD v2.1.31`（§3.1、§4.3、§5.2 `PetViewModel`、§7 Phase B、§8.A.1～§8.A.5、§8.B.1、§8.B.3）、`packages/contracts`（`view-model.ts`、`genetics.ts`、`behavior.ts`）、[S1-04 真實遺傳設計](SPEC-01-contracts-config-genetics/S1-04-preset-parents-litter-design.md)。
- **核心設計目標：** 確保 **美術 Rive 綁骨**、**React Native 主畫面**、**Android Kotlin 懸浮窗** 與 **iOS SwiftUI Widget 快照** 四端使用完全一致的合成公式、槽位命名與狀態機輸入契約，達到 **「零色差、零魔術字串、`< 20 ms` 一次性合成、每影格零著色開銷、100% 遵守渲染雙鐵律」**。

---

## 快速跳轉目錄

- [一、唯讀輸入契約與 Phase B 階段邊界](#sec-1)
- [二、`SHINUAN-B1-02`｜3 層動態預合成器像素公式與快取契約](#sec-2)
- [三、`SHINUAN-B2-01`｜Rive `.riv` 槽位命名與 `CatMainSM` 狀態機輸入契約](#sec-3)
- [四、渲染雙鐵律（A／B）實作約束與降級防呆](#sec-4)
- [五、獨立 QA 驗收測試清單（`TC-B1-01` ～ `TC-B2-03`）](#sec-5)

---

<a id="sec-1"></a>

## 一、唯讀輸入契約與 Phase B 階段邊界

### 1.1 唯讀消費 `PetViewModel`（單一真相原則）

渲染層與預合成器僅唯讀讀取 `packages/contracts/src/view-model.ts` 定義之 `PetViewModel`，**嚴禁修改 `packages/contracts` 或 `packages/game-core`，亦嚴禁於渲染層重算需求衰退、健康救援或行為冷卻**：

- **外觀依據（`PetViewModel.appearance: PetAppearance`）：**
  - 七大圖層：`head`、`ears`、`eyes`、`pupilColor`、`coatPattern`、`tail`、`body`
  - 色彩參數：`colorParams: { primaryHex, secondaryHex, lightnessDelta, saturationDelta }`
  - **禁止二次微調規則：** `colorParams.primaryHex` 與 `colorParams.secondaryHex` 已由 `packages/game-core` 完成 HSL `±8%` 微調與無彩色保護；預合成器**直接採用該 HEX 著色，嚴禁再次疊加 `lightnessDelta` 或 `saturationDelta`**。
- **可選進階視覺補充參數（向下相容 `S1-04` 增量欄位）：**
  - 預合成器輸入簽章為 `composeCatParts(appearance: PetAppearance, options?: ExtendedVisualOptions)`，其中 `options` 可選傳入 `S1-04` 定義之 `coatLength?: 'short' | 'long'`、`noseColor?: PigmentedFeatureColor`、`pawPadColor?: PigmentedFeatureColor`。
  - **向下相容預設回退（當僅具 `S1-03` 基礎 `PetAppearance` 或 Phase B Mock Data 時）：**
    - `coatLength` 未提供時，若 `body` 為 `'large_fluffy' | 'giant_fluffy'` 或 `tail === 'fluffy_plume'` 視為 `'long'`，否則預設 `'short'`。
    - `noseColor` 未提供時，預設 `{ id: 'default_pink', hex: '#D98E88', secondaryHex: null }`；若 `coatPattern === 'colorpoint'` 預設海豹鼻 `{ id: 'default_seal', hex: '#4A3728', secondaryHex: null }`。
    - `pawPadColor` 未提供時，沿用 `noseColor` 之 `hex` 與 `secondaryHex ?? null`（正規化省略欄位 `undefined` 為 `null`）。

### 1.2 Phase B 嚴格邊界重申（對齊 `Master PRD v2.1.31` §7／§8.B.3 與 `PHASE-B-SPEC-MAP.md`）

1. **正式 `AnimationId` 交付範圍：** Phase B Rive 主動畫軌（Track 1）**僅實作 6 支 P0-B 正式動作**（`idle`、`walk`、`sit`、`sleep`、`eat`、`pet`）。`P0-C`（`cat_loaf`、`play`）與 `P1`（`drag`、`drop`、`landing`、`turn_back_angry`、`sniff_and_turn_away`、`crouch_alert`、`side_sleep`）共 9 支正式動作一律留待 **Phase C**。
2. **渲染層本地過渡節點分離：** `run_chase`、`jump_prep`、`jump_air`、`land_squash` 與 `turn_25d_parallax` 僅透過 `CatMainSM` 的本地物理 Input（`localMotionIndex`、`turnDir`）驅動，**嚴禁新增或污染 `packages/contracts/src/behavior.ts` 的 `ANIMATION_IDS` 正式枚舉**。

[↑ 回到頂部](#top)

---

<a id="sec-2"></a>

## 二、`SHINUAN-B1-02`｜3 層動態預合成器像素公式與快取契約

### 2.1 資產命名映射與 Phase B 測試貓變體規則

預合成器依 `<part_id>__<variant_id>__<layer>.png`（`1024 × 1024 px` 32-bit RGBA sRGB）載入底圖：

| 邏輯零件 | `PetAppearance` 決定欄位 | Phase B 測試貓唯一變體 | 所需原始 PNG 圖層 |
| --- | --- | --- | --- |
| `head` | `appearance.head` | `flat_face` | `fur_base` ＋ `mask_<pattern>`（按花色）＋ `linework` |
| `ear_L` / `ear_R` | `appearance.ears` | `small_round` | `fur_base` ＋ `linework`（含粉紅耳窩 `#E8A6A0`） |
| `eye_socket_L` / `R` | `appearance.eyes` | `big_round` | `linework`（含純淨眼白 `#FBF9F5`，不進入毛色管線） |
| `eye_iris_L` / `R` | `appearance.pupilColor` | `standard` | `base`（灰階虹膜）＋ `pupil_highlight`（黑瞳孔＋白高光） |
| `nose` | `options.noseColor` | `standard` | `base`（灰階鼻）＋ `linework` |
| `body_torso` | `appearance.body` | `chubby` | `fur_base` ＋ `mask_<pattern>`（按花色）＋ `linework` |
| `chest_ruff`（選配） | `options.coatLength === 'long'` | `fluffy`（Phase B 可空透明圖） | `fur_base` ＋ `linework` |
| `arm_L` / `arm_R` | `appearance.body` | `standard` | `fur_base` ＋ `linework` |
| `paw_pad_L` / `R` | `options.pawPadColor` | `standard` | `base`（＋花肉球時選疊 `mottle_mask`，完整檔名 `paw_pad__standard__mottle_mask.png`，對應美術規範 §2 簡稱 `paw_pad_mottle_mask.png`） |
| `leg_L` / `leg_R` | `appearance.body` | `standard` | `fur_base` ＋ `linework` |
| `tail` | `appearance.tail` | `short_bobtail` | `fur_base` ＋ `linework` |

> **Phase B 未知變體安全回退：** 在 Phase B 僅具單一測試貓變體期間，若輸入之 `PetAppearance` 指定尚未產圖的品種變體（例如 `square_muzzle`、`folded_tip`、`giant_fluffy`），資產解析器必須記錄警告並**確定性回退至測試貓基準變體**（`flat_face` / `small_round` / `big_round` / `chubby` / `short_bobtail`），絕不拋出未捕捉例外或顯示破圖。

### 2.2 跨平台確定性像素混合公式（RN Skia / Android Bitmap / iOS CoreGraphics 唯一標準）

為確保三端渲染色差 `ΔRGB <= 1`（8-bit 通道四捨五入容忍值），全部平台一律實作以下逐像素（sRGB 歸一化至 `[0.0, 1.0]`，非預乘 Alpha 計算後再輸出 RGBA）公式：

#### A. 帶毛零件 3 層合成（`head`、`ear_L/R`、`body_torso`、`chest_ruff`、`arm_L/R`、`leg_L/R`、`tail`）

前置不變量：`fur_base` 必須經 §6 後製為 `Saturation = 0` 且亮度落於 `L_fur ∈ [0.58, 0.94]`，標準高光基準常數鎖定為 **`L_REF = 0.88`**。

1. **步驟 1 — 計算粉彩明暗增益（純白防發灰核心）：**
   ```text
   L_fur = fur_base.r          // 因 Saturation=0，r == g == b ∈ [0, 1]
   a_fur = fur_base.a
   shade = clamp(L_fur / 0.88, 0.0, 1.0)
   ```
   - 當 `primaryHex = #FAF6F0`（顯性純白）且 `L_fur = 0.88~0.93` 時，`shade = 1.0` 完整保留純白透亮，僅在臉頰與下巴陰影（`L_fur ≈ 0.62~0.80`）呈現柔和暖灰繪本立體感，**徹底杜絕純白貓發灰變髒**。
2. **步驟 2 — Layer 1 主毛色著色：**
   ```text
   C_out = primaryRGB * shade
   ```
3. **步驟 3 — Layer 2 花色柔邊遮罩合成（嚴格受 `a_fur` 裁切，零溢出色塊）：**
   - 令 `a_mask(M)` 為遮罩 `M` 之 Alpha 通道（`[0, 1]`），`lerp(A, B, t) = A * (1 - t) + B * t`：

   | `appearance.coatPattern` | 合成公式（僅於 `a_fur > 0` 生效） | 適用零件 |
   | --- | --- | --- |
   | `'solid'` | 不疊遮罩（維持 `C_out`） | 全部 |
   | `'colorpoint'` | `C_sec = (secondaryRGB ?? primaryRGB) * shade`<br>`C_out = lerp(C_out, C_sec, a_mask(colorpoint) * 0.85)` | `head`、`ear_L/R`、`arm_L/R`、`leg_L/R`、`tail` |
   | `'tabby_mackerel'` | `C_stripe = (secondaryRGB ?? primaryRGB * 0.72) * shade`<br>`C_out = lerp(C_out, C_stripe, a_mask(tabby_mackerel) * 0.78)` | `head`、`body_torso`、`arm_L/R`、`leg_L/R`、`tail` |
   | `'bicolor_tuxedo'` | `C_white = hex(#FAF6F0) * shade`<br>`C_out = lerp(C_out, C_white, a_mask(bicolor_tuxedo) * 0.95)` | `head`、`body_torso`、`arm_L/R`、`leg_L/R` |
   | `'calico'` | `C_base_w = hex(#FAF6F0) * shade`<br>`C_a = primaryRGB * shade`；`C_b = (secondaryRGB ?? hex(#2E2E2E)) * shade`<br>`C_out = lerp(C_base_w, C_a, a_mask(calico_patch_a) * 0.92)`<br>`C_out = lerp(C_out, C_b, a_mask(calico_patch_b) * 0.92)`<br>*(註：`patch_a` 與 `patch_b` 依規格互不重疊；未覆蓋處呈現柔和白底 `#FAF6F0`)* | `head`、`body_torso`、`ear_L/R`、`tail` |
   | `'tortoiseshell'` | `C_b = (secondaryRGB ?? hex(#2E2E2E)) * shade`<br>`C_out = lerp(C_out, C_b, a_mask(calico_patch_b) * 0.88)`<br>*(不鋪白底，直接以主色與互補深色交織)* | `head`、`body_torso`、`ear_L/R`、`tail` |
   | `'starry_rare'` | 保留既有底色 `C_out`，疊加星塵微光 `C_star = hex(#FFF7DC)`：<br>`C_out = lerp(C_out, 1 - (1 - C_out) * (1 - C_star), a_mask(starry_rare) * 0.85)`（Screen 濾色） | `head`、`body_torso`、`tail` |

   - 若某次要零件尚未備妥專屬 `mask_<pattern>`，該零件安全略過 Layer 2 維持 `C_out`（不得報錯中斷）。
4. **步驟 4 — Layer 3 線稿與高光覆蓋（永不染色紅線）：**
   ```text
   // 以標準 Porter-Duff SrcOver 將 linework (C_line, a_line) 疊於 (C_out, a_fur) 之上
   a_final = a_line + a_fur * (1 - a_line)
   if (a_final > 0):
     C_final = (C_line * a_line + C_out * a_fur * (1 - a_line)) / a_final
   else:
     C_final = (0, 0, 0)
   ```
   - `linework` 的暖深棕 `#3A281E` 與內耳粉紅 `#E8A6A0` **完全繞過步驟 1～3**，100% 保留手繪繪本溫度。

#### B. 五官專屬合成（虹膜、鼻頭、肉球）

1. **虹膜（`eye_iris_L` / `eye_iris_R`）：**
   - 依 `appearance.pupilColor` 查表取得左右眼色（固定常量，不得隨機漂移）：

   | `appearance.pupilColor` | `eye_iris_L`（左眼 HEX） | `eye_iris_R`（右眼 HEX） |
   | --- | :---: | :---: |
   | `'amber'` | `#D89438` | `#D89438` |
   | `'emerald'` | `#6EA86B` | `#6EA86B` |
   | `'sapphire'` | `#5C95C9` | `#5C95C9` |
   | `'copper'` | `#B86B32` | `#B86B32` |
   | `'heterochromia_blue_gold'` | **`#5C95C9`（藍）** | **`#D89438`（金）** |

   - 以 `shade_iris = clamp(L_iris / 0.88, 0.0, 1.0)` 染 `eye_iris__standard__base.png` 後，再將 `eye_iris__standard__pupil_highlight.png` 以 `SrcOver` 覆蓋於上層，確保黑瞳孔 `#1F1916` 與純白高光點 `#FFFFFF` 永遠純淨不被染黃。
2. **鼻頭（`nose`）與肉球（`paw_pad_L` / `paw_pad_R`）：**
   - 灰階底圖以相同 `shade = clamp(L / 0.88, 0.0, 1.0)` 乘上 `noseColor.hex` / `pawPadColor.hex`；若存在非空 `secondaryHex`（`secondaryHex != null`，即非 `null` 且非 `undefined`，代表花鼻／花肉球），再依花斑遮罩線性混合 `secondaryHex * shade`；鼻頭最後疊上 `nose__standard__linework.png`（`SrcOver`）。

### 2.3 效能、快取與三端復用契約

1. **一次性預合成與快取鍵：**
   - 計算確定性快取鍵：`cacheKey = sha256(canonicalJson({ appearance, coatLength, noseColor, pawPadColor, compositorVersion: 'v1' }))`（強制採固定鍵排序之 canonical JSON 序列化，且 `undefined` 欄位一律先正規化為 `null`，確保 JS / Kotlin / Swift 跨橋接層計算雜湊 100% 一致）。
   - 僅於領養換色、初次啟動或 `cacheKey` 變更時觸發預合成；之後直接重用快取之全部動態零件槽位 RGBA 點陣圖（每影格著色開銷為 **`0 ms`**）。
2. **耗時門檻（對齊 `ADR-001` §3）：**
   - 於中階行動裝置或本機 Node／Skia 基準環境下，單次完整預合成（含縮放至執行期目標解析度 `512×512` 注入 Rive，原始母片維持 `1024×1024`）總耗時須 **`< 20 ms`**。
   - **iOS Widget 靜態快照復用：** 預合成完成時同步輸出 1 張組合態靜態貓咪 PNG 至 `App Groups` 共享容器，供 iOS SwiftUI Widget 直接呈現（零重複著色邏輯）。

[↑ 回到頂部](#top)

---

<a id="sec-3"></a>

## 三、`SHINUAN-B2-01`｜Rive `.riv` 槽位命名與 `CatMainSM` 狀態機輸入契約

### 3.1 Artboard 與 Image Data Binding 資產槽位命名表

- **唯一主檔名：** `shinuan_cat_core.riv`
- **唯一主 Artboard 名稱：** `ShinuanCatRoot`（畫布尺寸 `1024 × 1024`，對齊 [PHASE-B-2D-ART-PIPELINE-SPEC.md](PHASE-B-2D-ART-PIPELINE-SPEC.md) §1 錨點座標：`pelvis (512, 690)`、`neck (512, 520)`、`ear_L/R (340, 225)/(684, 225)`、`eye_L/R (418, 395)/(606, 395)`、`nose/mouth (512, 445)`、`tail (675, 765)`）
- **外部動態替換 Image Asset 槽位命名表（透過 Rive Image Data Binding / `FileAssetDelegate` 注入，全小寫蛇形嚴格鎖定）：**

| 槽位名稱（Asset Name） | 注入來源（來自 `B1-02` 預合成器） | 備註 |
| --- | --- | --- |
| `slot_head` | 合成後 `head` RGBA | 掛載於 `head` 骨骼，位於眼眶裁切層下方 |
| `slot_ear_L` / `slot_ear_R` | 合成後 `ear_L` / `ear_R` RGBA | 掛載於 `ear_L` / `ear_R` 骨骼（轉身反向視差） |
| `slot_eye_socket_L` / `slot_eye_socket_R` | `eye_socket_L` / `R` RGBA | 受 `eye_clip_L` / `eye_clip_R` 動態裁切遮罩控制（鐵律 A） |
| `slot_eye_iris_L` / `slot_eye_iris_R` | 染色＋瞳孔高光合成後 `eye_iris_L` / `R` RGBA | 受眼眶 Clipping Path 裁切並由 `lookX` / `lookY` 驅動；**左右眼獨立槽位永不互換** |
| `slot_nose` | 合成後 `nose` RGBA | 掛載於五官前向視差層 |
| `slot_body_torso` | 合成後 `body_torso` RGBA | 掛載於 `torso` 骨骼 |
| `slot_chest_ruff` | 長毛時注入 `chest_ruff` RGBA；短毛注入 `1×1` 全透明 PNG | 避免短毛模型需維護第二套 `.riv` |
| `slot_arm_L` / `slot_arm_R` | 合成後 `arm_L` / `arm_R` RGBA | 掛載於 `arm_L` / `arm_R` 骨骼 |
| `slot_paw_pad_L` / `slot_paw_pad_R` | 染色後 `paw_pad_L` / `R` RGBA | 掛載於前掌底部（揮爪／抱胸／坐姿切換顯隱） |
| `slot_leg_L` / `slot_leg_R` | 合成後 `leg_L` / `leg_R` RGBA | 掛載於 `leg_L` / `leg_R` 骨骼 |
| `slot_tail` | 合成後 `tail` RGBA | 綁定 `tail_1 → tail_2 → tail_3` 3 節骨骼（Track 2 獨立運作） |

- **內建靜態線稿件（直接打包於 `.riv` 內，不走毛色預合成）：** `eyelid_expr` 5 款線稿（`neutral`、`happy_squint`、`sleep_closed`、`angry_brow`、`sad_droopy`）、`mouth_expr` 4 款（`smile`、`blep_tongue`、`eat_open`、`grumpy_frown`）、`whiskers` 1 組。
- **頭頂圖示錨點：** 導出 Bone / Node 名稱 `status_icon_anchor`，供前端依 `PetViewModel.behavior.iconIds`（`ICON_IDS` 8 種）掛載狀態氣泡。

### 3.2 唯一主 State Machine：`CatMainSM` 全量 Input 變數契約

全三端（React Native `@rive-app/react-native`、Android Kotlin `rive-android`、iOS `rive-ios`）僅透過下表 **12 個標準 Input** 驅動 `CatMainSM`：

| 分層 | Input 名稱 | 型別 | 合法值域／枚舉對應 | 資料來源與驅動權責 |
| --- | --- | :---: | --- | --- |
| **Track 1（主動作）** | `coreAnimIndex` | `Number` | **Phase B 實作（P0-B 6 支）：** `0=idle`, `1=walk`, `2=sit`, `3=sleep`, `4=eat`, `5=pet`<br>**Phase C 保留槽位（Phase B 統一安全回退 `0=idle`）：** `6=cat_loaf`, `7=play`, `8=drag`, `9=drop`, `10=landing`, `11=turn_back_angry`, `12=sniff_and_turn_away`, `13=crouch_alert`, `14=side_sleep` | 唯讀映射 `PetViewModel.behavior.animationId`（嚴格對齊 `ANIMATION_IDS` 順序） |
| **Track 1（狀態旗標）** | `isSleeping` | `Boolean` | `true` / `false` | 唯讀映射 `PetViewModel.display.isSleeping` |
| **Track 1（狀態旗標）** | `isHealthCritical` | `Boolean` | `true` / `false` | 唯讀映射 `PetViewModel.display.isHealthCritical`（僅切委屈眼皮與嘴型，不自算數值） |
| **Track 2（獨立尾巴）** | `tailStateIndex` | `Number` | `0=neutral`, `1=question_mark`, `2=question_mark_tremble`, `3=slow_sway`, `4=fast_whip`, `5=tucked_drooped`, `6=curled_sleep`, `7=puffed_alert` | 唯讀映射 `PetViewModel.behavior.tailState`（嚴格對齊 `TAIL_STATES` 順序） |
| **Track 3（表情線稿）** | `eyelidExprIndex` | `Number` | `0=neutral`, `1=happy_squint`, `2=sleep_closed`, `3=angry_brow`, `4=sad_droopy` | 由渲染層依 `coreAnimIndex` + `isSleeping` + `isHealthCritical` 決定對應眼皮線稿（配合鐵律 A 裁切） |
| **Track 3（表情線稿）** | `mouthExprIndex` | `Number` | `0=smile`, `1=blep_tongue`, `2=eat_open`, `3=grumpy_frown` | 同上（例如 `eat`→`2`、`isHealthCritical`→`1`、正常→`0`） |
| **Track 3（自然眨眼）** | `blinkTrigger` | `Trigger` | 單次觸發 | 渲染層於清醒狀態每 `3~6 秒` 隨機觸發（僅驅動眼眶 Clipping Path 收合） |
| **Track 4（本地互動）** | `lookX` | `Number` | `[-1.0, +1.0]`（對應眼球水平位移 `±9px`） | 手指／游標追蹤，超出範圍強制 `clamp` |
| **Track 4（本地互動）** | `lookY` | `Number` | `[-1.0, +1.0]`（對應眼球垂直位移 `±6px`） | 手指／游標追蹤，超出範圍強制 `clamp` |
| **Track 4（鐵律 B 轉身）** | `turnDir` | `Number` | `[-1.0, +1.0]`（`-1`=朝左、`0`=正面、`+1`=朝右） | 依本地移動方向平滑插值，驅動 2.5D 球面視差（**非 `scaleX` 翻面**） |
| **Track 4（摸頭彈性）** | `petTilt` | `Number` | `[-1.0, +1.0]` | 摸頭手勢水平位移驅動 `head` Spring Physics 彈性傾斜 |
| **Track 4（本地物理過渡）** | `localMotionIndex` | `Number` | `0=none`, `1=run_chase`, `2=jump_prep`, `3=jump_air`, `4=land_squash` | 僅供本地座標位移／桌面跳台物理過渡，**不修改也不回寫 `GameCore` `AnimationId`** |

[↑ 回到頂部](#top)

---

<a id="sec-4"></a>

## 四、渲染雙鐵律（A／B）實作約束與降級防呆

1. **鐵律 A — 眼眶 Clipping Path 裁切（嚴禁單色塊遮額頭）：**
   - `CatMainSM` 中所有眨眼（`blinkTrigger`）、瞇眼（`happy_squint`）、熟睡（`sleep_closed`）、斜眉／委屈眼皮，必須以 Rive **Vector Clipping Path（`eye_clip_L`、`eye_clip_R`）** 動態縮放 `slot_eye_socket_L/R` 與 `slot_eye_iris_L/R` 之可見區域，並於裁切邊緣僅疊加 `#3A281E` 線稿。
   - **禁止事項：** 嚴禁在額頭或眼眶上方擺放任何填色矩形／弧形遮罩去蓋住眼睛。
2. **鐵律 B — 2.5D 球面視差轉身（嚴禁 `scaleX: +1 → 0 → -1` 紙片翻面）：**
   - 連續調整 `turnDir` 由 `-1.0` 至 `+1.0` 時：
     - `root`、`pelvis`、`torso`、`head` 之水平縮放 `scaleX` 必須恆滿足 **`scaleX >= 0.90`（永不壓扁至 `0` 或翻成負值）**。
     - 五官層依 `turnDir` 朝行進側前向平移（鼻嘴位移略大於眼眶，遠側眼眶寬度微縮約 `9%`）；`ear_L/R` 往反方向微退；`tail` 錨點於軀幹後方平滑繞移；跨中線瞬間施加輕微彈性微蹲（`scaleX ≈ 1.07, scaleY ≈ 0.94`）。
     - **異色瞳不變量：** `slot_eye_iris_L`（左藍）與 `slot_eye_iris_R`（右金）在整個 `turnDir ∈ [-1, +1]` 區間內永遠維持各自槽位與顏色，絕不鏡像對調。
3. **未知與空值安全降級：**
   - 傳入未實作之 Phase C `coreAnimIndex`（`6..14`）或非法負值／超界值時，狀態機轉移規則必須安全回退至 `0 (idle)`，並保持 `tailStateIndex` 獨立運作不閃退。
   - 若 `PetViewModel.behavior.iconIds` 為空陣列，`status_icon_anchor` 隱藏氣泡；若有值則依陣列順序呈現對應圖示，嚴禁 UI 層自判門檻補塞圖示。

[↑ 回到頂部](#top)

---

<a id="sec-5"></a>

## 五、獨立 QA 驗收測試清單（`TC-B1-01` ～ `TC-B2-03`）

| 測項 ID | 所屬小單 | 驗證目標與斷言條件 |
| --- | :---: | --- |
| **`TC-B1-01`** | `SHINUAN-B1-02` | **線稿零染色不變量：** 對同一組 `head` 資產分別以 `#F7E2BC`（奶油）、`#5C3D2E`（海豹棕）、`#9EABB8`（藍灰）執行預合成：（1）抽樣完全不透明線稿核心像素（`a_line === 1.0`，即 8-bit `alpha === 255`），驗證輸出色彩恆貼近 `#3A281E`（色差 `ΔRGB <= 3`）；（2）抽樣半透明羽化線稿邊緣像素（`0 < a_line < 1.0`），驗證輸出與非預乘 `SrcOver(C_line, C_out)` 理論值誤差 `ΔRGB <= 1`，確認 `C_line` 絕不受毛色染色汙染。 |
| **`TC-B1-02`** | `SHINUAN-B1-02` | **純白貓防發灰檢核：** 以 `primaryHex = #FAF6F0`、`coatPattern = 'solid'` 合成 `head` 與 `body_torso`，驗證核心高光區（原 `L_fur >= 0.88`）輸出亮度 `L_out >= 0.94`，且不出現整體暗沉發灰；同時驗證未二次套用 `lightnessDelta`/`saturationDelta`。 |
| **`TC-B1-03`** | `SHINUAN-B1-02` | **七大圖層與異色瞳相容合成：** 依序合成 `solid`、`colorpoint`、`tabby_mackerel`、`bicolor_tuxedo`、`calico`、`tortoiseshell`、`starry_rare` 共 7 種花色與 `heterochromia_blue_gold`，驗證 `slot_eye_iris_L` 主色為 `#5C95C9`、`slot_eye_iris_R` 主色為 `#D89438`、高光點維持純白 `#FFFFFF`，且所有遮罩像素嚴格裁切於 `a_fur > 0` 範圍內。 |
| **`TC-B1-04`** | `SHINUAN-B1-02` | **效能與快取基準：** 完成單隻測試貓全部需合成之動態零件槽位（對齊 §2.1／§3.1 完整組裝組，執行期目標 `512×512`）連續 20 次中位數耗時 **`< 20 ms`**；相同 `cacheKey` 重複呼叫命中快取且 `0 ms` 重新計算。 |
| **`TC-B2-01`** | `SHINUAN-B2-01` | **鐵律 A（眼皮 Clipping Path）：** 於重點色、虎斑與三花 3 種多色額頭上切換 `eyelidExprIndex = 0..4` 與觸發 `blinkTrigger`，確認額頭花紋連續完整、零單色塊接縫。 |
| **`TC-B2-02`** | `SHINUAN-B2-01` | **鐵律 B（2.5D 轉身＋異色瞳保護）：** 連續掃描 `turnDir` 自 `-1.0 → 0.0 → +1.0`，驗證全過程 `scaleX >= 0.90` 無紙片翻面，且藍金異色瞳左藍右金位置始終正確不對調。 |
| **`TC-B2-03`** | `SHINUAN-B2-01` | **Phase B 動作範圍與安全降級：** 驗證 `coreAnimIndex = 0..5`（6 支 P0-B）與 `tailStateIndex = 0..7`（8 種尾巴軌）獨立平行運作流暢；傳入 Phase C 保留值 `6..14`（含 `8=drag`）時確定性安全回退 `0 (idle)` 零崩潰，且 `packages/contracts` 與 `packages/game-core` 零修改。 |

[↑ 回到頂部](#top) ｜ [← 回到 Phase B 拆解地圖](PHASE-B-SPEC-MAP.md)
