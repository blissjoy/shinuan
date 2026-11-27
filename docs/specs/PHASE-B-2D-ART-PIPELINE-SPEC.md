<a id="top"></a>

# Phase B 美術工程規範｜2D 手繪粉彩貓咪「12 零件紙娃娃拆圖 ＋ 3 層動態著色 ＋ AI 雙錨點逐件指令包」

> **導覽與追溯：** [← 回到規格入口](README.md#phase-b) ｜ [手機 UI/UX 與桌面 App 跳台設計](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) ｜ [Phase A 規格地圖](PHASE-A-SPEC-MAP.md) ｜ [Master PRD v2.1.31](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ADR-001 動畫引擎 Rive](../decisions/ADR-001-animation-engine-rive.md) ｜ [ADR-002 雙平台橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md)

- **文件性質：** Phase B 2D 美術與前端渲染對接規格書（2026-11-26 PO 定調採用 2D 粉彩紙娃娃骨骼動畫路線；2026-11-27 經 Warfront 1 實測驗證升級為 v2 實戰定版）
- **風格基準（Style North Star）：** PO 手繪粉彩繪本風格原型圖（已封存於 `D:\Dropbox\ai-bridge\shinuan\tasks\SHINUAN-S1-04\prototype\assets\{dad_exotic_seal.jpg, mom_exotic_cream.jpg}`）
- **對應規格基準：** `Master PRD v2.1.31`（§3.1、§5.2 `PetViewModel`、§8.A.1～§8.A.5、§8.B.3 動畫矩陣）、`ADR-001`（Rive 動畫引擎）
- **核心原則：** **「1 套靜態 2D 零件底圖 ＋ 1 套共用 2D 骨骼動畫（Rive）＋ 100% 程式即時換色與互動」**——零逐格手繪成本，6 大品種與上萬種真實基因毛色共用同一套動畫檔，且 100% 保留手繪粉彩繪本溫度。

---

## 一、畫布、錨點與檔案命名規範（讓所有零件一拼就對齊）

1. **標準畫布尺寸：** 統一使用 **`1024 × 1024 px` 透明背景 PNG（RGBA 32-bit, sRGB）**。
2. **統一錨點基準框（Guide Box）：**
   - 身體中心（`pelvis` 骨盆錨點）：`(512, 690)`
   - 頭頸接點（`neck` 樞軸）：`(512, 520)`
   - 左／右耳根接點：`(340, 225)` / `(684, 225)`
   - 左／右眼眶中心：`(418, 395)` / `(606, 395)`（瞳孔獨立置於此中心點，供程式做手指／游標即時追蹤！）
   - 鼻頭與嘴中心：`(512, 445)`
   - 尾根接點：`(675, 765)`
3. **檔案命名規則：** `<part_id>__<variant_id>__<layer>.png`
   - 範例：`head__flat_face__fur_base.png`、`head__flat_face__linework.png`、`head__flat_face__mask_colorpoint.png`

---

## 二、3 層分離標準（徹底解決「換色變髒、線稿被洗糊」的根本解）

每一個**帶毛皮的零件**（頭、耳、身、四肢、尾巴）都嚴格拆成以下 3 層獨立 PNG，由程式在初始化／領養完成時一次性合成後透過 Rive Image Data Binding 注入（詳見 [ADR-001](../decisions/ADR-001-animation-engine-rive.md)）：

| 圖層代碼 | 名稱 | 內容規範 | 程式如何處理 |
| --- | --- | --- | --- |
| **`fur_base`** | 灰階粉彩毛底層 | **純無彩色灰階（飽和度 = 0）**，含細膩粉彩毛流筆觸與柔和立體陰影，亮度區間嚴格控制在 **`L = 0.58 ~ 0.94`**（不可出現死黑或死白，才能染出乾淨的莫蘭迪粉彩／奶油／深海豹色與純白不發灰）。 | 程式以 `Multiply / Soft-Light` 乘上基因主色 `colorParams.primaryHex`（並套用 `±8%` HSL 微調）。 |
| **`mask_<pattern>`** | 柔邊花色遮罩層 | **純白（`#FFFFFF`）＋ 帶毛流羽化之 Alpha 透明度**，標記重點色臉罩、虎斑條紋、賓士白胸白手套、三花橘塊／黑塊或星空斑點區域。 | 程式讀取 `coatPattern` 與 `coatGenotype`，將遮罩染上 `secondaryHex`／純白 `#FAF6F0`／橘黑雙色塊並疊在 `fur_base` 上（受 `fur_base` Alpha 裁切且保留毛流陰影），**邊緣自然毛茸茸、絕不出現幾何硬邊**。 |
| **`linework`** | 手繪線稿與高光層 | **暖深棕手繪外框線（約 `#3A281E`）、鬍鬚、眼睛高光白點、粉紅內耳耳窩（`#E8A6A0`）、手繪漫畫表情小線條**（透明底）。 | **永遠不進入毛色染色管線！** 永遠蓋在最上層，100% 保留原圖的繪本靈魂與立體感。 |

> **鼻頭、虹膜與肉球專屬細分規則：**
> - `nose_base.png` 與 `paw_pad_base.png` 同樣採純灰階底圖，由程式直接乘上 `PetGenetics.noseColor.hex` 與 `pawPadColor.hex`（花肉球另疊 `paw_pad_mottle_mask.png` 乘 `secondaryHex`）。
> - `eye_iris` 強制再細分為 **灰階虹膜圓環（`eye_iris__standard__base.png`）** 與 **黑瞳孔＋純白高光點（`eye_iris__standard__pupil_highlight.png`）** 兩層，確保程式將虹膜獨立染成琥珀／綠／藍／古銅／藍金異色瞳時，高光白點永遠純白不被染黃、瞳孔永遠深邃不偏色。

---

## 三、12 大模組化零件清單（BOM）與 Phase B MVP 最低出圖量

### 3.1 Phase B 必做零件總表（先求 1 隻「測試貓」全動起來，再平行擴充其他品種）

| # | 零件 ID | 對應基因欄位 | Phase B 測試貓必做數 | Phase C 全 6 品種總變體 | 說明 |
| --- | --- | --- | :---: | :---: | --- |
| 1 | `head` | `appearance.head` | **1**（加菲 `flat_face`） | **4**（`standard_round`、`chubby_round`、`flat_face`、`square_muzzle`） | 決定品種第一眼辨識度（扁臉／圓臉／緬因方嘴） |
| 2 | `ear_L` / `ear_R` | `appearance.ears` | **1 對**（`small_round`） | **4 對**（`pointed_medium`、`small_round`、`tufted_large`、`folded_tip`） | 獨立插槽件，綁定單一耳骨可隨摸頭壓耳、警戒豎耳與轉身視差微移 |
| 3 | `eye_socket` | `appearance.eyes` | **1 對**（`big_round`） | **3 對**（`almond`、`big_round`、`droopy_cute`） | 暖深棕眼眶外框＋柔和米白眼白底（`#FBF9F5`） |
| 4 | `eye_iris` | `appearance.pupilColor` | **1 顆灰階虹膜 ＋ 1 層瞳孔高光**（左右共用） | **1 組**（全品種共用） | **左右眼各自獨立染色**，1 張灰階圖就能變出琥珀／綠／藍／古銅與**藍金異色瞳**，並由程式追蹤游標與手指 |
| 5 | `eyelid_expr` | 行為與情緒狀態 | **5 款**（自然／開心瞇眼／熟睡閉眼／傲嬌斜眉／委屈下垂眉） | **6 款**（加打瞌睡半瞇） | **配合眼眶 Clipping Path 僅疊線稿，嚴禁實心色塊遮蓋額頭**（見 §4.3） |
| 6 | `nose` | `genetics.noseColor` | **1 個灰階鼻 ＋ 線稿** | **1 組**（全品種共用） | 程式直接染粉紅／磚粉／海豹棕／藍灰／黑／花鼻 |
| 7 | `mouth_expr` | 行為與情緒狀態 | **4 款**（標準微笑 `:3`／委屈吐舌／張嘴吃飯／傲嬌倒 V 撇嘴） | **6 款**（加哈氣生氣、打哈欠） | 與 `eyelid_expr` 自由排列組合出數十種生動神態 |
| 8 | `whiskers` | 固定裝飾層 | **1 對** | **1 對**（全品種共用） | 獨立線稿不染色，摸頭與生氣時隨微動畫震動 |
| 9 | `body_torso` | `appearance.body` ＋ `coatLength` | **1**（`chubby`） | **5**（`normal`、`chubby`、`short_legs`、`large_fluffy`、`giant_fluffy`） | 長毛 `l/l` 另掛選配胸毛領巾件 `chest_ruff_fluffy.png` |
| 10 | `arm_L` / `arm_R` | `appearance.body` | **1 對 ＋ 肉球底** | **2 對**（標準腿／曼赤肯短腿，其餘由骨骼微縮放共用） | 含 `paw_pad` 獨立小圖，可做抱胸、揮爪、走路擺臂 |
| 11 | `leg_L` / `leg_R` | `appearance.body` | **1 對** | **2 對**（標準腿／曼赤肯短腿） | 走路、坐下、母雞蹲、起跳與拎起踢腳切換 |
| 12 | `tail` | `appearance.tail` | **1 條**（`short_bobtail`，可選加 `long_straight`） | **4 條**（`long_straight`、`fluffy_plume`、`short_bobtail`、`kinked_kirin`） | 綁 3～4 節骨骼，獨立運作全部 8 種尾巴情緒動作 |

### 3.2 花色遮罩共用表（只要畫 1 套，套用全部品種與基因！）

- `mask_colorpoint.png`（重點色臉罩、耳尖、手腳尖、尾尖柔邊暈染）
- `mask_tabby_mackerel.png`（額頭 M 字＋臉頰與身體背側柔和虎斑條紋）
- `mask_bicolor_tuxedo.png`（臉頰柔邊倒 V 白斑＋胸前圍兜與四隻白襪）
- `mask_calico_patch_a.png` ＋ `mask_calico_patch_b.png`（兩組互不重疊不規則柔邊色塊，搭配白斑即為三花、不疊白斑即為玳瑁）
- `mask_starry_rare.png`（稀有星空點點微光遮罩）

---

## 四、Rive 骨骼結構、程式互動分工與實測渲染鐵律

### 4.1 共用單一 2D 骨架樹（全品種共用同一套 `.riv` 動作檔）

```text
root (地面影與整體縮放：小／中／大)
 └── pelvis (骨盆：控制走路上下彈跳、起跳蓄力 Squash & Stretch、呼吸縮放)
      ├── tail_1 -> tail_2 -> tail_3 (獨立動畫軌 Track 2：8 種尾巴情緒 ＋ 轉身身後繞移)
      ├── leg_L / leg_R (後腿：坐下／走路交替擺動／跳躍／拎起踢腳)
      └── torso (身體主體)
           ├── arm_L / arm_R (前手：抱胸委屈／走路擺臂／撲抓玩耍／吃飯)
           └── neck -> head (頭部樞軸：摸頭彈性跟隨、點頭吃飯、2.5D 轉身視差)
                ├── ear_L / ear_R (壓耳／豎耳微動 ＋ 轉身反向視差)
                ├── eye_clip_L / eye_clip_R (動態眼眶裁切遮罩，見 §4.3 鐵律 A)
                │    └── eye_socket + eye_L_pupil / eye_R_pupil (程式即時驅動追蹤手指)
                ├── eyelid_expr / nose / mouth_expr / whiskers (前向視差層)
                └── status_icon_anchor (程式動態掛載 🐟 💧 ❤️ 💢 💤 🏥 圖示)
```

### 4.2 動畫軌與程式分工表

- **Rive 骨骼動畫檔負責（Phase B P0-B 先做 6 支正式動作）：** `idle`（呼吸微晃＋偶爾眨眼）、`walk`（四肢輪擺＋骨盆微彈）、`sit`（坐姿微搖）、`sleep`（身體壓扁閉眼慢呼吸＋💤）、`eat`（低頭點頭＋張嘴咀嚼）、`pet`（閉眼瞇笑＋頭微仰＋耳微壓），以及 P1 `drag`（拎起微拉長踢腳）；另於 Rive State Machine 提供渲染層本地移動過渡片段（`run_chase`、`jump_prep`、`jump_air`、`land_squash`，**僅屬渲染層物理過渡，非 `Master PRD` §8.B.3 `PetViewModel.behavior.animationId` 正式枚舉**，邊界切分詳見 [PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md](PHASE-B-MOBILE-UIUX-OVERLAY-DESIGN.md) §4）。
- **程式（React Native / Kotlin / Swift 渲染層）即時負責：**
  1. 唯讀接收 `PetViewModel` 切換主動畫軌（Track 1：`animationId`）與獨立尾巴軌（Track 2：`tailState`）；
  2. 讀取 `PetAppearance` 與 `colorParams`，依 [ADR-001](../decisions/ADR-001-animation-engine-rive.md) 一次性預合成 3 層著色點陣圖並注入 Rive Image Data Binding；
  3. **眼球追蹤與摸頭物理：** 手指移動時將眼球偏移限制在眼眶圓內（`±6px`～`±9px`）；摸頭時依手指水平位移驅動 `head` 骨骼彈性傾斜（Spring Physics）＋噴出 ❤️ 粒子與呼嚕音效；
  4. **Android 懸浮窗互動：** 拎起切 `drag` 姿勢，放開依重力掉落，高度 > 25% 螢幕送出 `TriggerLanding` 指令給 `GameEngine`。

### 4.3 PoC 實證鎖定之兩大前端／Rive 渲染鐵律（2026-11-26 實測修訂）

> 以下兩條規則皆由 Warfront 1 互動原型實測暴露問題並完成驗證，**Phase B Rive 綁骨與渲染實作必須 100% 遵守**：

1. **鐵律 A — 眼皮一律採「眼眶 Clipping Path 裁切遮罩 ＋ 獨立線稿」，嚴禁單色塊覆蓋額頭：**
   - **禁止做法：** 在眼眶上半部疊加單一純色（如 `primaryHex`）矩形／弧形作為傲嬌斜眼皮、委屈眼皮或眨眼遮罩——在重點色（深棕額頭）、虎斑（M 字紋）或三花貓臉上會立刻暴露色塊接縫（「眉毛貼膠帶」破綻）。
   - **唯一正確做法：** 先繪製完整 3 層著色頭部毛皮，再對 `eye_socket` 與 `eye_iris` 套用動態 **Clipping Path（可見眼裂視窗）**，並**只在裁切邊緣疊加 `#3A281E` 暖深棕上眼皮線稿**。眼皮上方透出的永遠是底層 100% 真實粉彩毛皮與花色紋理。
2. **鐵律 B — 左右轉身一律採「Live2D / Rive 2.5D 球面視差轉身」，嚴禁 `scaleX: +1 → 0 → -1` 紙片翻面：**
   - **禁止做法：** 轉向時將整隻貓的 `scaleX` 由 `+1` 連續壓縮至 `0` 再展開成 `-1`——會呈現「薄紙片翻面」的廉價感，且會把**藍金異色瞳（左藍右金）鏡像對調**。
   - **唯一正確做法：** 身體與頭球永遠保持完整體積（`scaleX` 永不壓扁歸零），改由平滑轉向參數 `turnDir ∈ [-1, +1]` 驅動 4 組 2.5D 視差：
     - **五官前向視差：** 眼眶往行進側平滑偏移、鼻嘴位移幅度略大於眼眶（呈現立體吻部凸度）、遠側眼睛寬度微縮約 `9%`；
     - **雙耳反向視差：** 雙耳位於頭球後方，隨 `turnDir` 往反方向微退並微幅旋傾；
     - **尾巴身後繞移：** 尾巴錨點於軀幹後方平滑由左滑向右（跨中線時自然縮藏於身後，無跳變翻紙感）；
     - **轉身彈性微蹲（Squash-Pop）：** 跨中線瞬間施加輕微 `scaleX ≈ 1.07 / scaleY ≈ 0.94` 彈性回彈增添份量感，且左右眼色永遠正確不對調。

---

## 五、2026-11 AI 產圖實作方案比較 ＋ 雙錨點逐件指令包

### 5.1 AI 產圖實作方式比較（2026 年 11 月官方現況實證）

> **過時工具退場註記（嚴禁再引用）：** Google 舊版 **Imagen（`imagen-3.0-*` / `imagen-4.0-*`）** 已於 2026-08-17 正式下線，改由 Gemini 原生 **Nano Banana** 家族接替；個人版 **Gemini CLI** 已於 2026-06-18 退場，官方接替為 **Antigravity CLI（`agy`）**；OpenAI 亦已全面演進至 **GPT-Image** 家族，不再採用舊版 `DALL-E` 流程。

| 實作方案 | 2026-11 官方工具／模型 | 風格一致性 | 原生真透明 PNG | 定位與實務注意事項 |
| --- | --- | :---: | :---: | --- |
| **方案 1：ChatGPT 網頁版** | ChatGPT Web UI（底層 GPT-Image 系列） | **高**（須嚴守 §5.2 五鐵律） | ⚠️ **不穩**（易畫出假棋盤格） | 零寫程式即刻試跑。**避坑關鍵：嚴禁寫 `transparent background`**，改用純白／純綠幕／純黑底再走 §6 腳本去背。 |
| **方案 2：OpenAI Images API（正式量產首選）** | `gpt-image-2.5-sunburst` / `gpt-image-2.6-sunburst`（高精準）或 `flare`（快版）搭配 `images.edit` | **極高**（程式每次強制帶固定雙參考圖，零對話漂移） | ✅ **原生支援**（`background="transparent"` ＋ `output_format="png"`） | **免去背、零棋盤格**，最適合 PoC 定調後批次量產全 6 品種與全部花色遮罩。 |
| **方案 3：Google AI Studio / Gemini API** | `gemini-nano-banana-2.1` 或 `gemini-3-pro-image` | **極高**（支援最高 **14 張參考圖**同時鎖風格，1K/2K/4K 輸出） | ❌ **無原生 Alpha**（改採純色／綠幕或白黑雙圖差分去背） | 多參考圖鎖畫風極強，可直接與 ChatGPT 做 A/B 盲測。注意 `gemini-nano-banana-2.1` **不支援 `seed` 參數**。 |
| **方案 4：Recraft Studio（V4 Styles）** | Recraft V4 Custom Styles（Raster 模式） | **極高**（上傳 1～10 張建專屬風格藍圖） | ✅ **內建一鍵去背匯出真透明 PNG** | 最適合量產商店罐頭、零食、房間家具與 UI 貼紙套圖；精準鎖輪廓分拆 `linework` 則以方案 2／3 較佳。 |
| **方案 5：本機 ComfyUI + Flux** | ComfyUI Desktop ＋ FLUX.1 `[schnell]`（Apache 2.0 可商用） | **最高** | ✅ 可串去背節點 | ⚠️ **硬體與授權提醒：** 需 **8～12 GB 以上 VRAM**（4 GB 筆電顯卡如 RTX 3050 Laptop 疊掛 ControlNet/IP-Adapter 極易 OOM 或單張耗時 3～10 分鐘）；且 **`FLUX.1 [dev]` 為非商用授權**，正式產品嚴禁誤用。Phase B MVP 採用雲端方案 1～3 即可。 |

### 5.2 確保每次風格絕對一致的 5 條操作鐵律

1. **雙錨點固定參考圖（`Ref A` ＋ `Ref B`）：**
   - **`Ref A`（風格與線條錨點）：** `mom_exotic_cream.jpg`（乾淨無塗鴉、暖深棕手繪色鉛筆線條與毛邊最標準）。
   - **`Ref B`（比例與灰階錨點）：** 下方 **Step 0** 產出並驗收通過之 `ANCHOR_01_master_grayscale_cat.png`。
2. **每產 3 個零件就開「全新對話」（網頁版防漂移鐵律）：** 不依賴多輪記憶；每次送 Prompt 皆重新附上該步驟指定的參考圖。
3. **1 個零件 = 1 張 `1024×1024` 獨立方圖：** 避免將 12 零件硬塞在同一張圖導致單件解析度過低、粉彩毛邊糊化。
4. **「毛底 → 鎖輪廓描線」兩段分離法（已實測像素精準吻合）：** 每個帶毛零件先產 **A 版 `fur_base`（無外框純灰階毛底）** → 驗收存檔後，**將該 A 版圖回傳給 AI** 下 **B 版 `linework` 指令**，強制像素鎖定輪廓只描 `#3A281E` 線稿。
5. **背景色三分法（禁止在無原生 Alpha 之網頁端寫 `transparent background`）：**
   - `fur_base`、`linework`、深色表情件：一律 **純白底 `#FFFFFF`**。
   - 含白色區域件（`eye_socket`、`eye_iris` 高光）：一律 **純綠幕 `#00FF00`**。
   - 花色遮罩（`mask_*`）：一律 **純黑底 `#000000` ＋ 純白柔邊毛觸 `#FFFFFF`**。

### 5.3 Step 0 — 建立全案唯一「比例與灰階總基準圖」（`ANCHOR_01`）

- **上傳參考圖：** `dad_exotic_seal.jpg`（Image 1）＋ `mom_exotic_cream.jpg`（Image 2）
- **存檔名稱：** `ANCHOR_01_master_grayscale_cat.png`（即後續全步驟之 `Ref B`）

```text
Create a 1024x1024 square orthographic 2D front-facing character reference sheet of ONE complete sitting chibi Exotic Shorthair cat, strictly matching the exact hand-drawn colored-pencil and dry-pastel children's picture book art style, proportions (1:1 head-to-body ratio, chubby round cheeks, small rounded ears, plump sitting body, short fluffy tail tucked to the right), fine paper grain, and soft fluffy fur-stroke edges of the uploaded reference images.

CRITICAL REQUIREMENTS:
1. STRICTLY NEUTRAL ACHROMATIC GRAYSCALE ONLY (0% color saturation across the entire image). Every pixel of the cat must be pure neutral gray between hex #949494 (softest shadow) and #EFEFEF (brightest highlight), with soft neutral charcoal outlines (#555555). NO brown, NO yellow, NO pink, NO blue, NO pure black (#000000).
2. Pose: Symmetrical front-facing sitting pose (same neutral sitting posture as Image 2), head centered at the upper half, body centered below, both front paws resting neatly in front, neutral calm open round eyes, neutral tiny cat mouth, NO floating comic doodles or sparkles around the cat.
3. Lighting: Soft diffused flat frontal storybook lighting, NO cast ground shadow, NO harsh shadows, NO 3D glossy shading, NO vector flat look.
4. Background: 100% uniform pure solid flat white background (#FFFFFF), centered with generous empty white margins (at least 10% padding on all four sides). Do NOT draw a checkerboard pattern.
```

### 5.4 12 大模組化零件逐件指令（Phase B 測試貓：`flat_face` 加菲）

> 以下全部統一輸出 **`1024 × 1024`（1:1）**。凡使用 OpenAI Images API 批次呼叫且開啟 `background="transparent"` 時，可將末句純色背景改為依 API 參數輸出真透明；於 ChatGPT 網頁版／Gemini 網頁版則維持下述純色背景寫法。

#### 零件 1：`head`（扁臉加菲頭）
- **1-A `head__flat_face__fur_base.png`**（上傳 `Ref A` ＋ `Ref B`）：
```text
Generate a 1024x1024 square 2D game modular character part: ONLY the isolated front-facing flat-face round Exotic Shorthair cat HEAD fur base, matching the exact head shape, chubby cheeks, and soft hand-drawn colored-pencil/dry-pastel fur brush texture of the uploaded reference images.
STRICT ANATOMY EXCLUSIONS: Include ONLY the fluffy round head silhouette with soft pastel fur shading and gentle cheek volume. COMPLETELY REMOVE ears, eyes, eyelids, nose, mouth, whiskers, neck, and body.
STRICT COLOR & RENDERING RULES: STRICTLY NEUTRAL GRAYSCALE ONLY (0% saturation), brightness strictly between #969696 and #EFEFEF. NO pure black, NO dark outline border around the outer edge (only soft fluffy hand-drawn fur-hair silhouette edge). Centered on 100% pure solid flat white background (#FFFFFF). NO ground shadow, NO checkerboard, NO text.
```
- **1-B `head__flat_face__linework.png`**（上傳 `Ref A` ＋ 剛存檔的 `1-A`）：
```text
Using the uploaded grayscale cat head (head__flat_face__fur_base.png) as an EXACT pixel-locked silhouette guide, generate a 1024x1024 2D linework-only overlay layer.
1. Trace ONLY the outer contour and delicate inner cheek/chin fur tuft strokes of the exact head silhouette—position, scale, and shape must align 100% identically without moving or resizing.
2. Line style: Warm dark-brown hand-drawn colored-pencil outline strictly matching hex #3A281E and the organic textured pencil stroke weight of Ref A.
3. NO fur fill, NO gray shading, NO color fill inside the head—interior and background must be 100% pure solid flat white (#FFFFFF). Still NO ears, eyes, nose, mouth, or whiskers. NO checkerboard, NO shadows.
```

#### 零件 2：`ear_L` / `ear_R`（圓短小耳）
- **2-A `ear_pair__small_round__fur_base.png`**（上傳 `Ref A` ＋ `Ref B`）：
```text
Generate a 1024x1024 square 2D game modular asset: ONE symmetrical pair of small rounded Exotic Shorthair cat ears (left ear on left half, right ear on right half, separated by >=200px empty white space), matching the ear shape and soft colored-pencil/pastel fur texture of Ref B and Ref A. Include ONLY fluffy ear shapes with softly rounded closed base edges for 2D bone rotation. Leave inner ear neutral light gray fur (NO pink yet). STRICTLY NEUTRAL GRAYSCALE ONLY (0% saturation, #969696 to #EFEFEF), NO dark outer outline, NO head. Pure solid flat white background (#FFFFFF), NO shadows, NO checkerboard.
```
- **2-B `ear_pair__small_round__linework.png`**（上傳 `Ref A` ＋ `2-A`）：
```text
Using the uploaded grayscale ear pair as an EXACT pixel-locked silhouette guide, draw ONLY: warm dark-brown hand-drawn colored-pencil outer ear contour (#3A281E) matching Ref A, plus soft pastel muted-pink inner ear hollow (#E8A6A0) with delicate hand-drawn ear fluff strokes along the lower inner edge. Keep exact position and spacing; leave all outer fur areas and background 100% pure solid flat white (#FFFFFF). NO shadows, NO checkerboard.
```

#### 零件 3：`eye_socket`（圓大眼眶＋眼白，⚠️ 純綠幕 `#00FF00`）
- **3 `eye_socket__big_round__linework.png`**（上傳 `Ref A` ＋ `Ref B`）：
```text
Generate a 1024x1024 square 2D game modular facial asset: ONE symmetrical pair of big round cute cat eye sockets matching Ref B's horizontal spacing and Ref A's warm dark-brown colored-pencil eye outline (#3A281E, slightly thicker along upper lash line) with clean soft off-white sclera fill (#FBF9F5) inside each oval. COMPLETELY REMOVE iris, pupil, eyelids, eyebrows, fur, head, nose, and shadows. Background: 100% uniform pure chroma-key neon green (#00FF00) so off-white sclera extracts cleanly. NO green tint on the eyes, NO shadows, NO checkerboard.
```

#### 零件 4：`eye_iris`（單顆灰階虹膜 ＋ 獨立瞳孔高光）
- **4-A `eye_iris__standard__base.png`**（上傳 `Ref A`）：
```text
Generate a 1024x1024 square 2D game modular asset: ONE single circular cat iris disc centered in the canvas (diameter ~520px), in the soft colored-pencil/dry-pastel picture book texture of Ref A. STRICTLY NEUTRAL GRAYSCALE ONLY (0% saturation, #909090 outer rim to #EBEBEB soft lower crescent glow). NO black pupil, NO white highlight, NO eye outline, NO fur. Pure solid flat white background (#FFFFFF), NO shadows, NO checkerboard.
```
- **4-B `eye_iris__standard__pupil_highlight.png`**（上傳 `Ref A` ＋ `4-A`，⚠️ 純綠幕 `#00FF00`）：
```text
Using the uploaded circular iris disc as an exact center and diameter reference, generate a 1024x1024 overlay containing ONLY: one soft-edged round charcoal-black cat pupil (#1F1916, ~55% iris diameter) centered inside, one crisp small round pure-white specular catchlight dot (#FFFFFF) at upper-left, and one tiny secondary white sparkle dot at lower-right. NO iris ring, NO eye outline, NO fur. Background: 100% uniform pure chroma-key neon green (#00FF00), NO green spill, NO checkerboard.
```

#### 零件 5：`eyelid_expr`（5 款純線稿眼皮表情，配合 §4.3 鐵律 A 裁切遮罩）
- **統一上傳：** `Ref A` ＋ 零件 3 `eye_socket__big_round__linework.png`（鎖定左右眼距與寬度）；**全部純白底 `#FFFFFF`、僅繪 `#3A281E` 暖深棕色鉛筆線稿，不含眼白／虹膜／貓毛**：
  - **5-1 `eyelid_expr__neutral__linework.png`：** `symmetrical pair of gentle neutral upper eyelid contour lines`
  - **5-2 `eyelid_expr__happy_squint__linework.png`：** `symmetrical pair of happy closed curved smiling cat eyes (warm arched "^ ^" curves)`
  - **5-3 `eyelid_expr__sleep_closed__linework.png`：** `symmetrical pair of peaceful sleeping closed cat eyes (relaxed downward-curved "u u" strokes)`
  - **5-4 `eyelid_expr__angry_brow__linework.png`：** `symmetrical pair of grumpy slanted upper eyelid curves and furrowed V-angled brow lines matching Ref A`
  - **5-5 `eyelid_expr__sad_droopy__linework.png`**（加附 `dad_exotic_seal.jpg`）：`symmetrical pair of adorable sad droopy eyebrows and softly slanted pleading upper eyelid lines matching dad_exotic_seal.jpg`

#### 零件 6：`nose`（獨立灰階貓鼻 ＋ 線稿）
- **6-A `nose__standard__base.png`**（上傳 `Ref A` ＋ `Ref B`）：
```text
Generate a 1024x1024 square 2D game modular facial asset: ONE single cute small rounded-triangle Exotic Shorthair cat nose centered in the canvas (width ~340px), matching Ref A/Ref B's nose shape and soft colored-pencil texture. STRICTLY NEUTRAL GRAYSCALE ONLY (0% saturation, #9A9A9A to #EFEFEF), soft pastel volume shading, NO pink, NO brown, NO mouth, NO fur, NO dark outline border. Pure solid flat white background (#FFFFFF), NO shadows, NO checkerboard.
```
- **6-B `nose__standard__linework.png`**（上傳 `Ref A` ＋ `6-A`）：
```text
Using the uploaded grayscale cat nose as an EXACT pixel-locked silhouette guide, draw ONLY the delicate warm dark-brown colored-pencil nose outline (#3A281E), two tiny nostril curves, and short vertical philtrum line extending slightly downward. Interior and background 100% pure solid flat white (#FFFFFF), NO mouth, NO fur, NO shading, NO checkerboard.
```

#### 零件 7：`mouth_expr`（4 款獨立嘴型，上傳 `Ref A` ＋ `6-B` 鎖定人中下方比例，輸出不含鼻子與貓毛，純白底 `#FFFFFF`）
- **7-1 `mouth_expr__smile__linework.png`：** `ONLY a sweet gentle neutral smiling cat mouth (":3" soft W-shaped curve) in warm dark-brown colored-pencil strokes (#3A281E)`
- **7-2 `mouth_expr__blep_tongue__linework.png`**（加附 `dad_exotic_seal.jpg`）：`ONLY a cute downturned cat mouth with a tiny soft pastel-pink tongue (#E67B7B) sticking out in the middle, outline #3A281E`
- **7-3 `mouth_expr__eat_open__linework.png`：** `ONLY a cute small open oval eating cat mouth (outline #3A281E, soft muted rose-brown inner mouth #8C4A47, tiny pastel-pink tongue #E67B7B)`
- **7-4 `mouth_expr__grumpy_frown__linework.png`：** `ONLY the iconic grumpy inverted-V cat frown mouth matching Ref A in #3A281E with two tiny soft whisker-pad dot marks on each side`

#### 零件 8：`whiskers`（左右鬍鬚＋眉鬚）
- **8 `whiskers__standard__linework.png`**（上傳 `Ref A` ＋ `Ref B`）：
```text
Generate a 1024x1024 square 2D game modular facial asset containing ONLY a symmetrical set of delicate hand-drawn cat whiskers (3 graceful tapered curved cheek whiskers left, 3 right, plus 2 fine upright eyebrow whiskers above), in warm dark-brown colored-pencil strokes (#3A281E) matching Ref A and Ref B. Leave the center face region completely empty white space—NO head, eyes, nose, mouth, or fur. Pure solid flat white background (#FFFFFF), NO shadows, NO checkerboard.
```

#### 零件 9：`body_torso`（圓胖坐姿身體）
- **9-A `body_torso__chubby__fur_base.png`**（上傳 `Ref A` ＋ `Ref B`）：
```text
Generate a 1024x1024 square 2D game modular character part: ONLY the isolated plump sitting cat TORSO body fur base, matching the chubby pear-shaped sitting torso proportion and soft colored-pencil/dry-pastel fur brush texture of Ref B and Ref A. Smooth rounded closed top dome at the neck for head overlap. COMPLETELY REMOVE head, ears, front arms, back legs, and tail. STRICTLY NEUTRAL GRAYSCALE ONLY (0% saturation, #969696 to #EFEFEF), NO dark outer outline, NO ground shadow. Pure solid flat white background (#FFFFFF), NO checkerboard.
```
- **9-B `body_torso__chubby__linework.png`**（上傳 `Ref A` ＋ `9-A`）：像素鎖定 `9-A` 輪廓僅描暖深棕 `#3A281E` 外框與胸毛微線條（頸頂接縫處留柔淡開放邊），內外純白 `#FFFFFF`。

#### 零件 10：`arm_L` / `arm_R` ＋ `paw_pad`（前手與肉球）
- **10-A `arm_pair__standard__fur_base.png`**（上傳 `Ref A` ＋ `Ref B`）：左右分離對稱圓胖前手（間隔 >=220px），頂端肩關節圓弧封口、底端圓潤三趾肉爪，純無彩色灰階 `#969696~#EFEFEF`，無外框、無軀幹、純白底 `#FFFFFF`。
- **10-B `arm_pair__standard__linework.png`**（上傳 `Ref A` ＋ `10-A`）：像素鎖定 `10-A` 僅描 `#3A281E` 外框與兩條可愛指縫線（肩頂開放柔和），內外純白 `#FFFFFF`。
- **10-C `paw_pad__standard__base.png`**（上傳 `Ref A`）：單組置中可愛貓肉球（1 掌心豆＋4 趾豆），純無彩色灰階 `#9A9A9A~#EFEFEF`，無外框、無貓毛、純白底 `#FFFFFF`。

#### 零件 11：`leg_L` / `leg_R`（坐姿後腿）
- **11-A `leg_pair__standard__fur_base.png`**（上傳 `Ref A` ＋ `Ref B`）：左右分離對稱坐姿圓潤後腿與歇地後掌（間隔 >=200px，內側大腿根圓弧封口供骨骼旋轉），純無彩色灰階 `#969696~#EFEFEF`，無外框、無軀幹、無前手、純白底 `#FFFFFF`。
- **11-B `leg_pair__standard__linework.png`**（上傳 `Ref A` ＋ `11-A`）：像素鎖定 `11-A` 僅描 `#3A281E` 外框與腳趾線，內外純白 `#FFFFFF`。

#### 零件 12：`tail`（短澎尾／長直尾）
- **12-A `tail__short_bobtail__fur_base.png`**（上傳 `Ref A` ＋ `Ref B`）：單條置中微向右上方弧曲之可愛短圓蓬鬆貓尾（左端尾根圓弧無縫毛邊封口供骨骼旋轉），純無彩色灰階 `#969696~#EFEFEF`，無外框、無身體、純白底 `#FFFFFF`。（產長直尾 `long_straight` 時改描述為細長微 S 型柔毛長尾）
- **12-B `tail__short_bobtail__linework.png`**（上傳 `Ref A` ＋ `12-A`）：像素鎖定 `12-A` 僅描 `#3A281E` 外框與尾尖柔毛絲，內外純白 `#FFFFFF`。

### 5.5 5 組柔邊粉彩花色遮罩指令（`mask_<pattern>`，像素鎖定對齊毛底）

> **操作方式：** 上傳 `head__flat_face__fur_base.png`（製作身體遮罩時改傳 `body_torso__chubby__fur_base.png`）作為像素鎖定輪廓，**背景一律 `100% PURE SOLID BLACK (#000000)`，遮罩區一律 `PURE WHITE (#FFFFFF)` 帶手繪粉彩毛絲羽化邊（嚴禁硬邊幾何圖形）**：

1. **M1 `mask_colorpoint`（重點色臉罩）：** 居中涵蓋口鼻與臉頰之柔邊橢圓重點色暈染，向外額與外頰以細膩毛絲漸溶入純黑。
2. **M2 `mask_tabby_mackerel`（虎斑條紋）：** 額頭柔和手繪「M」字紋＋兩側臉頰 2～3 道微彎平行虎斑條紋（身體則為背側環狀柔和條紋）。
3. **M3 `mask_bicolor_tuxedo`（賓士白斑）：** 自眉心向下自然展開涵蓋口鼻與下巴之毛茸倒 V 柔邊白斑（嚴禁生硬三角形）；身體為胸前柔邊白圍兜。
4. **M4-A / M4-B `mask_calico_patch_a` ＋ `mask_calico_patch_b`（三花／玳瑁雙色塊）：** M4-A 繪製約 35% 面積之有機雲朵毛邊不對稱色塊；產 M4-B 時**同時上傳毛底與 M4-A**，強制只在 M4-A 為純黑區域繪製約 35% 互補色塊，確保零重疊。
5. **M5 `mask_starry_rare`（稀有星空微光）：** 額頭與上頰細膩點綴柔和粉彩星塵雀斑與 3～4 顆迷你四芒繪本微光星點。

---

## 六、AI 產圖 → 正式 3 層透明 PNG 的 3 步無損後製 SOP

1. **步驟 1（依背景三分法無損透明化）：**
   - **`fur_base`（純白底 `#FFFFFF`）：** 採外圍 Flood-Fill 柔邊去背（搭配邊緣 5～8px 毛絲抗鋸齒羽化），完整保留細碎毛邊且絕不誤刪貓臉內部淺灰毛。
   - **`linework`（純白底 `#FFFFFF`）：** 採 **Color-to-Alpha（白色轉透明）** 並反預乘還原暖深棕 `#3A281E` 筆觸——100% 保留色鉛筆半透明紙紋顆粒，遠優於魔術棒去背。
   - **`eye_socket` / `pupil_highlight`（純綠幕 `#00FF00`）：** 採 HSV 色度去綠幕＋去綠邊（Despill），100% 保住純白眼白與高光點。
   - *(若採 OpenAI Images API 且開啟 `background="transparent"` 產出原生透明 PNG，則跳過本步直接進入步驟 2。)*
2. **步驟 2（灰階校準與遮罩轉 Alpha）：**
   - 所有 `*_fur_base.png` 強制去飽和度（`Saturation = 0`），並將內部像素亮度線性映射校準至規格安全區間 **`L = 0.58 ~ 0.94`**（確保顯性純白與奶油貓絕不發灰變髒）。
   - 所有黑底白紋 `mask_*.png` 直接以亮度轉為「純白 `#FFFFFF` ＋ Alpha 通道」透明 PNG。
3. **步驟 3（雙件拆切並匯入 Rive 依 §4.3 鐵律綁骨驗證）：**
   - 凡採同畫布對稱產圖之雙件檔（`ear_pair__*`、`arm_pair__*`、`leg_pair__*`）於後製階段依中線切分為獨立左右透明 PNG（`ear_L`/`ear_R`、`arm_L`/`arm_R`、`leg_L`/`leg_R`，嚴格對齊 §1 命名規則）；再將全部 12 組透明零件對齊 §1 統一錨點座標匯入 **Rive**，依 §4.3 鐵律 A（眼眶 Clipping Path）與鐵律 B（2.5D 球面視差轉身）完成動作綁定後輸出單一 `.riv`，交由 Phase B 渲染層對接 `PetViewModel` 與 3 層動態預合成器。
