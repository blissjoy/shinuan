<a id="top"></a>

# Phase B 美術工程規範｜2D 手繪粉彩貓咪「12 零件紙娃娃拆圖 ＋ 3 層動態著色 ＋ AI 生成指令包」

> **導覽與追溯：** [← 回到規格入口](README.md#phase-b) ｜ [Phase A 規格地圖](PHASE-A-SPEC-MAP.md) ｜ [Master PRD v2.1.30](../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ADR-001 動畫引擎 Rive](../decisions/ADR-001-animation-engine-rive.md) ｜ [ADR-002 雙平台橋接](../decisions/ADR-002-mobile-native-bridge-architecture.md)

- **文件性質：** Phase B 2D 美術與前端渲染對接規格書（PO 2026-11-26 定調採用 2D 粉彩紙娃娃骨骼動畫路線）
- **風格基準（Style North Star）：** PO 手繪粉彩繪本風格原型圖（已封存於 `D:\Dropbox\ai-bridge\shinuan\tasks\SHINUAN-S1-04\prototype\assets\{dad_exotic_seal.jpg, mom_exotic_cream.jpg}`）
- **對應規格基準：** `Master PRD v2.1.30`（§3.1、§5.2 `PetViewModel`、§8.A.1～§8.A.5、§8.B.3 動畫矩陣）
- **核心原則：** **「1 套靜態 2D 零件底圖 ＋ 1 套共用 2D 骨骼動畫（Rive / Spine 2D）＋ 100% 程式即時換色與互動」**——零逐格手繪成本，6 大品種與上萬種真實基因毛色共用同一套動畫檔，且 100% 保留手繪粉彩繪本溫度。

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

每一個**帶毛皮的零件**（頭、耳、身、四肢、尾巴）都嚴格拆成以下 3 層獨立 PNG，由程式在 Shader / Canvas / Rive 疊加合成：

| 圖層代碼 | 名稱 | 內容規範 | 程式如何處理 |
| --- | --- | --- | --- |
| **`fur_base`** | 灰階粉彩毛底層 | **純無彩色灰階（飽和度 = 0）**，含細膩粉彩毛流筆觸與柔和立體陰影，亮度區間嚴格控制在 **`L = 0.58 ~ 0.94`**（不可出現死黑或死白，才能染出乾淨的莫蘭迪粉彩／奶油／深海豹色）。 | 程式以 `Multiply / Soft-Light` 乘上基因主色 `colorParams.primaryHex`（並套用 `±8%` HSL 微調）。 |
| **`mask_<pattern>`** | 柔邊花色遮罩層 | **純白（`#FFFFFF`）＋ 帶毛流羽化之 Alpha 透明度**，標記重點色臉罩、虎斑條紋、賓士白胸白手套、三花橘塊／黑塊或星空斑點區域。 | 程式讀取 `coatPattern` 與 `coatGenotype`，將遮罩染上 `secondaryHex`／純白 `#FAF6F0`／橘黑雙色塊並疊在 `fur_base` 上，**邊緣自然毛茸茸、絕不出現幾何硬邊**。 |
| **`linework`** | 手繪線稿與高光層 | **暖深棕手繪外框線（約 `#3A281E`）、鬍鬚、眼睛高光白點、粉紅內耳耳窩、手繪漫畫表情小線條**（透明底）。 | **永遠不進入毛色染色管線！** 永遠蓋在最上層，100% 保留您原圖的繪本靈魂與立體感。 |

> **鼻頭與肉球專屬小層：** `nose_base.png` 與 `paw_pad_base.png` 同樣採純灰階底圖，由程式直接乘上 `PetGenetics.noseColor.hex` 與 `pawPadColor.hex`（花肉球另疊 `paw_pad_mottle_mask.png` 乘 `secondaryHex`）。

---

## 三、12 大模組化零件清單（BOM）與 Phase B MVP 最低出圖量

### 3.1 Phase B 必做零件總表（先求 1 隻「測試貓」全動起來，再平行擴充其他品種）

| # | 零件 ID | 對應基因欄位 | Phase B 測試貓必做數 | Phase C 全 6 品種總變體 | 說明 |
| --- | --- | --- | :---: | :---: | --- |
| 1 | `head` | `appearance.head` | **1**（建議先做加菲 `flat_face`） | **4**（`standard_round`、`chubby_round`、`flat_face`、`square_muzzle`） | 決定品種第一眼辨識度（扁臉／圓臉／緬因方嘴） |
| 2 | `ear_L` / `ear_R` | `appearance.ears` | **1 對**（`small_round`） | **4 對**（`pointed_medium`、`small_round`、`tufted_large`、`folded_tip`） | 獨立插槽件，綁定單一耳骨可隨摸頭壓耳、警戒豎耳 |
| 3 | `eye_socket` | `appearance.eyes` | **1 對**（`big_round`） | **3 對**（`almond`、`big_round`、`droopy_cute`） | 眼眶外框＋眼白底 |
| 4 | `eye_iris` | `appearance.pupilColor` | **1 顆灰階虹膜**（左右共用！） | **1 顆**（全品種共用！） | **左右眼各自獨立染色**，1 張灰階圖就能變出琥珀／綠／藍／古銅與**藍金異色瞳**，並由程式追蹤游標與手指！ |
| 5 | `eyelid_expr` | 行為與情緒狀態 | **4 款**（睜眼／開心瞇眼／熟睡閉眼／生氣斜眉） | **6 款**（加委屈下垂眉、打瞌睡半瞇） | 疊在眼眶上切換表情 |
| 6 | `nose` | `genetics.noseColor` | **1 個灰階鼻** | **1 個**（全品種共用！） | 程式直接染粉紅／磚粉／海豹棕／藍灰／黑／花鼻 |
| 7 | `mouth_expr` | 行為與情緒狀態 | **4 款**（標準微笑／委屈吐舌／張嘴吃飯／傲嬌撇嘴） | **6 款**（加哈氣生氣、打哈欠） | 與 `eyelid_expr` 自由排列組合出數十種生動神態 |
| 8 | `whiskers` | 固定裝飾層 | **1 對** | **1 對**（全品種共用！） | 獨立線稿不染色，摸頭與生氣時隨微動畫震動 |
| 9 | `body_torso` | `appearance.body` ＋ `coatLength` | **1**（`chubby`） | **5**（`normal`、`chubby`、`short_legs`、`large_fluffy`、`giant_fluffy`） | 長毛 `l/l` 另掛選配胸毛領巾件 `chest_ruff_fluffy.png` |
| 10 | `arm_L` / `arm_R` | `appearance.body` | **1 對** | **2 對**（標準腿／曼赤肯短腿，其餘由骨骼微縮放共用） | 含 `paw_pad` 獨立小圖，可做抱胸、揮爪、走路擺臂 |
| 11 | `leg_L` / `leg_R` | `appearance.body` | **1 對** | **2 對**（標準腿／曼赤肯短腿） | 走路、坐下、母雞蹲切換 |
| 12 | `tail` | `appearance.tail` | **1 條**（`short_bobtail` 或 `long_straight`） | **4 條**（`long_straight`、`fluffy_plume`、`short_bobtail`、`kinked_kirin`） | 綁 3～4 節骨骼，獨立運作全部 8 種尾巴情緒動作 |

### 3.2 花色遮罩共用表（只要畫 1 套，套用全部品種與基因！）

- `mask_colorpoint.png`（重點色臉罩、耳尖、手腳尖、尾尖柔邊暈染）
- `mask_tabby_mackerel.png`（額頭 M 字＋身體背側柔和虎斑條紋）
- `mask_bicolor_tuxedo.png`（臉頰八字＋胸前與四隻白襪柔邊白斑）
- `mask_calico_patch_a.png` ＋ `mask_calico_patch_b.png`（兩組不重疊不規則柔邊色塊，搭配白斑即為三花、不疊白斑即為玳瑁）
- `mask_starry_rare.png`（稀有星空點點微光遮罩）

👉 **總工作量真相：** Phase B 要讓第一隻「粉彩互動測試貓」活靈活現動起來＋支援全部 9 基因座換色，只需要 **約 12 個基礎零件＋5 張花色遮罩＋8 個小表情替換件**，而且完全不用畫任何一格逐格動畫！

---

## 四、Rive / Spine 2D 骨骼結構與程式互動分工

### 4.1 共用單一 2D 骨架樹（全品種共用同一套動作檔）

```text
root (地面影與整體縮放：小／中／大)
 └── pelvis (骨盆：控制走路上下彈跳、呼吸縮放)
      ├── tail_1 -> tail_2 -> tail_3 (獨立動畫軌 Track 2：8 種尾巴情緒自由混搭)
      ├── leg_L / leg_R (後腿：坐下／走路／趴臥)
      └── torso (身體主體)
           ├── arm_L / arm_R (前手：抱胸委屈／走路／撲抓玩耍／吃飯)
           └── neck -> head (頭部樞軸：摸頭跟隨搖擺、點頭吃飯、撇頭傲嬌)
                ├── ear_L / ear_R (壓耳／豎耳微動)
                ├── eye_L_pupil / eye_R_pupil (程式即時驅動眼球座標追蹤手指！)
                ├── eyelid_expr / mouth_expr / whiskers
                └── status_icon_anchor (程式動態掛載 🐟 💧 ❤️ 💢 💤 🏥 圖示)
```

### 4.2 動畫軌與程式分工表

- **骨骼動畫檔負責（Phase B P0-B 僅 6 支基礎動作）：** `idle`（呼吸微晃＋偶爾眨眼）、`walk`（四肢輪擺＋身體微彈）、`sit`（坐姿微搖）、`sleep`（身體壓扁閉眼慢呼吸＋💤）、`eat`（低頭點頭＋張嘴咀嚼）、`pet`（閉眼瞇笑＋頭微仰＋耳微壓）。
- **程式（React Native / Kotlin / Swift 渲染層）即時負責：**
  1. 唯讀接收 `PetViewModel` 切換主動畫軌（Track 1：`animationId`）與獨立尾巴軌（Track 2：`tailState`）；
  2. 讀取 `PetAppearance` 與 `colorParams` 即時對 3 層 PNG 著色與替換頭／耳／尾零件；
  3. **眼球追蹤與摸頭物理：** 手指移動時將眼球偏移限制在眼眶圓內（`±6px`）；摸頭時依手指水平位移驅動 `head` 骨骼彈性傾斜（Spring Physics）＋噴出 ❤️ 粒子與呼嚕音效；
  4. **Android 懸浮窗互動：** 拎起切 `drag` 姿勢，放開依重力掉落，高度 > 25% 螢幕送出 `TriggerLanding` 指令給 `GameEngine`。

---

## 五、可直接複製給 AI 產圖的精確 Prompt 指令包（附後製 SOP）

> **適用工具：** Midjourney v6+、GPT Image / DALL-E、Gemini Image、Flux（搭配您的兩張粉彩原圖作為 Style Reference `--sref` / Image Reference 效果最佳）。

### Prompt 1：產出「純灰階毛底」12 零件拆圖表（`fur_base` 專用）

```text
Modular 2D game character sprite sheet of a cute chubby chibified Exotic Shorthair cat in warm soft pastel colored-pencil picture book illustration style, STRICTLY NEUTRAL GRAYSCALE ONLY (zero color saturation, soft light-to-medium gray shading #949494 to #EFEFEF, NO pure black, NO harsh shadows), separated modular parts neatly arranged with generous spacing on a pure solid flat white background (#FFFFFF):
1. Front-facing flat-face round cat head (without ears, without eyes, without mouth)
2. Pair of small round cat ears (separated left and right)
3. Cute plump sitting cat torso body (without head, without limbs, without tail)
4. Pair of front cat paws/arms (separated)
5. Pair of back cat paws/legs (separated)
6. Short fluffy bobtail
Keep fluffy hand-drawn pastel fur brush texture on every silhouette edge, NO outline strokes if possible or minimal soft shading, NO ground shadow, orthographic 2D front view, clean game-ready asset sheet.
```

### Prompt 2：產出 4 大品種頭型零件對照（同畫風同錨點，供 Phase C 擴充）

```text
2D game asset sheet showing 4 modular cat heads in identical warm pastel colored-pencil children's book art style, STRICTLY NEUTRAL GRAYSCALE shading (#9A9A9A to #F0F0F0, zero color), exact same head width and neck anchor alignment, no ears, no eyes, no mouth, arranged in a 2x2 grid on pure solid white background (#FFFFFF):
Top-left: standard round domestic cat head
Top-right: ultra chubby round British Shorthair cat head with full cheeks
Bottom-left: flat-face Exotic Shorthair cat head with squishy cheeks
Bottom-right: Maine Coon cat head with distinctive broad square muzzle and fluffy cheek ruff
Consistent soft crayon fur edges, zero cast shadows, orthographic front view.
```

### Prompt 3：產出 4 種耳朵與 4 種尾巴獨立零件表

```text
2D modular game asset sheet of cat ears and cat tails in soft pastel colored-pencil illustration style, STRICTLY NEUTRAL GRAYSCALE (#9A9A9A to #F0F0F0, zero color saturation), neatly separated on pure solid white background (#FFFFFF):
Top row (4 ear pairs): pointed medium ears, small round ears, large lynx-tufted Maine Coon ears with ear tufts, folded-tip Scottish Fold ears.
Bottom row (4 tails): long straight slender tail, big fluffy plume Ragdoll tail, short stubby bobtail, short kinked lucky Kirin tail.
Soft pastel fur texture, zero shadows, clean spacing for easy cutout.
```

### Prompt 4：產出獨立「表情五官與線稿配件」表（`eyelid_expr` / `mouth_expr` / `whiskers`）

```text
2D game UI facial expression sticker sheet for a cute pastel hand-drawn cat, warm dark-brown colored-pencil linework (#3A281E) on pure solid white background (#FFFFFF), cleanly separated modular facial parts:
Row 1 (5 eye expression pairs, NO fur around them): big round curious eyes with white sparkle highlight, droopy sad cute eyes, happy closed curved squint eyes (^ ^), peaceful sleeping closed eyes (u u), grumpy squinting angry eyes.
Row 2 (5 mouth & nose sets): sweet neutral cat mouth (:3), tiny pink tongue blep mouth, grumpy inverted-V frown mouth, cute open oval eating mouth, angry hissing open mouth.
Row 3: delicate hand-drawn warm-brown whiskers pair, soft blush cheek marks, cute pink paw pads set.
Clean spacing, storybook hand-drawn warmth, no background clutter.
```

### Prompt 5：產出柔邊粉彩花色遮罩（`mask_<pattern>`，黑白高對比遮罩）

```text
2D texture mask sheet for a front-facing chubby round cat silhouette, PURE SOLID BLACK background (#000000) and PURE WHITE soft feathery fur-textured mask patterns (#FFFFFF) with organic brushed pastel fur edges (NO hard geometric lines, NO sharp triangles):
1. Colorpoint Siamese mask: soft white oval gradient over face muzzle, ear tips, paws, and tail tip
2. Mackerel tabby stripes mask: classic forehead "M" mark and soft parallel curved stripes along cheeks and sides
3. Bicolor tuxedo mask: soft inverted-V white blaze across cheeks, fluffy chest bib, and four white mittens
4. Calico / tortoiseshell organic blotches mask: 2 separate sets of soft cloud-like painterly fur patches
Game shader alpha-mask ready, soft hand-brushed fur edges.
```

---

### 六、AI 產圖 → 正式 3 層 PNG 的極簡後製 SOP（單次只需 30 分鐘）

1. **步驟 1（生成與去背）：** 用上述 Prompt 1～4 搭配您的加菲原圖作為風格參考生出零件表 → 用免費去背工具（或 Photoshop / Photopea 魔術棒＋1px 羽化）切出各獨立 `1024×1024` 透明 PNG。
2. **步驟 2（分離線稿與灰階底）：** 若 AI 生成的 `fur_base` 仍帶有深棕線稿，在 Photopea / Photoshop 用「色階／亮度選取深色線條」抽成獨立 `linework.png`，毛底層去飽和度轉灰階並用曲線把最暗部拉高至 `L >= 0.58`（確保換成奶油／純白時絕不發灰發髒）。
3. **步驟 3（導入 Rive / Spine 2D）：** 把 12 個零件對齊 §1 統一錨點座標綁進共用骨架，調好 6 支基礎動作後輸出 `.riv`（Rive）或 `.skel/.atlas`（Spine），直接交給 Phase B 程式接上 `PetViewModel` 與著色器！
