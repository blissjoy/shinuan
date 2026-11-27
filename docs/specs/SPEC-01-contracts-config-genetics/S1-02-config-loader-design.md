<a id="top"></a>

# SHINUAN-S1-02 技術設計文件（Design Spec）：靜態設定檔、`@shinuan/config-loader` 與商品批次匯入驗證器

> **導覽與追溯：** [← 回到規格入口](../README.md#entry-spec-01) ｜ [所屬規格 SPEC-01](./SPEC.md) ｜ [Phase A 規格地圖](../PHASE-A-SPEC-MAP.md#spec-01) ｜ [Master PRD v2.1.31](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [GitHub Issue #5](https://github.com/blissjoy/shinuan/issues/5) / [#7](https://github.com/blissjoy/shinuan/issues/7)

> **狀態：APPROVED（PO 已於 2026-11-25 審閱定案，PR `#6` / `#8` 已合併結案）**  
> **版本與第 5 份設定檔追溯備註（`P0-03` / `P1-02`）：** 本文件紀錄已完成結案之 `S1-02` 4 份基礎設定檔（對應 `v2.1.29`）；`Master PRD v2.1.30 / v2.1.31` 新增之第 5 份設定檔 `content/genetics/preset-parents.v1.json` 及其 `@shinuan/config-loader` 通用驗證器與 `ValidatedGameConfig.presetParents` 增量擴充，統一指派由 [`S1-04-preset-parents-litter-design.md`](S1-04-preset-parents-litter-design.md)（`SHINUAN-S1-04` / Issue `#12`）實作與測試。

- **Task ID / GitHub Issue：** `SHINUAN-S1-02` / `#5`（`https://github.com/blissjoy/shinuan/issues/5`）
- **所屬 Epic 與規格來源：** `docs/specs/PHASE-A-SPEC-MAP.md`（`SPEC-01`、`§四`）
- **對應 Master PRD 章節：** `Master PRD v2.1.29` §2.1、§5.1（第 2、5 點）、§5.3、§8.A.2、§8.A.3、§8.C.2、§10.2（第 1 點）
- **承接前序設計：** `docs/specs/SPEC-01-contracts-config-genetics/S1-01-contracts-design.md`（完全相容既有 `@shinuan/contracts`，無須更動 `packages/contracts/src/**`）
- **對應程式碼路徑：** `content/**`、`packages/config-loader/**`、`scripts/import-catalog.mjs`、`packages/contracts/test/**`（僅補齊 `S1-01` Reviewer 2 項非阻塞測試建議）
- **權威性聲明：** 本文件為技術設計與驗證契約紀錄，不得覆寫或修改 Master PRD v2.1.29；若有衝突，一律以 Master PRD 為準。

---

## 1. 設計目標與邊界

### 1.1 In-Scope（本單負責）
1. 建立 4 份版本化靜態設定檔（對齊 `Master PRD v2.1.29` 原文數值，零改動）：
   - `content/genetics/breeds.v1.json`
   - `content/traits/traits.v1.json`
   - `content/genetics/appearance-compatibility.v1.json`
   - `content/products/food-catalog.v1.json`
2. 實作 `@shinuan/config-loader`（零第三方執行期依賴，僅透過內部 Workspace 連結 `@shinuan/contracts: workspace:*`）：
   - 4 份設定檔的純函式 Schema 與業務不變量驗證器（含 §8.C.2 7 級距定價與效果天花板硬檢核）。
   - 本機檔案載入器 `loadGameConfig()` 與異常降級機制（損毀／缺失／驗證失敗時嚴格拒絕注入未驗證資料，並支援可控的內建預設 Fallback）。
   - 商業化商品批次匯入驗證核心（CSV/JSON 解析、冪等比對、廠商無權覆寫 `gameBalance`、外部新品強制 `pending_review`）。
3. 提供輕量批次轉檔檢核 CLI：`scripts/import-catalog.mjs`（複用 `@shinuan/config-loader` 驗證核心，避免雙份驗證規則漂移）。
4. 補齊 `SHINUAN-S1-01` Reviewer 記錄的 2 項非阻塞測試補強（`FoodCatalogItem` 三區塊結構測試、`price-tiers.test.ts` 巢狀欄位 freeze 斷言）。

### 1.2 Out-of-Scope（明確排除）
- Remote Config Provider / 遠端 CDN 下載與 `manifest.json`（Phase D）。
- `GeneticsEngine` 遺傳抽選與相容修正執行邏輯（`SHINUAN-S1-03`）。
- 經濟結算與商店購買邏輯（`SHINUAN-S3-01`）。
- 任何新增外部 npm 依賴（如 `zod`、`ajv`、`csv-parse` 一律不引入，維持零外部依賴）。

---

## 2. 規格追溯對照表（Master PRD ↔ 檔案 ↔ 責任）

| Master PRD v2.1.29 章節 | 規格重點 | 交付路徑 | 設計責任 |
| --- | --- | --- | --- |
| §8.A.2 | 6 大基礎品種名稱、基礎性格（0~100）、合法毛色 HEX 色碼區間 | `content/genetics/breeds.v1.json` | 逐筆對照 §8.A.2 表格（`version: "v1"`） |
| §8.A.2 第 1 點 | 6 品種七大圖層預設權重池（`coatPattern` 70/30，其餘 6 層 100%） | `content/traits/traits.v1.json` | 逐筆對照 §8.A.2 權重定義（`version: "v1"`） |
| §8.A.3 第 2 點 | 規則 1→2→3 單次循序衝突替換＋規則 4 `SAFE_DEFAULT_APPEARANCE` | `content/genetics/appearance-compatibility.v1.json` | 依 `order: 1, 2, 3` 定義規則與回退（`version: "v1"`） |
| §2.1、§8.C.2 | 三區塊商品結構、8 款 Phase A 預設模擬商品、7 級距上限天花板 | `content/products/food-catalog.v1.json` | 8 款全標 `dataType: "mock"`、`status: "active"`、`sourceName: "MVP 模擬測試資料"` |
| §5.1 第 2/5 點、§10.2 | 本機子目錄讀取、Schema 驗證、嚴禁未驗證資料進 Game Core、內建預設 Fallback | `packages/config-loader/src/**` | 純函式驗證器 ＋ 本機載入器 ＋ 內建已驗證預設設定 |
| §2.2、§5.1 第 5 點、Spec Map §四 | CSV/JSON 批次匯入檢核、廠商不得覆寫 `gameBalance`、新品強制 `pending_review` | `packages/config-loader/src/catalog-importer.ts`、`scripts/import-catalog.mjs` | 統一由同一套驗證核心保護平衡紅線 |

---

## 3. 模組架構與檔案清單

```text
content/
├── genetics/
│   ├── breeds.v1.json
│   └── appearance-compatibility.v1.json
├── traits/
│   └── traits.v1.json
└── products/
    └── food-catalog.v1.json

packages/config-loader/
├── package.json                         # 新增內部連結 "@shinuan/contracts": "workspace:*"（零外部套件）
├── src/
│   ├── index.ts                         # 保留 CONFIG_LOADER_PACKAGE_NAME，匯出全部驗證器、載入器與匯入核心
│   ├── types.ts                         # ConfigValidationError、ValidationResult<T>、LoadGameConfigOptions/Result
│   ├── validators/
│   │   ├── breeds.ts                    # validateBreedsConfig
│   │   ├── traits.ts                    # validateTraitsConfig
│   │   ├── compatibility.ts             # validateAppearanceCompatibilityConfig
│   │   └── food-catalog.ts              # validateFoodCatalogConfig（含 7 級距天花板驗證）
│   ├── defaults.ts                      # 內建已驗證預設設定（BUILT_IN_DEFAULT_CONFIG，供 Fallback）
│   ├── loader.ts                        # loadGameConfig（本機讀檔 + 驗證 + 可控 Fallback）
│   └── catalog-importer.ts              # parseCatalogCsv + mergeCatalogFeed（商業匯入安全規則）
└── test/
    ├── smoke.test.ts                    # 既有測試保留
    ├── content-files.test.ts            # 直接載入專案真實 content/ 4 檔並逐值核對 PRD
    ├── validators.test.ts               # 各類畸形資料、級距越界、贊助商品加權阻擋、mock/real 規則
    ├── loader-fallback.test.ts          # 缺檔／壞 JSON／驗證失敗之嚴格報錯與 Fallback 行為
    └── catalog-importer.test.ts         # CSV/JSON 解析、冪等更新禁改 gameBalance、新品 pending_review

scripts/
└── import-catalog.mjs                   # 輕量 CLI（複用 @shinuan/config-loader 匯入核心）
```

*(註：既有的 `content/{genetics,traits,products,behavior-rules}/.gitkeep` 一律保留不刪除。)*

---

## 4. 核心驗證規則與匯入安全設計

### 4.1 統一驗證回傳契約（零例外拋出設計）
```ts
export interface ConfigValidationError {
  readonly file: string;
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly errors: readonly ConfigValidationError[] };
```
- 錯誤型別正式名稱統一為 `ConfigValidationError`；除本設計明列之錯誤碼（如 `PRICE_TIER_NOT_FOUND`、`EFFECT_OUT_OF_TIER_RANGE`）外，其餘錯誤碼採 `UPPER_SNAKE_CASE` 命名並由實作者於交付摘要完整列表。

### 4.2 4 類設定檔核心檢核規則
- **共通 `version` 檢查：** 4 份設定檔之 `version` 皆須為非空字串（保留未來升版彈性）。
1. **`breeds.v1.json`（`validateBreedsConfig`）：**
   - 必須精確包含 `BREED_IDS` 全部 6 個品種，不得缺漏或重複。
   - `basePersonality` 四維度皆為 `[0, 100]` 區間有限數值。
   - `colorPalette` 非空；所有 `hex`/`fromHex`/`toHex`/`secondaryHex`（非 `null` 時）驗證器允許大小寫十六進位 `/^#[0-9A-Fa-f]{6}$/`（專案內建之 `content/genetics/breeds.v1.json` 檔案內容統一維持整齊大寫）。
2. **`traits.v1.json`（`validateTraitsConfig`）：**
   - `traitPools` 必須涵蓋全部 6 個品種、每品種涵蓋全部 7 大圖層。
   - 每個候選特徵必須屬於該圖層合法枚舉，且**預設特徵池不得放入 4 項稀有突變值**（`folded_tip`、`heterochromia_blue_gold`、`starry_rare`、`kinked_kirin` 僅能經變異路徑產生）。
   - 每個圖層池內 `weight > 0`，且權重總和與 `1.0` 誤差 `< 1e-9`。
3. **`appearance-compatibility.v1.json`（`validateAppearanceCompatibilityConfig`）：**
   - `rules` 之 `id` 唯一、`order` 為正整數且嚴格遞增不重複；Phase A 預設 3 條規則之正式 `id` 固定為：
     - `order: 1` → `id: "flat_face_giant_body"`
     - `order: 2` → `id: "colorpoint_amber_pupil"`
     - `order: 3` → `id: "folded_ear_giant_body"`
   - 每條規則的 `when` 與 `set` 皆至少含 1 個合法圖層鍵值，且值屬於該圖層合法枚舉。
   - `safeDefaultAppearance` 須包含完整 7 層合法值，且**本身不得觸發任何一條 `rules` 的 `when` 條件**（保證規則 4 回退終止且合法）。
4. **`food-catalog.v1.json`（`validateFoodCatalogConfig`）：**
   - `itemId` 非空且全目錄唯一；若 `externalSource.partnerId` 與 `externalSkuId` 皆非 `null`，則 `(partnerId, externalSkuId)` 組合不得重複；`externalSource.syncedAt` 非 `null` 時須為有效完整 ISO-8601 時間戳（含日期、`T`、時分秒與時區 `Z`／`±HH:MM` 且為有效日曆日期）。
   - `vendorInfo`：`name`、`ingredients`、`sourceName` 非空；`nutrition` 三項百分比皆為 `[0, 100]` 有限數值；`lastReviewedAt` 非 `null` 時須為有效 `YYYY-MM-DD`；當 `dataType === "real"` 時，`sourceUrl`（`http://` 或 `https://`）與 `dataVerifiedAt`（有效 `YYYY-MM-DD`）必填；`dataType === "mock"` 允許 `null`。
   - **級距天花板硬檢核（對齊 PRD §8.C.2，無品牌特權）：**
     - `productType === "free"` 必有 `price === 0`；`regular`／`sponsored` 必有 `price > 0`。
     - 依 `(category, price)` 於 `FOOD_PRICE_TIER_RULES` 尋找唯一匹配級距（找不到即回報 `PRICE_TIER_NOT_FOUND`）。
     - `gameEffect.hunger`、`hydration`、`mood` 必全落於該級距閉區間 `[min, max]`（越界即回報 `EFFECT_OUT_OF_TIER_RANGE`），**嚴禁因 `sponsored` 身分放寬任何數值**。

### 4.3 本機載入器與 Fallback 策略（對齊 PRD §10.2）
```ts
export interface LoadGameConfigOptions {
  /** 專案 content 根目錄路徑（讀取 genetics/、traits/、products/ 子目錄）。 */
  readonly contentDir: string;
  /** 驗證或讀檔失敗時是否降級使用內建已驗證預設設定（預設 false：嚴格失敗）。 */
  readonly allowFallback?: boolean;
}
export type LoadGameConfigResult =
  | { readonly ok: true; readonly config: ValidatedGameConfig; readonly source: 'content' }
  | {
      readonly ok: true;
      readonly config: ValidatedGameConfig;
      readonly source: 'fallback';
      readonly fallbackReason: readonly ConfigValidationError[];
    }
  | { readonly ok: false; readonly errors: readonly ConfigValidationError[] };
```
- **正常載入成功**：回傳 `{ ok: true, config, source: 'content' }`（不含 `fallbackReason`）。
- **嚴格模式（預設 `allowFallback: false`）**：任何檔案缺失、JSON 損毀、結構或級距驗證失敗，直接回傳 `{ ok: false, errors }`，**絕不回傳部分或未驗證設定**。
- **可控降級模式（`allowFallback: true`）**：載入或驗證失敗時，先驗證內建 `BUILT_IN_DEFAULT_CONFIG` 確認完整有效，回傳 `{ ok: true, config: fallbackConfig, source: 'fallback', fallbackReason: errors }`；若連備援都無效仍回傳 `{ ok: false, errors }`（符合 PRD §10.2 第 1.3～1.4 點）。
- **核心免費品必備檢查**：`loadGameConfig` 額外確認 `foodCatalog` 內 `free_basic_kibble` 與 `free_fresh_water` 存在且 `status === "active"`、`productType === "free"`，保障玩家免費照護底線（PRD §2.1 第 1 點）。若任一項缺失或非 `active`／`free`，處理方式**等同驗證失敗**（錯誤碼固定為 `REQUIRED_FREE_ITEM_MISSING`：嚴格模式回傳 `{ ok: false, errors }`，`allowFallback: true` 時降級改用內建預設並附於 `fallbackReason`）。

### 4.4 商業化批次匯入驗證設計（CSV / JSON）
- **支援來源模式（`FeedSourceType`）：** `manual`（內部建檔）、`partner_csv`、`partner_api`。
- **同批重複鍵防護：** 同一批輸入資料內若出現重複 `itemId`，或出現重複 `(partnerId, externalSkuId)`（兩者皆非 `null` 時），**直接拒絕整批**。
- **`syncedAt` 時間注入與格式驗證規則（保持純函式測試確定性）：**
  - `mergeCatalogFeed` 接收顯式參數 `syncedAt: string`（須驗證為有效完整 ISO-8601 時間戳，含日期、`T`、時分秒與時區 `Z`／`±HH:MM` 且為有效日曆日期，不合法即拒絕整批），核心函式內不呼叫系統時間。
  - CLI 提供 `--synced-at <ISO-8601>` 參數；未提供時由 CLI 層取執行當下 `new Date().toISOString()` 傳入核心。
- **內部建檔合併語意（`manual`）：**
  - 視為拾暖官方內部建檔：以 `itemId` 比對既有目錄，命中即整筆取代（允許更新 `gameBalance`）；新品 `status` 直接採用來源資料值（可為 `"active"`）；`externalSource.syncedAt` 一律固定寫為 `null`；最終仍必須全量通過 `validateFoodCatalogConfig`（7 級距天花板同樣嚴格檢核）。
- **外部匯入保護不變量（`partner_csv` / `partner_api`）：**
  1. **外部識別必填：** 外部模式下每筆來源的 `externalSource.partnerId` 與 `externalSource.externalSkuId` 皆必填（不得為 `null` 或空字串），缺漏即**拒絕整批**。
  2. **權限隔離與衝突防護：**
     - 若來源 `(partnerId, externalSkuId)` 命中既有商品，但來源 `itemId` 與既有 `itemId` 不同 → **拒絕整批**。
     - 若來源 `(partnerId, externalSkuId)` 命中既有商品 X，而來源 `itemId` 命中另一件既有商品 Y → **拒絕整批**。
     - 若來源 `itemId` 命中既有商品，但該既有商品的 `partnerId` 為 `null`（官方商品如 `free_basic_kibble`）或屬於不同 `partnerId` → **拒絕整批**（嚴禁跨品牌或篡改官方商品）。
  3. **合法命中既有商品（同 `partnerId` 且鍵值無衝突）：**
     - 僅允許更新 `vendorInfo`（**但強制保留既有 `vendorInfo.productType` 不可被外部篡改**）與 `externalSource.syncedAt`（寫入注入之 `syncedAt`）。
     - **強制保留既有 `gameBalance`（`category`、`price`、`gameEffect`、`status` 完全不受外部覆寫）**。
  4. **合法全新商品：**
     - 強制設定 `gameBalance.status = "pending_review"`（不得直接 `"active"` 上架），並寫入 `externalSource.syncedAt = syncedAt`。
  5. 合併完成後必須通過 `validateFoodCatalogConfig`，任何 1 筆級距違規或欄位缺失即全批拒絕，不覆寫輸出檔。
- **JSON 輸入格式：**
  - 同時接受 `FoodCatalogConfig`（`{ version, items }`）與 `FoodCatalogItem[]` 兩種格式。
  - 每筆項目的 `externalSource.feedSourceType` 亦須與 `--mode` 一致，不一致即拒絕整批；任何項目 `itemId` 為空即拒絕整批。
- **CSV 欄位格式與解析細節（扁平化單列對齊三區塊）：**
  - 欄位清單：`itemId,partnerId,externalSkuId,feedSourceType,name,productType,dataType,category,price,hunger,hydration,mood,status,crudeProteinPercent,crudeFatPercent,moisturePercent,ingredients,sourceName,sourceUrl,dataVerifiedAt,lastReviewedAt,disclaimer,imageUrl,purchaseUrl,promoCode`
  - **可為 `null` 欄位表示法**：CSV 儲存格為空字串 `""` 一律解析為 `null`（適用於 `partnerId`、`externalSkuId`、`sourceUrl`、`dataVerifiedAt`、`lastReviewedAt`、`disclaimer`、`imageUrl`、`purchaseUrl`、`promoCode`）。
  - **RFC 4180 支援**：須支援雙引號包覆、雙引號跳脫（`""`）、欄位內嵌逗號與 CRLF/LF 換行。
  - **`itemId` 必填**：任何一列 `itemId` 為空即拒絕整批（不得自動產生）。
  - **`--mode` 與列內 `feedSourceType` 衝突規則**：以 CLI `--mode` 為準；若任一列 `feedSourceType` 與 `--mode` 不一致即回報錯誤拒絕整批。
- **CLI 執行方式：**
  - `corepack pnpm import-catalog -- --mode <manual|partner_csv|partner_api> --input <path.csv|path.json> [--existing <catalog.json>] [--output <out.json>] [--synced-at <ISO-8601>]`
  - **`--mode` 為必填參數**，缺少或非法值即以非 0 退出（防呆避免誤用 `manual` 覆寫 `gameBalance`）。
  - CLI 參數解析須自動略過 `pnpm 9` 透傳之開頭 `--`。
  - 未指定 `--output` 時：僅執行驗證並輸出摘要與退出碼（合法 exit 0、違規 exit 非 0），不寫入檔案。
  - 未指定 `--existing` 時：以空白基準 `{ version: 'v1', items: [] }` 作為合併基準。

### 4.5 補充邊界定案與 Fail-Closed 收斂兜底原則（PO 2026-11-25 第 3 輪核准）
1. **未知欄位拒絕（Q16-A）：** 4 類設定檔驗證器與 JSON 匯入皆採嚴格物件結構檢核，遇到任何未定義的多餘鍵值一律拒絕（錯誤碼如 `UNKNOWN_FIELD`）。
2. **特徵池防重複（Q19-A）：** 同一品種同一圖層特徵池內不得出現重複 `trait`，出現即拒絕（錯誤碼如 `DUPLICATE_TRAIT`）。
3. **相容規則驗證器彈性（Q17-A）：** `validateAppearanceCompatibilityConfig` 驗證通用約束（`id` 唯一、`order` 為正整數且嚴格遞增、鍵值合法、`safeDefaultAppearance` 不觸發規則）；3 條固定 `id` 與條件由 `content-files.test.ts` 逐值核對。
4. **外部模式 SKU 衝突與驗證粒度（Q14-A、Q15-B）：**
   - 來源 `itemId` 命中同 `partnerId` 既有商品，但 `externalSkuId` 不同或既有值為 `null`（且 `(partnerId, externalSkuId)` 未命中任何商品）→ **拒絕整批**。
   - 外部模式合法更新時，來源中被丟棄的 `gameBalance` 與 `productType` 僅驗證結構與型別，不擋級距；最終合併後之完整目錄與所有新品一律執行完整 `validateFoodCatalogConfig`（7 級距全檢）。
   - 外部模式合法更新時，`externalSource` 之 `feedSourceType`、`partnerId`、`externalSkuId` 皆保留既有值（僅更新 `syncedAt`）。
5. **CSV 標題列與空行規則（Q18-A）：** 標題列必填，且 25 欄名稱與順序須完全一致；純空白行（含檔尾換行）直接略過。
6. **其他已確認實作約定（PO 確認接受第 3 輪 10 項預設理解）：**
   - `syncedAt` ISO-8601 允許小數秒（相容 `Date.prototype.toISOString()`），時分秒與時區偏移皆做合法範圍檢查（不接受閏秒 `60`）。
   - `mock` 商品若填寫了非 `null` 之 `sourceUrl` 或 `dataVerifiedAt`，仍檢查格式合法性（`http://`/`https://`、有效 `YYYY-MM-DD`）。
   - `price` 與 `gameEffect` 要求有限數值並落於級距閉區間，不額外強制整數。
   - 未明確要求非空之字串欄位（`displayName`、規則 `id`、`imageUrl` 等）只檢查型別。
   - `--existing` 僅接受 `FoodCatalogConfig` 格式，合併前先執行驗證，不合法即拒絕整批。
   - 合併順序：既有項目維持原順序並原地更新，新品依輸入順序附加於尾端；`version` 沿用既有值。
   - `loadGameConfig` 為 `async` 函式並回傳 `Promise<LoadGameConfigResult>`；CLI 實跑測試放於 `packages/config-loader/test/`，以 `tsx` 子行程執行並寫入系統暫存目錄。
   - `free_fresh_water` 之 `nutrition` 固定採 `0 / 0 / 100`。
7. **Fail-Closed 收斂兜底原則：**
   - 凡本設計與 Master PRD 未明列之異常輸入、格式錯誤或鍵值衝突，一律採最保守之 **fail-closed 策略（拒絕並回報 `UPPER_SNAKE_CASE` 錯誤碼）**。
   - 不涉及 Master PRD 數值、商業公平或設計衝突的次要實作細節（如 `mergeCatalogFeed`／`parseCatalogCsv` 函式簽章、內部結構與測試配置），授權實作者在不違背本設計前提下自行決定，並於交付摘要完整列明；**僅於發現真正的 PRD 衝突、設計矛盾或實作不可行時才停工回報 `BLOCKED`**。

---

## 5. PO 已定案之 3 項設計決策（2026-11-25 確認）

1. **Workspace 內部連結與 `pnpm-lock.yaml` 更新：** 允許在 `packages/config-loader/package.json` 新增內部連結 `"@shinuan/contracts": "workspace:*"` 並同步更新 `pnpm-lock.yaml`（**零新增任何外部 npm 套件**），以及在根 `package.json` 新增 `"import-catalog"` script。
2. **CLI 檔案命名與執行方式：** 保留規格地圖命名 `scripts/import-catalog.mjs`，透過 `tsx` 以相對路徑匯入 `packages/config-loader/src/index.ts` 共用同一份驗證核心（不複製第二份驗證邏輯，亦不更動根目錄依賴）。
3. **內建預設設定（`defaults.ts`）與真實 `content/*.json` 同步檢核：** 於單元測試強制斷言 `BUILT_IN_DEFAULT_CONFIG` 與 `content/` 4 份真實 JSON 逐值一致，確保預設 Fallback 永遠不會與正式設定漂移。

---

## 6. 驗收對應（規劃之 AC）

1. 遠端 PR 異動清單僅限核准路徑（`docs/specs/SPEC-01-contracts-config-genetics/S1-02-config-loader-design.md`、`content/**`、`packages/config-loader/**`、`scripts/import-catalog.mjs`、`package.json`、`pnpm-lock.yaml`、`packages/contracts/test/**`），**零新增外部 npm 依賴**，0 筆涉及禁區／`docs/PRD/`／`packages/game-core/`。
2. `content/` 4 份靜態 JSON 逐字通過驗證且數值 100% 吻合 Master PRD v2.1.29（6 品種、7 圖層權重、相容規則 1～4、8 款商品與 7 級距）。
3. 級距白名單驗證測試涵蓋：7 級距合法邊界全過、任何 1 維度越界（含 `sponsored` 品牌商品嘗試超標）全擋、缺 `sourceUrl` 的 `real` 商品被擋。
4. 載入器 Fallback 測試涵蓋：缺檔／壞 JSON／非法設定於嚴格模式報錯、於 `allowFallback: true` 安全退回已驗證預設並回傳降級原因。
5. 批次匯入測試涵蓋：CSV 與 JSON 匯入、外部模式（`partner_csv`/`partner_api`）絕不覆寫既有 `gameBalance`、外部新品強制 `pending_review`、CLI 實跑退出碼 `0`（合法）與非 `0`（違規）。
6. `corepack pnpm typecheck`、`corepack pnpm test`、`node scripts/check-shinuan-integrity.mjs` 全數退出碼 `0`。
