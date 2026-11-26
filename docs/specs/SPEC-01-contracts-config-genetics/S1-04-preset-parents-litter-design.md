# SHINUAN-S1-04 技術設計文件（Design Spec）：真實貓咪毛色遺傳學、皮克敏式 2D 換色選父母與一胎 3～5 隻領養系統

> **狀態：APPROVED（PO 已於 2026-11-26 定案，隨 `Master PRD v2.1.30` 規格升級 PR 納入基準；實作開工排程於 `SHINUAN-S1-03` 合併之後）**
> 本文件對應 `Master PRD v2.1.30`（§3.1、§3.2、§8.A.1、§8.A.5、§8.D、§8.E.2 `TC-10`、§11.2），納入 `docs/specs/SPEC-01-contracts-config-genetics/S1-04-preset-parents-litter-design.md`。

- **預計 Task ID：** `SHINUAN-S1-04`（排程於 `SHINUAN-S1-03` PR 合併後開立 Issue）
- **資料驅動原則（PO 2026-11-26 定案）：** 本設計與未來 PRD **僅定義 Schema、通用驗證不變量與 7 基因座遺傳演算法**；所有系統內定父母之名字、隻數、花色與基因型一律由外部設定檔 `content/genetics/preset-parents.v1.json` 驅動，**隨時可自由增刪調整而無須修改 PRD、設計文件或程式碼**。（`preset-parents-proposal.md` 僅為初期範例參考稿，非規格鎖定項。）
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

## 2. 真實貓咪毛色 7 基因座模型（Mendelian Coat Genetics Engine）

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

export type AllelePair<T extends string> = readonly [T, T];

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
3. **7 個常染色體基因座（`black`、`dilute`、`agouti`、`colorpoint`、`whiteSpotting`、`dominantWhite`、`silverInhibitor`）：**
   - 依上述固定順序，每個基因座分別以 `50/50` 自爸爸 `pair` 抽 1 個等位基因、以 `50/50` 自媽媽 `pair` 抽 1 個等位基因，組成子代 `AllelePair`。

### 2.3 基因型 -> 表現型（`coatPattern` ＋ 標準基準 HEX）映射規則

純函式 `resolveCoatPhenotype(genotype)`（零亂數、100% 確定性），依生物學上位效應順序判定：

1. **顯性純白遮罩（`W` 存在）：**
   - `coatPattern = 'solid'`，基準色 `primary: #F8F8F8`、`secondaryHex: null`（仍保留基因型供 UI 顯示「遺傳自純白基因」）。
2. **重點色表現（`cs/cs` 且無 `W`）：**
   - `coatPattern`：若帶白斑 `S/-` 可表現為 `'bicolor_tuxedo'`（雙色布偶）或 `'colorpoint'`（標準重點色，視雙親花色傾向）；無白斑 `s/s` 一律 `'colorpoint'`。
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

---

## 3. 完整 7 步驟個體一胎多貓流程與相容契約

1. **一胎隻數（1A）：** `litterRng` 抽 1 次：3 隻 `30%` / 4 隻 `40%` / 5 隻 `30%`，派生 `kittenSeed = `${litterSeed}#kitten-${i}``。
2. **每隻小貓固定步驟：**
   - **步驟 1（特殊顯性骨架）：** 沿用 `munchkin` `body`（90/10・50/25/25）與 `exotic` `head`（90/10・60/40）。
   - **步驟 2（形狀圖層 `head`、`ears`、`eyes`、`pupilColor`、`tail`、`body` ＋ 星空稀有突變）：** 沿用既有三配對來源權重（90/10、30/50/20、40/40/20）與 75/25 稀有突變，直接繼承具體父母之 `appearanceLayers[layer]`。
   - **步驟 3（真實 7 基因座毛色遺傳 ＋ 性別 50/50 ＋ E1 2% XXY 彩蛋）：** 依 §2 計算 `gender`、`coatGenotype`、`coatPattern`、基準毛色與 `easterEggs`。
   - **步驟 4（相容性規則 1～4）：** 完全沿用既有 `applyCompatibilityRules`。
   - **步驟 5（HSL `±8%` 微調）：** 完全沿用既有 `color-params.ts`。
   - **步驟 6（小怪癖獨立抽選）：** 沿用 50% 0 / 35% 1 / 15% 2；對領養預覽物件**僅輸出 `hasHiddenQuirks: boolean`**（嚴格遮罩具體 ID 與數量）。
   - **步驟 7（初始基礎性格 `breedBase`）：** 沿用既有品種公式（同種直接沿用；米克斯＋純種 30/70 整數縮放；跨純種 50/50）；永久鎖定 `fatherPetId = fatherParent.parentId`、`motherPetId = motherParent.parentId`。
3. **遺傳小知識文案（`geneticsSummaryTags`）：** 引擎同時輸出純資料標籤（如 `['inherited_colorpoint', 'dilute_cream_expression', 'rare_male_calico_easter_egg']`），由 UI 層渲染成溫暖的中文遺傳小知識與彩蛋祝賀！

---

## 4. 防盲抽（R1）與帳號總免費貓咪數契約

- **每日免費繁育上限（`DAILY_FREE_LITTER_LIMIT = 3`）：** 記錄於 `DailyLimits`（`littersGeneratedToday`、`lastLitterGeneratedAt`），受既有本地日期與防時鐘回撥保護。
- **放棄本胎／未領養兄弟姊妹提示：**
  - 放棄整胎換下一胎前提示：「**此胎貓咪將由其他玩家領養，確定要放棄這一胎嗎？**」
  - 領養確認且本胎仍有未領養小貓時提示：「**若此次放棄多領養，其餘兄弟姊妹將被其他玩家領養**」
  - 用完第 3 胎時保留第 3 胎 3～5 隻供玩家當日領養，不卡死新手。
- **帳號總免費擁有上限（`AdoptionSlotPolicy`）：**
  - `totalAllowedPets = maxFreeOwnedPets + purchasedExtraPetSlots`（MVP 預設 `1 + 0 = 1`，架構支援設定為 `n` 並於 Phase E 接付費擴充名額）。

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
   - 驗證孟德爾遺傳核心案例（如三花媽生公貓拆色 50% 橘 / 50% 非橘；雙純合 `dd × dd` 100% 稀釋；`CC × cscs` 0% 重點色 vs `Ccs × cscs` 50% 重點色 vs `cscs × cscs` 100% 重點色；E1 公三花 XXY 彩蛋觸發率吻合 `2%` 區間）。
   - 驗證領養預覽物件不含 `quirks` 陣列與數量（僅 `hasHiddenQuirks`）。
   - 驗證 R1 每日 3 胎上限、跨日重置、時鐘回撥拒絕重置，以及帳號總免費貓咪數計算。
3. **`preset-parents.v1.json` 通用驗證（與具體名單解耦）：** 驗證器僅檢查通用不變量（`parentId` 唯一、6 品種各至少 1 爸 1 媽、合法 `coatGenotype`、公貓不含三花／玳瑁、外觀不違反相容規則 1～3 與無稀有突變）；測試不寫死具體父母名字、隻數或固定花色清單，確保日後自由編輯 JSON 不破壞測試。
