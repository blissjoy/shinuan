<a id="top"></a>

# SHINUAN-S1-01 技術設計文件（Design Spec）：`@shinuan/contracts` 跨模組型別與資料契約

> **導覽與追溯：** [← 回到規格入口](../README.md#entry-spec-01) ｜ [所屬規格 SPEC-01](./SPEC.md) ｜ [Phase A 規格地圖](../PHASE-A-SPEC-MAP.md#spec-01) ｜ [Master PRD v2.1.31](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [GitHub Issue #3](https://github.com/blissjoy/shinuan/issues/3)

> **版本追溯備註（`P1-02`）：** 本文件紀錄已合併結案之 `SHINUAN-S1-01`（PR `#4`）所建立的 `v2.1.29` 基礎契約；`Master PRD v2.1.30 / v2.1.31` 新增之個體父母遺傳、一胎 3～5 隻、`discoveredQuirks`、`littersGeneratedToday`、`lastLitterGeneratedAt` 與 `accountMeta` 等 `@shinuan/contracts` 增量型別，統一歸由 [`S1-04-preset-parents-litter-design.md`](S1-04-preset-parents-litter-design.md)（`SHINUAN-S1-04` / Issue `#12`）向後相容擴充。

- **Task ID / GitHub Issue：** `SHINUAN-S1-01` / `#3`
- **所屬 Epic 與規格來源：** `docs/specs/PHASE-A-SPEC-MAP.md`（`SPEC-01` 契約、設定與基因引擎）
- **對應 Master PRD 章節：** `Master PRD v2.1.29` §0、§3.1、§3.2、§4.3、§5.1、§5.2、§8.A.1～§8.A.4、§8.B.1～§8.B.3、§8.C.2、§8.C.3、§8.E.1
- **對應程式碼路徑：** `packages/contracts/src/**`、`packages/contracts/test/**`
- **定案日期：** 2026-11-25（PO 確認定案）
- **權威性聲明：** 本文件為模組技術設計與契約紀錄，不得覆寫或修改 Master PRD v2.1.29；若有衝突，一律以 Master PRD 為準。

---

## 1. 設計目標與邊界

### 1.1 In-Scope（本單負責）
1. 定義全專案（`game-core`、`config-loader`、`local-cli`、`local-sandbox` 及未來 Phase B/C/D 行動端）共用之純 TypeScript 型別、判別聯集、Port 介面與跨平台呈現契約 `PetViewModel`。
2. 匯出直接對應 Master PRD v2.1.29 原文之不可變列舉常數與白名單常數（6 大品種、7 大圖層、稀有突變、安全預設回退、15 支唯一 `AnimationId`、8 種 `TailState`、MVP 4 款 `QuirkId`、11 種 `GameCommand`、14 種 `GameEvent`、§8.C.2 7 個商品定價級距上限表）。
3. 預留 `v1 -> v2` 舊存檔遷移型別（`LegacyGameStateV1`）與外部設定檔注入契約（`ValidatedGameConfig`）。

### 1.2 Out-of-Scope（明確排除，屬後續小單）
- JSON 讀檔、Schema 驗證、CSV/JSON 批次匯入與級距檢查邏輯（`SHINUAN-S1-02` `packages/config-loader`）。
- 基因抽選、相容修正與 PRNG 計算（`SHINUAN-S1-03` `GeneticsEngine`）。
- 時間步進、精確交點切割、健康救援與低心情懲罰計算（`SHINUAN-S2-01`、`SHINUAN-S2-02`）。
- 經濟結算、商店探索與存檔遷移實作（`SHINUAN-S3-01`、`SHINUAN-S3-02`）。
- 行為決策仲裁、30 日人格重算與 `GameEngine` 總組裝（`SHINUAN-S4-01`、`SHINUAN-S4-02`）。

---

## 2. 規格追溯對照表（Master PRD ↔ 模組檔案 ↔ 匯出契約）

| Master PRD v2.1.29 章節 | 規格重點 | 實作檔案 | 核心匯出型別／常數 |
| --- | --- | --- | --- |
| §0、§3.1、§8.A.1～§8.A.4 | 6 品種、7 大圖層與固定順序、4 層稀有突變、規則 4 安全回退、`ColorParams`、`PetGenetics`（含 `fatherPetId`/`motherPetId`） | `packages/contracts/src/genetics.ts` | `BREED_IDS`、`BreedId`、`APPEARANCE_LAYER_NAMES`、`APPEARANCE_LAYER_TRAITS`、`RARE_MUTATION_TRAITS`、`SAFE_DEFAULT_APPEARANCE_LAYERS`、`ColorParams`、`COLOR_PARAMS_DELTA_RANGE`、`PetAppearance`、`PetGenetics` |
| §8.A.1、§8.C.2 | 8 款預設商品、三區塊商業化商品結構（`externalSource`/`vendorInfo`/`gameBalance`）、軟下架 `status`、7 個定價級距天花板 | `packages/contracts/src/catalog.ts` | `ItemId`、`BUILT_IN_ITEM_IDS`、`FOOD_CATEGORIES`、`PRODUCT_TYPES`、`PRODUCT_DATA_TYPES`、`FEED_SOURCE_TYPES`、`PRODUCT_STATUSES`、`ExternalSource`、`FoodNutrition`、`VendorInfo`、`FoodGameEffect`、`GameBalance`、`FoodCatalogItem`、`FOOD_PRICE_TIER_RULES` |
| §0、§3.2、§8.A.1、§8.B.2 | 基礎人格、MVP 4 款小怪癖、30 日記憶桶、即時需求、健康狀態機、`LowMoodDuration`、`PetState`（含 `microchipId`） | `packages/contracts/src/pet.ts` | `GROWTH_STAGES`、`BasePersonality`、`MVP_QUIRK_IDS`、`QuirkDefinition`、`DailyMemoryBucket`、`PetMemories`、`PetNeeds`、`RECOVERY_STATES`、`LowMoodDuration`、`PetState` |
| §0、§4.3、§8.B.1、§8.B.3 | 唯一 15 支 `AnimationId`（P0-B/P0-C/P1）、8 種尾巴情緒、圖示／音效、6 級優先級、`BehaviorDecision` | `packages/contracts/src/behavior.ts` | `P0_B_ANIMATION_IDS`、`P0_C_ANIMATION_IDS`、`P1_ANIMATION_IDS`、`ANIMATION_IDS`、`TAIL_STATES`、`ICON_IDS`、`SOUND_IDS`、`BEHAVIOR_CATEGORIES`、`BEHAVIOR_PRIORITIES`、`BEHAVIOR_PRIORITY_BY_CATEGORY`、`BehaviorDecision` |
| §0、§8.B.1、§8.C.3 | Phase A 完整 11 種 `GameCommand`（獨立 `DrinkWater`、`TriggerLanding`、`InspectProduct` 等） | `packages/contracts/src/commands.ts` | `GAME_COMMAND_TYPES`、`GameCommandType`、11 個具體 Command 介面與 `GameCommand` 判別聯集 |
| §0、§8.B.1、§8.C.1、§8.C.3 | 引擎不可變事實事件（時間模擬、時鐘回撥、狀態變更、經濟與行為事件） | `packages/contracts/src/events.ts` | `GAME_EVENT_TYPES`、`GameEventType`、14 個具體 Event 介面與 `GameEvent` 判別聯集 |
| §0、§8.C.3、§8.E.1 | `DailyLimits`、`GameState`（`schemaVersion: 2`）、`v1 -> v2` 舊存檔遷移型別 | `packages/contracts/src/save.ts` | `CURRENT_SCHEMA_VERSION`、`DailyLimits`、`GameState`、`V2_ADDED_GENETICS_FIELDS`、`V2_ADDED_PET_STATE_FIELDS`、`LegacyPetGeneticsV1`、`LegacyPetStateV1`、`LegacyGameStateV1` |
| §0、§5.1、§8.E.1 | 時間／時區注入、確定性亂數注入、跨平台存檔介面 | `packages/contracts/src/ports.ts` | `Clock`（含 `getTimezoneOffsetMinutes()`）、`RandomGenerator`、`GameRepository` |
| §0、§5.2 | 跨平台唯讀呈現契約（不含 `interruptible`/`cooldownMs`） | `packages/contracts/src/view-model.ts` | `PetViewModelNeeds`、`PetViewModelBehavior`、`PetViewModelDisplay`、`PetViewModel` |
| §5.1、§8.A.2、§8.A.3、§8.C.2 | `content/` 4 類靜態設定檔與已驗證注入設定總包 | `packages/contracts/src/config.ts` | `HexColorSpec`、`BreedColorSwatch`、`BreedDefinition`、`BreedsConfig`、`WeightedTrait`、`BreedTraitPool`、`TraitsConfig`、`CompatibilityRule`、`AppearanceCompatibilityConfig`、`FoodCatalogConfig`、`ValidatedGameConfig` |
| Monorepo 單一入口 | 集中匯出所有契約與套件識別常數 | `packages/contracts/src/index.ts` | `CONTRACTS_PACKAGE_NAME` 與上述全部 10 支模組之 `export *` |

---

## 3. 模組架構與依賴方向

`@shinuan/contracts` 位於整個 Monorepo 最底層，**零外部依賴、零內部套件依賴**；各模組間單向引用如下，無循環依賴：

```text
genetics.ts ──┐
catalog.ts  ──┼─► pet.ts ───────► save.ts ───────► ports.ts
              │     │
              │     ├─► view-model.ts ◄── behavior.ts
              │     │
              │     └─► config.ts
              ├─► commands.ts ──► events.ts ◄── behavior.ts / pet.ts
              └─► index.ts（統一 re-export 入口）
```

---

## 4. 核心設計決策紀錄（PO 於 2026-11-25 確認定案）

以下 6 項為 Master PRD v2.1.29 未逐字展開、於 `SHINUAN-S1-01` 確立之初版工程契約決策，經 PO 確認定案並供後續 `S1-02`～`S4-03` 沿用：

1. **`FoodNutrition` 結構：** 採 `{ crudeProteinPercent: number; crudeFatPercent: number; moisturePercent: number }`（百分比以數值表示，如 `28` 代表 `28%`；飲用水以 `0 / 0 / 100` 表示）。後續若需補充額外營養標示文字，採向後相容的可選欄位擴充。
2. **外部設定檔 Schema 初版（`config.ts`）：**
   - `BreedsConfig` 以 `HexColorSpec`（`single` 單色或 `range` 區間色）搭配可選 `secondaryHex: string | null` 表達毛色色盤。
   - `TraitsConfig` 以 `BreedTraitPool` 映射 7 大圖層之 `WeightedTrait[]`。
   - `AppearanceCompatibilityConfig` 以 `{ id, order, when, set }` 規則陣列搭配 `safeDefaultAppearance` 表達規則 1～4。
   - `S1-02` 撰寫實際 JSON 與驗證器時，如發現需微調欄位須經由對應任務同步更新本設計契約。
3. **`GameEvent` payload 與 reason 型別：** 14 種事件 payload 採最小必要事實欄位；`CommandRejected.reason` 與 `CoinsChanged.reason` 暫以 `string` 保持彈性，具體錯誤／來源代碼枚舉留待對應引擎任務（`S2`/`S3`/`S4`）定型。
4. **`iconIds` 採嚴格型別 `readonly IconId[]`：** 統一對齊 PRD §5.2 `PetViewModel` 與 §8.B.1 動態圖示集合（不採用寬鬆 `string[]`），防止拼字錯誤。
5. **全面不可變（`readonly` + `Object.freeze`）：** 所有介面欄位、陣列與白名單常數一律宣告為 `readonly` 並凍結，確保 Game Core 與呈現層不會意外突變共用契約資料。
6. **小怪癖僅匯出 `MVP_QUIRK_IDS` 與 `QuirkDefinition` 型別：** 因 PRD §8.B.2 尚未定義 `targetBehavior` 的程式識別碼，本單不預先發明行為字串常數，留待 `S4-01`（`BehaviorEngine`）定義。

---

## 5. 關鍵不變量與工程限制

- **零依賴與環境隔離：** `packages/contracts/package.json` 零 `dependencies`；`packages/contracts/tsconfig.json` 強制 `"types": []`，編譯層即杜絕 Node／Browser 全域型別滲入。
- **嚴格 TypeScript 旗標：** 承繼 `tsconfig.base.json`（`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`verbatimModuleSyntax`）。
- **數值保護：** `FOOD_PRICE_TIER_RULES` 7 個定價級距上下限、`SAFE_DEFAULT_APPEARANCE_LAYERS`、`COLOR_PARAMS_DELTA_RANGE`（`[-0.08, +0.08]`）與 `CURRENT_SCHEMA_VERSION = 2` 均逐字鎖定 PRD v2.1.29，不得自行調整。
- **`PetViewModel` 呈現隔離：** `PetViewModelBehavior` 嚴格排除 `interruptible` 與 `cooldownMs`（由型別測試以 `@ts-expect-error` 反向守門）。

---

## 6. 驗收對應（AC 與測試檔案）

| 驗收面向 | 對應測試檔案 | 驗證重點 |
| --- | --- | --- |
| 套件入口與既有骨架相容 | `packages/contracts/test/smoke.test.ts` | `CONTRACTS_PACKAGE_NAME` 匯出不中斷 |
| 列舉常數與不可變性 | `packages/contracts/test/enums.test.ts` | 6 品種、7 圖層順序與枚舉、4 稀有突變、安全預設外觀、15 支 `AnimationId` 分級、8 種 `TailState`、4 款 `QuirkId`、11 種 `GameCommand`、14 種 `GameEvent`、4 種 `RecoveryState` 與 `Object.isFrozen` |
| 商品定價級距白名單 | `packages/contracts/test/price-tiers.test.ts` | 逐列比對 PRD §8.C.2 7 個級距之 `price`/`hunger`/`hydration`/`mood` 上下限與 deep freeze |
| 關鍵型別結構與隔離 | `packages/contracts/test/type-structure.test.ts` | `PetViewModel` 排除 `interruptible`/`cooldownMs`、`LegacyGameStateV1` 與 `GameState` v2 欄位差異、`Clock` 時區方法、`FoodCatalogItem` 三區塊與 11 種 `GameCommand` 判別聯集 |
| 全區型別與純淨度 | `corepack pnpm typecheck`、`node scripts/check-shinuan-integrity.mjs` | 零型別錯誤、無受保護路徑滲漏、PRD v2.1.29 一致 |
