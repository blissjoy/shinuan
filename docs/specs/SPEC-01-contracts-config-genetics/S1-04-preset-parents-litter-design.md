<a id="top"></a>

# SHINUAN-S1-04 技術設計文件（Design Spec）：真實貓咪毛色遺傳學、皮克敏式 2D 換色選父母與一胎 3～5 隻領養系統

> **導覽與追溯：** [← 回到規格入口](../README.md#entry-spec-01) ｜ [所屬規格 SPEC-01](./SPEC.md) ｜ [Phase A 規格地圖](../PHASE-A-SPEC-MAP.md#spec-01) ｜ [Master PRD v2.1.31](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [GitHub Issue #12](https://github.com/blissjoy/shinuan/issues/12)

> **狀態：APPROVED（PO 已於 2026-11-26 定案，並於 2026-11-27 `SHINUAN-DOC-08` 依外部獨立審計補齊 `config-loader` 施工責任、R1 跨日與回撥契約、`calculatePairingPreviewProbability()`、`AdoptionSlotPolicy` 持久化及 `TC-10` 2% XXY 統計容許區間；實作開工排程於 `SHINUAN-S1-03` 合併之後）**
> 本文件對應 `Master PRD v2.1.31`（§3.1、§3.2、§8.A.1、§8.A.5、§8.D、§8.E.2 `TC-10`、§11.2），納入 `docs/specs/SPEC-01-contracts-config-genetics/S1-04-preset-parents-litter-design.md`。

- **預計 Task ID：** `SHINUAN-S1-04`（GitHub Issue `#12`，排程於 `SHINUAN-S1-03` PR 合併後開工）
- **資料驅動原則（PO 2026-11-26 定案）：** 本設計與 PRD **僅定義 Schema、通用驗證不變量與 9 個孟德爾基因座遺傳演算法（8 毛色〔1 性聯 `O/o` ＋ 7 常染色體〕＋ 1 毛長 `L/l`；`irisPigment` 另屬多基因連續虹膜模型）**；所有系統內定父母之名字、隻數、花色與基因型一律由外部設定檔 `content/genetics/preset-parents.v1.json` 驅動，**隨時可自由增刪調整而無須修改 PRD、設計文件或程式碼**。
- **跨模組增量施工責任（`P0-03` 明文歸屬，不回改已結案之 `S1-01`/`S1-02`）：** `SHINUAN-S1-04` 須於同一任務分支增量擴充：
  1. `@shinuan/contracts`（`packages/contracts/src/**`）：補齊 `v2.1.30`/`v2.1.31` 新增型別（`CoatGenotype`、`PresetParentCat`、`PresetParentsConfig`、`PigmentedFeatureColor`、`GeneticsEasterEggId`、`AdoptionSlotPolicy`、`AccountMeta`、`DailyLimits.littersGeneratedToday`、`DailyLimits.lastLitterGeneratedAt`、`ValidatedGameConfig.presetParents`）。
  2. `@shinuan/config-loader`（`packages/config-loader/src/**`）：新增 `preset-parents-validator.ts`（`validatePresetParentsConfig()`）與 `loadPresetParentsConfig()` 並整合進 `loadGameConfig()`，定義明確錯誤碼（`ERR_PRESET_PARENTS_DUPLICATE_ID`、`ERR_PRESET_PARENTS_BREED_COVERAGE`、`ERR_PRESET_PARENTS_INVALID_GENOTYPE`、`ERR_PRESET_PARENTS_MALE_CALICO_FORBIDDEN`、`ERR_PRESET_PARENTS_COMPAT_CONFLICT`、`ERR_PRESET_PARENTS_RARE_MUTATION_FORBIDDEN`）與對應單元測試。
- **零破壞承諾：** 完全保留既有 `S1-03` 純品種 API、`TC-01`、`TC-02` 與 `tests/fixtures/genetics-golden-v1.json`，以及所有既有時間／健康／經濟數值。

---

## 1. 產品核心體驗與低成本 UI 架構決策

1. **皮克敏式「2D 紙娃娃即時換色」選父母（零額外立繪成本、全資料驅動）：**
   - **不需為父母池繪製獨立照片／立繪**，且父母名單（名字、隻數、花色、基因型）全部由 `content/genetics/preset-parents.v1.json` 動態載入，隨時可調整。
   - 領養選父母頁直接複用全專案唯一的 **7 大圖層 2D 貓咪渲染元件＋`colorParams` 動態著色器**（與主房間、懸浮窗、Widget 共用同一套素材）：
     - 玩家選爸爸／媽媽品種（即時切換頭、耳、眼、尾、體型 2D 圖層）→ 點選該品種＋該性別於 JSON 中配置之毛色球 → 上方 2D 父母貓即時換毛色與花紋並依基因型自動推導「🧬 隱性基因線索」。
   - Phase A 本機驗收看板（`apps/local-sandbox`）以純程式碼內建輕量 **7 圖層 SVG 向量貓咪預覽元件** 驗證此互動手感（零外部依賴、零畫師前置成本）。
   - `portraitAssetId` 維持選填（`null` 表示由 2D 圖層即時渲染），預留給未來 Phase D/E 的**網紅貓咪 IP 聯名**或**動保中途真實待領養浪浪**掛載真實照片。
2. **商業與公益定位紀律（PO 2026-11-26 定案）：**
   - **暫緩商業繁殖業者（貓舍）合作**（避免台灣愛貓社群輿論炎上風險）。
   - 父母來源型別僅預留零爭議之 `sourceType: "system" | "influencer_ip" | "rescue_shelter"`（Phase A 全為 `"system"`），為未來「網紅貓 IP」與「動保中途待領養真貓免費公益合作」超前部署資料欄位。
3. **一胎 3～5 隻、小怪癖神秘感、帳號總免費上限與 R1 防盲抽（PO 全數定案）：**
   - 每胎隻數：3 隻 `30%` ／ 4 隻 `40%` ／ 5 隻 `30%`。
   - 子代性別：嚴格 `50%` 公 / `50%` 母。
   - **罕見公三花／公玳瑁 XXY 彩蛋（E1）：** 正常公貓自母貓單一 X 染色體拆色（三花媽 `O/o` 自然生出 50% 橘系公寶 / 50% 非橘系公寶）；當公貓具備雙色 XXY 觸發條件時，以 **`2%`** 機率誕生招財公三花／公玳瑁並向玩家彈出幸運彩蛋祝賀！
   - **小怪癖神秘感：** 領養預覽**僅提示「有／無隱藏小怪癖」（`hasHiddenQuirks: boolean`），不提示數量也不揭露名稱**，留給玩家日後陪伴慢慢解鎖。
   - **帳號總擁有免費上限：** 以帳號層級 `maxFreeOwnedPets`（MVP 預設 `1`，架構支援設為 `n`）＋ `purchasedExtraPetSlots`（預設 `0`，未來付費解鎖多養）控管，非單次領養免費數。
   - **防短時間不停盲抽（R1）：** 每個本地日曆日最多免費繁育 **3 胎**；放棄本胎重抽或領養剩餘兄弟姊妹前明確提示 **「此胎小貓將由其他玩家領養」** 喚醒珍視感；用完第 3 胎時保留第 3 胎 3～5 隻供直接領養不卡死新手。

---

## 2. 真實貓咪毛色、毛長、眼色與鼻頭／肉球遺傳模型（Mendelian Genetics Engine）

### 2.1 基因型資料結構（`@shinuan/contracts` 增量）

```ts
export type OrangeAllele = 'O' | 'o';
export type BlackAllele = 'B' | 'b';
export type DiluteAllele = 'D' | 'd';
export type AgoutiAllele = 'A' | 'a';
export type ColorpointAllele = 'C' | 'cs';
export type WhiteSpottingAllele = 'S' | 's';
export type DominantWhiteAllele = 'W' | 'w';
export type SilverInhibitorAllele = 'I' | 'i';
export type CoatLengthAllele = 'L' | 'l'; // L = 短毛顯性, l = 長毛隱性 (FGF5)
export type CoatLengthPhenotype = 'short' | 'long';

export type AllelePair<T extends string> = readonly [T, T];

export type IrisPigmentLevel = 0 | 1 | 2; // 0 = emerald (淺綠), 1 = amber (琥珀黃), 2 = copper (深古銅)

export interface CoatGenotype {
  /** 公貓正常為 [OrangeAllele]（XY）；母貓為 [OrangeAllele, OrangeAllele]（XX）；罕見 XXY 彩蛋公貓為 ['O', 'o']。 */
  readonly orange: readonly [OrangeAllele] | AllelePair<OrangeAllele>;
  readonly black: AllelePair<BlackAllele>;
  readonly dilute: AllelePair<DiluteAllele>;
  readonly agouti: AllelePair<AgoutiAllele>;
  readonly colorpoint: AllelePair<ColorpointAllele>;
  readonly whiteSpotting: AllelePair<WhiteSpottingAllele>;
  readonly dominantWhite: AllelePair<DominantWhiteAllele>;
  readonly silverInhibitor: AllelePair<SilverInhibitorAllele>;
  /** 毛長基因座（FGF5）：L 短毛顯性 > l 長毛隱性。 */
  readonly coatLength: AllelePair<CoatLengthAllele>;
  /** 底層虹膜黑色素等級（即使外表因 cs/cs 或 W/- 表現藍眼，仍攜帶可遺傳給非重點／非白子代的底層色素基因）。 */
  readonly irisPigment: IrisPigmentLevel;
}

export interface PigmentedFeatureColor {
  readonly id: string;
  readonly hex: string;
  readonly secondaryHex?: string | null;
}
```

### 2.2 孟德爾遺傳與公三花 XXY 彩蛋規則（使用 `kittenRng`）

給定已驗證之爸爸 `fatherParent`（`gender === 'male'`，具 `fatherParent.coatGenotype`）與媽媽 `motherParent`（`gender === 'female'`，具 `motherParent.coatGenotype`）：

1. **抽取子代性別（嚴格 50/50）：**
   - `rGender = nextRandom(rng)`：`rGender < 0.50` -> `'male'`，否則 -> `'female'`。
2. **X 染色體橘色基因（`O / o`）與 E1 彩蛋判定：**
   - 媽媽固定以 `50/50` 隨機提供一條 X 染色體 `momO`（`nextRandom(rng) < 0.50 ? mom.orange[0] : mom.orange[1]`）。
   - **若為母貓（`'female'`，XX）：** 從爸爸取唯一 X（`dad.orange[0]`）與 `momO` 組成 `[dad.orange[0], momO]`（若一 `O` 一 `o` 即表現三花／玳瑁！）。
   - **若為公貓（`'male'`，XY）：**
     - 檢查「是否具雙色 XXY 彩蛋條件」：當 `(mom.orange[0] !== mom.orange[1])`（三花／玳瑁媽）或 `(dad.orange[0] !== momO)`（爸媽色系互補）時，抽 1 次 `rXxy = nextRandom(rng)`：
       - 若 **`rXxy < 0.02`**（2% 罕見 XXY 彩蛋！）：`orange = ['O', 'o']`，標記觸發公三花／公玳瑁彩蛋（依最終是否帶白斑 `S/-` 決定為 `'rare_male_calico'` 或 `'rare_male_tortoiseshell'`）。
       - 否則（98% 正常 XY 公貓）：`orange = [momO]`（**三花媽自然 50/50 拆出橘系公貓與黑棕系公貓**！）。
     - 若爸媽雙方皆純 `O` 或皆純 `o`（無雙色基因來源）：不觸發彩蛋，`orange = [momO]`。
3. **8 個常染色體基因座（`black`、`dilute`、`agouti`、`colorpoint`、`whiteSpotting`、`dominantWhite`、`silverInhibitor`、`coatLength`）：**
   - 依上述固定順序，每個基因座分別以 `50/50` 自爸爸 `pair` 抽 1 個等位基因、以 `50/50` 自媽媽 `pair` 抽 1 個等位基因，組成子代 `AllelePair`。
   - **毛長表現型（`FGF5`）：** `coatLength` 為 `['l', 'l']` -> `'long'`（長毛）；含任一 `'L'` -> `'short'`（短毛）。當子代尾巴不屬於 `short_bobtail` 或 `kinked_kirin` 時，長毛自動表現為 `fluffy_plume`、短毛表現為 `long_straight`。

### 2.3 基因型 -> 表現型（`coatPattern` ＋ 標準基準 HEX）映射規則

純函式 `resolveCoatPhenotype(genotype)`（零亂數、100% 確定性），依生物學上位效應順序判定：

1. **顯性純白遮罩（`W` 存在）：**
   - `coatPattern = 'solid'`，基準色 `primary: #F8F8F8`、`secondaryHex: null`（仍保留基因型供 UI 顯示「遺傳自純白基因」）。
2. **重點色表現（`cs/cs` 且無 `W`）：**
   - `coatPattern`（確定性映射）：帶白斑 `S/-` 一律表現為 `'bicolor_tuxedo'`（雙色重點布偶／喜馬拉雅）；無白斑 `s/s` 一律表現為 `'colorpoint'`（經典重點色）。
   - 底色皆為奶油白 `#FAF5EE`（或暖象牙 `#F2E4D5`），重點輔色 `secondaryHex` 依 `O/B/D` 決定：
     - 海豹重點（`o`, `B/-`, `D/-`）：`#4A3728`
     - 藍重點（`o`, `B/-`, `d/d`）：`#6B7A8F`
     - 巧克力重點（`o`, `b/b`, `D/-`）：`#5C4033`
     - 丁香重點（`o`, `b/b`, `d/d`）：`#9B8F9E`
     - 火焰橘重點（`O`, `D/-`）：`#D97236`
     - 奶油重點（`O`, `d/d`）：`#E8C49A`
     - 三花／玳瑁重點（`O/o`）：濃色 `#8F5638`、稀釋藍乳 `#9A8E9C`
3. **三花／玳瑁表現（`O/o` 且非純白、非重點色）：**
   - 帶白斑 `S/-` -> **`coatPattern = 'calico'`**；無白斑 `s/s` -> **`coatPattern = 'tortoiseshell'`**。
   - 濃色 `D/-`：主橘 `#D98245` ＋ 輔黑/巧（`B/-`: `#2E2E2E`、`b/b`: `#5C4033`）。
   - 稀釋 `d/d`（藍乳三花／藍乳玳瑁）：主奶油 `#ECD4B3` ＋ 輔藍灰/丁香（`B/-`: `#7A8591`、`b/b`: `#9B8F9E`）。
4. **純橘／奶油系（`O` 且無 `o`）：**
   - 橘色上位效應恆帶虎斑紋：無白斑 `s/s` -> `'tabby_mackerel'`；帶白斑 `S/-` -> `'bicolor_tuxedo'`（橘白／奶油白雙色）。
   - 濃橘 `D/-`：一般 `#DF7D38`（帶漸層 `I/-` 呈現暖金漸層 `#D9A760`）；稀釋奶油 `d/d`：`#F0D6B4`。
5. **黑／巧／藍／丁香系（純 `o`）：**
   - 帶銀色抑制 `I/-`：`A/-` -> 銀漸層／銀虎斑（`#D8DEE3`，`tabby_mackerel`）；`a/a` -> 煙燻黑／藍煙燻（`#3A3D40` / `#6F7A85`，`solid`）。
   - 一般 `i/i`：
     - `A/-` 虎斑（`tabby_mackerel`；若帶白斑 `S/-` 為虎斑加白 `bicolor_tuxedo`）：黑棕虎斑 `#7E6B5A`、藍虎斑 `#7B8794`、巧虎斑 `#6D5140`、丁香虎斑 `#9D919F`。
     - `a/a` 純色（`solid`；若帶白斑 `S/-` 為賓士雙色 `bicolor_tuxedo`）：純黑 `#2B2B2B`、經典藍灰 `#7C8690`、巧克力 `#523A2C`、丁香 `#958A98`。
6. **最後套用：**
   - **步驟 2 稀有奇幻突變（`coatPattern: 'starry_rare'`，2.5%～5%）：** 若觸發星空斑紋稀有突變，將 `coatPattern` 覆寫為 `'starry_rare'`（底色仍保留真實遺傳基色！）。
   - **步驟 3 確定性相容性修正（規則 1 -> 2 -> 3 -> 4）：** 完全沿用既定規則（確保 `colorpoint + amber -> sapphire`、`flat_face + giant_fluffy -> chubby` 等不變量 100% 成立）。
   - **步驟 4 HSL `±8%` 微調：** 對表現型基準主／輔 HEX 套用既有 `lightnessDelta`、`saturationDelta`（四位小數 `[-0.08, +0.08]` ＋無彩色保護），讓同胎就算同基因型也各具獨特毛色光澤！

### 2.4 真實貓咪眼色遺傳規則（`resolvePupilColor`，完全對稱無偏差）

在真實貓咪生物學中，眼色由「阻斷黑色素遷移之毛色主控基因（`W`、`cs`、`S`）」與「底層虹膜黑色素多基因光譜（`emerald` ↔ `amber` ↔ `copper`）」共同決定：

1. **底層虹膜黑色素等級 `irisPigment`（完全對稱整數步階，消除 `Math.round` 偏深偏差，消費 1 次 `rIris = nextRandom(rng)`）：**
   - 令 `sum = father.coatGenotype.irisPigment + mother.coatGenotype.irisPigment`（整數 `0..4`）。
   - **若 `sum` 為偶數（`0, 2, 4`，整數中點 `mid = sum / 2`）：**
     - `rIris < 0.25` -> `Math.max(0, mid - 1)`（25% 往淺 1 階）
     - `rIris < 0.75` -> `mid`（50% 維持中點）
     - `else` -> `Math.min(2, mid + 1)`（25% 往深 1 階）
     - *(驗證：`(0,2)` 綠×古銅與 `(1,1)` 琥珀×琥珀皆為精確 `25%` 綠 / `50%` 琥珀 / `25%` 古銅；`(0,0)` 為 `75%` 綠 / `25%` 琥珀；`(2,2)` 為 `25%` 琥珀 / `75%` 古銅，完全鏡像對稱。)*
   - **若 `sum` 為奇數（`1, 3`）：**
     - `rIris < 0.50` -> `Math.floor(sum / 2)`（50% 較淺）
     - `else` -> `Math.ceil(sum / 2)`（50% 較深）
2. **表現型瞳色決定（依生物學上位優先順序）：**
   - **情況 A — 顯性純白（`W` 存在）：** 消費 1 次 `rEye = nextRandom(rng)`：
     - `rEye < 0.35` -> `'sapphire'`（35% 雙眼藍眼）
     - `rEye < 0.50` -> `'heterochromia_blue_gold'`（15% 藍金異色瞳）
     - `else` -> 底層多基因虹膜色（50%）
   - **情況 B — 重點色純合（`cs/cs` 且無 `W`）：** **0 次亂數**，直接鎖定 **`'sapphire'`**（100% 藍眼，包含所有布偶與喜馬拉雅重點色子代）。
   - **情況 C — 帶白斑（`S` 存在，且無 `W`、非 `cs/cs`）：** 消費 1 次 `rEye = nextRandom(rng)`：
     - `rEye < 0.05` -> `'sapphire'`（5% 藍眼）
     - `rEye < 0.10` -> `'heterochromia_blue_gold'`（5% 藍金異色瞳）
     - `else` -> 底層多基因虹膜色（90%）
   - **情況 D — 一般無白貓（`w/w`、`C/-`、`s/s`）：** **0 次亂數**，100% 表現底層多基因虹膜色（`'emerald'` / `'amber'` / `'copper'`，絕不無端冒出純藍眼或異色瞳）。

### 2.5 確定性鼻頭顏色（`noseColor`）與肉球顏色（`pawPadColor`）

純函式 `resolveNoseAndPawPadColors(genotype)`（0 次亂數，100% 由 `CoatGenotype` 推導）：

| 毛色表現型 | `noseColor` (`id` / `hex`) | `pawPadColor` (`id` / `hex` / `secondaryHex`) |
| --- | --- | --- |
| 顯性純白（`W/-`） | `pink` / `#F2A7B5` | `pink` / `#F2A7B5` |
| 橘／奶油系（`O/O`、`O/Y`） | `brick_pink` / `#E89993` | `pink` / `#F2A7B5` |
| 黑系無白（`o`, `B/-`, `D/-`, `s/s`） | 純色 `charcoal` `#2E2B2B`；虎斑 `terracotta` `#B5685C` | `charcoal` / `#363131` |
| 藍灰無白（`o`, `B/-`, `d/d`, `s/s`） | `blue_gray` / `#6E7782` | `mauve_gray` / `#7A7885` |
| 巧克力無白（`o`, `b/b`, `D/-`, `s/s`） | `chocolate` / `#5C4338` | `cinnamon_brown` / `#6B4E42` |
| 丁香無白（`o`, `b/b`, `d/d`, `s/s`） | `lilac_pink` / `#B59AA6` | `lilac_pink` / `#B59AA6` |
| 重點色（`cs/cs`） | 雙色白臉（`S/-`）為 `pink` `#F2A7B5`；無白（`s/s`）依重點色（海豹 `#3F2E23`、藍 `#6B7A8F`、巧 `#5C4033`、丁香 `#B59AA6`、火焰/奶油 `#E89993`） | 依重點色同左；帶白斑（`S/-`）為 `mottled_pink`（`#F2A7B5` + 重點輔色） |
| 三花／玳瑁／非重點帶白斑（`O/o` 或 `S/-`） | 三花／帶白斑 `mottled_pink` `#E89FA6`；無白玳瑁 `mottled_dark` `#7A5656` | `mottled`（濃色 `#E89FA6` + `#3B3434`；稀釋 `d/d` `#F0B7BF` + `#7A7885`） |

---

## 3. 完整 7 步驟個體一胎多貓流程與相容契約

1. **一胎隻數（1A）：** `litterRng` 抽 1 次：3 隻 `30%` / 4 隻 `40%` / 5 隻 `30%`，派生 `kittenSeed = `${litterSeed}#kitten-${i}``。
2. **每隻小貓固定步驟：**
   - **步驟 1（特殊顯性骨架 — 個體模式真實孟德爾校正）：**
     - **曼赤肯 `body`：** 雙親皆曼赤肯採真實孟德爾 `2:1`（`r < 2/3` -> `'short_legs'`，否則 `'normal'`）；單親曼赤肯維持真實 `50%` `short_legs` / `25%` 另一方體型 / `25%` `normal`。
     - **加菲 `head`：** 沿用雙親 90/10、單親 60/40。
   - **步驟 2（形狀圖層 `head`、`ears`、`eyes`、`tail`、`body` ＋ 折耳／麒麟尾／星空稀有驚喜）：**
     - 沿用既有三配對來源權重（90/10、30/50/20、40/40/20；直接繼承具體父母之 `appearanceLayers[layer]`）與折耳／麒麟尾／星空 `2.5%～5%` 稀有突變驚喜。
     - **禁止無中生有短腿／扁臉：** 個體模式 `body` 通用變異白名單排除 `short_legs`（僅 `normal`/`chubby`/`large_fluffy`/`giant_fluffy`）；`head` 通用變異白名單排除 `flat_face`（僅 `standard_round`/`chubby_round`/`square_muzzle`）。
   - **步驟 3（真實 9 基因座孟德爾遺傳〔8 毛色＋1 毛長〕＋ 尾巴連動毛長 ＋ 真實眼色 ＋ 鼻頭與肉球 ＋ 性別 50/50 ＋ E1 2% XXY 彩蛋）：** 依 §2 計算 `gender`、`coatGenotype`、`coatLength`、`coatPattern`、`pupilColor`、連動非短／非麒麟尾之 `tail`、`noseColor`、`pawPadColor`、基準毛色與 `easterEggs`。
   - **步驟 4（相容性規則 1～4）：** 完全沿用既有 `applyCompatibilityRules`。
   - **步驟 5（HSL `±8%` 微調）：** 完全沿用既有 `color-params.ts`。
   - **步驟 6（小怪癖獨立抽選）：** 沿用 50% 0 / 35% 1 / 15% 2；對領養預覽物件**僅輸出 `hasHiddenQuirks: boolean`**（嚴格遮罩具體 ID 與數量）。
   - **步驟 7（初始基礎性格 `breedBase`）：** 沿用既有品種公式（同種直接沿用；米克斯＋純種 30/70 整數縮放；跨純種 50/50）；永久鎖定 `fatherPetId = fatherParent.parentId`、`motherPetId = motherParent.parentId`。
3. **遺傳小知識文案（`geneticsSummaryTags`）：** 引擎同時輸出純資料標籤（如 `['inherited_colorpoint', 'dilute_cream_expression', 'rare_male_calico_easter_egg']`），由 UI 層渲染成溫暖的中文遺傳小知識與彩蛋祝賀！
4. **選父母精簡機率預覽純函式（`calculatePairingPreviewProbability`，`P1-03` 數學鎖定）：**
   - 簽章：`calculatePairingPreviewProbability(father: PresetParentCat, mother: PresetParentCat): PairingPreviewProbability`（純確定性精確枚舉計算，零亂數）。
   - **計算範圍與精確機率空間：** 僅涵蓋決定表現型毛色的 **8 個毛色孟德爾基因座**（性聯 `O/o` ＋ 7 個常染色體毛色基因座 `B/b`、`D/d`、`A/a`、`C/cs`、`S/s`、`W/w`、`I/i`；`L/l` 僅影響毛長與尾巴而不影響毛色，且不含 `2.5%~5%` 稀有 `starry_rare` 突變與 7 層骨架形狀）：
     1. **性別與性聯 `O/o` 精確分支：**
        - **母貓分支（`p = 0.50`）：** 承接爸爸唯一 X（`father.coatGenotype.orange[0]`）與媽媽兩條 X（各 `0.5`）組成無序等位基因對，合併等價基因型（`['O','o'] == ['o','O']`）。
        - **公貓分支（`p = 0.50`）：** 若雙親符合 E1 雙色基因條件（媽媽為 `['O','o']`，或 `{father.coatGenotype.orange[0]} ∪ set(mother.coatGenotype.orange)` 同時含 `'O'` 與 `'o'`），精確拆分為 **`2%` XXY 彩蛋分支**（`orange = ['O','o']`，分支機率 `0.50 × 0.02 = 0.01`）與 **`98%` 正常 XY 分支**（總分支機率 `0.50 × 0.98 = 0.49`，各以 `0.5` 承接媽媽兩條 X 之一）；若不符合雙色條件，則 `100%` 走正常 XY 分支（`0.50`）。
     2. **7 個獨立常染色體毛色基因座之精確乘積：** 對 `B/b`、`D/d`、`A/a`、`C/cs`、`S/s`、`W/w`、`I/i` 各自計算父母 `2×2` 配子配對機率（父兩等位基因各 `0.5` × 母兩等位基因各 `0.5`，合併無序等價基因型後每座為 `1～3` 種狀態）；7 座獨立直積最多 `3^7 = 2,187` 種常染色體組合，與上述性聯分支（跨性別合併等價 `orange` 基因型後 `≤ 4` 組，上限 **`4 × 3^7 = 8,748`** 種；若保留性別區分則 `≤ 5` 組、上限 `5 × 3^7 = 10,935` 種，兩者最終機率 100% 等價）相乘（零蒙地卡羅抽樣誤差，單次運算 `< 1 ms`）。
     3. **表現型映射與三分類聚合（`resolveCoatColorFamily(genotype)`）：** 將每個精確狀態以 `resolveCoatPhenotype` 確定性映射至色系 ID（如 `'white'`、`'colorpoint_seal'`、`'colorpoint_cream'`、`'calico'`、`'tortoiseshell'`、`'ginger'`、`'cream'`、`'black'`、`'blue'`、`'chocolate'`、`'lilac'`、`'silver_tabby'` 等）：
        - 若 `dadFamily === momFamily`（雙親同表現型色系）：合併輸出 `{ sameFamily: true, likeBothPct, surprisePct }`（`likeBothPct + surprisePct === 100`）；
        - 若 `dadFamily !== momFamily`：輸出 `{ sameFamily: false, likeFatherPct, likeMotherPct, surprisePct }`（依序為子代色系 `=== dadFamily`、`=== momFamily`、與其餘新表現型色系〔含隱性稀釋／重點色浮現與 XXY 三花彩蛋〕之精確機率總和）。
     4. **整數百分比捨入與固定平手優先序（Largest Remainder + Tie-break）：** 各項先取 `Math.floor(p * 100)`，再依小數餘數 `(p * 100) - Math.floor(p * 100)` 由大到小將差額 `100 - sum` 逐一 `+1`；若多項餘數差值 `<= 1e-12` 視為平手，**固定 tie-break 優先序為 `likeFatherPct > likeMotherPct > surprisePct`**（同色系為 `likeBothPct > surprisePct`），確保相同輸入在所有執行環境下恆得完全一致結果。
     5. **固定驗算範例（`S1-04` 單元測試鎖定）：**
        - 範例 A（純黑〔攜帶稀釋基因〕公 `o, BB, Dd, aa, CC, ss, ww, ii` × 純藍母 `oo, BB, dd, aa, CC, ss, ww, ii`，異色系、無雙色 XXY 條件）：`Dd × dd` 精確產出 `50%` `Dd`（純黑＝像父）＋ `50%` `dd`（純藍＝像母）＋ `0%` 驚喜 → `{ sameFamily: false, likeFatherPct: 50, likeMotherPct: 50, surprisePct: 0 }`。
        - 範例 B（海豹重點公 `o, BB, DD, aa, cscs, ss, ww, ii` × 奶油虎斑母〔奶油色系，受橘色上位效應恆帶虎斑紋〕`OO, BB, dd, aa, Ccs, ss, ww, ii`，具雙色 XXY 條件）：母寶 `50%` 全為 `O/o` 玳瑁（`25%` 濃玳瑁、`25%` 玳瑁重點）、公寶 `1%` 為 XXY 玳瑁（`0.5%` 濃玳瑁、`0.5%` 玳瑁重點）、`49%` 為 `O/Y + Dd` 橘系（`24.5%` 濃橘、`24.5%` 火焰重點），皆異於父海豹重點與母奶油色 → `{ sameFamily: false, likeFatherPct: 0, likeMotherPct: 0, surprisePct: 100 }`。

---

## 4. 防盲抽（R1）與帳號總免費貓咪數契約（`P0-02` / `P1-04` 完整閉環）

- **每日免費繁育上限（`DAILY_FREE_LITTER_LIMIT = 3`）執行契約（同步落地於 `SPEC-03` §2.2 / §3.1）：**
  1. **初始值與遷移預設：** 全新開局與 `v1 -> v2`（或舊版 `v2`）存檔遷移一律初始化 `dailyLimits.littersGeneratedToday = 0`、`dailyLimits.lastLitterGeneratedAt = null`。
  2. **跨日重置與防時鐘回撥：** 呼叫繁育前先執行共用 `syncDailyLimitsForDate(dailyLimits, nowTimestamp, timezoneOffsetMinutes)`：
     - 正常本地跨日（`currentLocalDate > dailyLimits.localDate`）：自動將 `littersGeneratedToday` 重置為 `0`，**保留 `lastLitterGeneratedAt`**；
     - 時鐘或日期倒退（`currentLocalDate < dailyLimits.localDate` 或 `currentLocalDate < dailyLimits.lastActiveLocalDate` 或 `lastLitterGeneratedAt !== null && nowTimestamp < lastLitterGeneratedAt`）：**嚴格拒絕重置並回傳 `CLOCK_OR_DATE_ROLLBACK` 錯誤**，防止調錶繞過每日 3 胎限制。
  3. **原子遞增與防重入：** 單次成功產生一胎後，連同當胎 `activePendingLitter` 一併原子寫入存檔，同步遞增 `littersGeneratedToday += 1` 並更新 `lastLitterGeneratedAt = nowTimestamp`；對同一 `litterSeed` 重複點擊或 App 重啟還原未領養之當胎時，直接回傳既有當胎且**不得重複扣減胎數**。
  4. **放棄與保底規則：**
     - 放棄整胎換下一胎前提示：「**此胎貓咪將由其他玩家領養，確定要放棄這一胎嗎？**」
     - 領養確認且本胎仍有未領養小貓時提示：「**若此次放棄多領養，其餘兄弟姊妹將被其他玩家領養**」
     - 當 `littersGeneratedToday >= 3` 時禁止放棄重抽，保留第 3 胎 3～5 隻供玩家當日完成領養不卡死新手。
- **帳號總免費擁有上限（`AdoptionSlotPolicy`）與持久化位置（`P1-04`）：**
  - 公式：`totalAllowedPets = maxFreeOwnedPets + purchasedExtraPetSlots`（MVP 預設 `1 + 0 = 1`，架構支援設定為 `n` 並於 Phase E 接付費擴充名額）。
  - **持久化與舊存檔遷移契約（同步見 `SPEC-03` §3.1 與 [ADR-003](../../decisions/ADR-003-save-storage-json-to-sqlite.md)）：** 嚴禁將帳號名額混入單一 `PetState`；MVP 本機以獨立帳戶封裝欄位 `accountMeta: { accountId: string; maxFreeOwnedPets: number; purchasedExtraPetSlots: number; ownedPetIds: string[] }` 隨存檔（JSON 頂層 `accountMeta`／SQLite `game_saves.account_meta_json NOT NULL`）持久化，並於 Phase E 接入雲端帳號同步時改以伺服器帳戶紀錄為唯一權威（防跨裝置重複免費領養）。當 `v1 -> v2` 或舊版 `v2` 存檔缺失 `accountMeta` 時，遷移層必須確定性初始化為 `{ accountId: 'local-default-account', maxFreeOwnedPets: 1, purchasedExtraPetSlots: 0, ownedPetIds: pet?.id ? [pet.id] : [] }`（既有活躍 `pet.id` 強制去重回填至 `ownedPetIds`，嚴禁讓舊存檔憑空重獲額外免費領養名額）。

---

## 5. `apps/local-sandbox` Tab 1 升級藍圖（皮克敏式 2D 換色體驗）

- 保留原「品種級 1,000 隻分布驗證」子分頁（`S1-03` 驗收工具不動）。
- 新增「**皮克敏式選爸媽 → 一胎 3～5 隻領養**」主子分頁：
  - 上方左右並排「爸爸 ♂」與「媽媽 ♀」即時 7 層 SVG 2D 向量貓咪預覽。
  - 下方選品種＋點該品種於 JSON 配置之毛色球，2D 貓咪即時換毛色／換花紋並顯示由基因型自動推導之隱性基因線索。
  - 點「生一胎（3～5 隻）」→ 展開 3～5 張同胎小貓 2D 預覽卡（顯示性別 ♂/♀、外觀特徵、真實毛色＋遺傳小知識標籤、神秘怪癖提示「✨ 似乎藏著隱藏小怪癖」、中彩蛋時高亮祝賀橫幅！）。
  - 內建 R1「每日 3 胎上限」與「放棄此胎確認彈窗」體驗（附「測試無上限開關」方便開發驗收）。

---

## 6. 驗收規劃（`S1-04` 正式開工前基準）

1. **零破壞回歸：** 原 `S1-03` 全部測試（含 `TC-01`、`TC-02`、`genetics-golden-v1.json`）100% 通過無更動。
2. **新增 `TC-10`（真實遺傳學＋一胎多貓＋彩蛋＋R1 防盲抽）：**
   - 驗證一胎 3/4/5 隻統計吻合 `30%/40%/30% ± 5%`、性別吻合 `50%/50% ± 5%`。
   - 驗證孟德爾毛色、毛長、眼色、鼻頭／肉球與骨架遺傳核心案例（如三花媽生公貓拆色 50% 橘 / 50% 非橘；雙純合 `dd × dd` 100% 稀釋；`CC × cscs` 0% 重點色 vs `Ccs × cscs` 50% 重點色 vs `cscs × cscs` 100% 重點色；`ll × ll` 100% 長毛且一般長尾自動表現 `fluffy_plume`、`Ll × Ll` 長毛 25%；鼻頭與肉球顏色確定性一致；**E1 公三花 XXY 彩蛋統計檢定（`P1-05` 鎖定）：採條件式公貓抽樣——對固定具雙色基因條件之父母配對（如非橘父 × 橘母或三花母，排除純 `O×O` 與純 `o×o` 組合），以固定確定性種子序列 `"tc10-xxy-sample-${i}"`（`i = 0..4999`）逐筆直接進入 `gender === 'male'` 之公貓 X 染色體遺傳分支產出 1 隻符合彩蛋條件之公貓樣本，確保分母精確為 `N = 5,000`（不混入 50/50 性別抽樣之母數偏差；性別 50%/50% ± 5% 另由獨立性別統計測試驗證），期望值 `2.0%`（100 隻），斷言實測觸發率落於 `1.3% ~ 2.7%`〔約 ±3.5σ，99.95% 信賴區間，零偶發抖動〕**；眼色符合 `cs/cs` 非純白 100% `sapphire`、`W/-` 35% 藍眼 / 15% 異色瞳、`S/-` 5% 藍眼 / 5% 異色瞳、一般無白貓 `w/w + C/- + s/s` 0% 藍眼與 0% 異色瞳且對稱多基因光譜 `(0,2)` 吻合 25%/50%/25%；雙曼赤肯吻合 `2:1` 即 66.7%/33.3%，且非曼赤肯／非加菲雙親 0% 憑空變異出 `short_legs` 或 `flat_face`）。
   - 驗證 `calculatePairingPreviewProbability()` 固定配對案例（含同色系合併與異色系三分類加總恆為 `100%`）。
   - 驗證領養預覽物件不含 `quirks` 陣列與數量（僅 `hasHiddenQuirks`）。
   - 驗證 R1 每日 3 胎上限、跨日重置、時鐘回撥拒絕重置、重啟保留計數不重算，以及 `accountMeta` 帳號總免費貓咪數計算。
3. **`preset-parents.v1.json` 通用驗證（由 `SHINUAN-S1-04` 增量實作於 `@shinuan/config-loader`，與具體名單解耦）：** 驗證器僅檢查通用不變量（`parentId` 唯一、6 品種各至少 1 爸 1 媽、合法 `coatGenotype`、公貓不含三花／玳瑁、外觀不違反相容規則 1～3 與無稀有突變）；測試不寫死具體父母名字、隻數或固定花色清單，確保日後自由編輯 JSON 不破壞測試。
