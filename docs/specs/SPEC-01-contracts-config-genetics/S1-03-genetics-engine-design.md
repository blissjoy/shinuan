<a id="top"></a>

# SHINUAN-S1-03 技術設計文件（Design Spec）：`@shinuan/game-core` `GeneticsEngine` 與 `apps/local-sandbox` 領養盲盒可視化頁

> **導覽與追溯：** [← 回到規格入口](../README.md#entry-spec-01) ｜ [所屬規格 SPEC-01](./SPEC.md) ｜ [Phase A 規格地圖](../PHASE-A-SPEC-MAP.md#spec-01) ｜ [Master PRD v2.1.31](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [GitHub Issue #9](https://github.com/blissjoy/shinuan/issues/9)

> **狀態：APPROVED（PO 已於 2026-11-26 審閱定案，並明確指示實作階段若有疑異須停止並提出；2026-11-28 透過 `SHINUAN-DOC-09` 提前納入 Repo 供外部與內部完整審查，程式碼實作於 Issue `#9` 分支續行）**
> **版本追溯備註：** 本設計書於 `Master PRD v2.1.29` 定案，負責純品種遺傳引擎（§8.A.1～§8.A.4、`TC-01`/`TC-02`）；與 `Master PRD v2.1.30 / v2.1.31` 新增之個體父母真實遺傳模式（§8.A.5、`S1-04`）雙軌並存且 100% 向後相容，純品種數值與預期測試結果零變動。

- **Task ID / GitHub Issue：** `SHINUAN-S1-03` / `#9`（`https://github.com/blissjoy/shinuan/issues/9`）
- **所屬 Epic 與規格來源：** `docs/specs/PHASE-A-SPEC-MAP.md`（`SPEC-01` 契約、設定與基因引擎、`§三` 可視化驗收看板 Tab 1）
- **對應 Master PRD 章節：** `Master PRD v2.1.31` §0、§3.1、§3.2（第一層、第二層）、§5.1、§5.2、§5.3、§8.A.1～§8.A.4、§8.B.2（第 3 點）、§8.E.2（`TC-01`、`TC-02`）、§11.1、§11.2
- **承接前序設計：**
  - `docs/specs/SPEC-01-contracts-config-genetics/S1-01-contracts-design.md`（完全相容既有 `@shinuan/contracts`，無須更動 `packages/contracts/src/**`）
  - `docs/specs/SPEC-01-contracts-config-genetics/S1-02-config-loader-design.md`（直接消費 `ValidatedGameConfig` 與 `loadGameConfig`，無須更動 `packages/config-loader/**` 與 `content/**`）
- **預計對應程式碼路徑：** `packages/game-core/**`、`apps/local-sandbox/**`、`tests/unit/**`、`tests/fixtures/genetics-golden-v1.json`、`docs/specs/SPEC-01-contracts-config-genetics/S1-03-genetics-engine-design.md`、`pnpm-lock.yaml`（僅內部 Workspace 連結）
- **權威性聲明：** 本文件為模組技術設計與驗證契約紀錄，不得覆寫或修改 `Master PRD v2.1.31`；若有衝突，一律以 Master PRD 為準。

---

## 1. 設計目標與邊界

### 1.1 In-Scope（本單負責）

1. **確定性 PRNG 模組（`packages/game-core`）：**
   - 純 ES2022 UTF-8 編碼器 + **FNV-1a 32-bit** 字串雜湊（零 `TextEncoder` / Node / Browser 全域依賴）。
   - **`mulberry32-v1`** 確定性偽隨機數產生器（實作 `@shinuan/contracts` 之 `RandomGenerator` 介面）。
2. **`GeneticsEngine` 完整 6 步驟純函式引擎（`packages/game-core`）：**
   - 步驟 1：特殊顯性骨架規則（`munchkin` `body` 90/10 與 50/25/25；`exotic` `head` 90/10 與 60/40）。
   - 步驟 2：一般未鎖定圖層獨立抽選（固定順序 `head -> ears -> eyes -> pupilColor -> coatPattern -> tail -> body`；90/10 同種純種、30/50/20 米克斯＋純種、40/40/20 其他配對；變異路徑 75/25 稀有突變或 100% 通用白名單等權重重組）。
   - 步驟 3：確定性相容性修正（規則 1 -> 2 -> 3 單次循序套用 + 最終合法性檢查 + 規則 4 `SAFE_DEFAULT_APPEARANCE` 終極回退）。
   - 步驟 4：動態毛色微調 `colorParams`（同種 100%、米克斯＋純種 30/70、其他跨配 50/50；區間色 RGB 線性插值；HSL 明度與飽和度確定性 `±8%` 微調）。
   - 步驟 5：小怪癖獨立抽選（嚴格排在步驟 1～4 之後，50% 0 個 / 35% 1 個 / 15% 2 個，自 MVP 4 款白名單不重複等權重抽取）。
   - 步驟 6：初始基礎性格 `breedBase` 計算（同種繼承、米克斯＋純種 30%/70%、其他跨配 50%/50%）。
   - 完整不可變輸出（`PetGenetics`、`BasePersonality`、`readonly QuirkId[]` 與唯讀診斷追蹤 `GeneticsGenerationTrace`）。
3. **自動化驗收測試與 Golden Fixture（`tests/` ＋ `packages/game-core/test/`）：**
   - **`TC-01`**（確定性連抽 10 次一致、不同 seed PRNG 序列相異、步驟 5 獨立不影響步驟 1～4 外觀、首次鎖定 `tests/fixtures/genetics-golden-v1.json`）。
   - **`TC-02`**（1,000 組獨立種子 `seed_0001 ~ seed_1000` 統計驗收，涵蓋 PRD 全部 6 組必測配對與跨品種／小怪癖／相容規則不變量）。
   - 相容規則 1～4（含規則 1 抑止規則 3 級聯測試與規則 4 回退測試）、FNV-1a 標準向量、HSL 色彩轉換與異常輸入 fail-closed 單元測試。
4. **`apps/local-sandbox` 領養盲盒與基因統計可視化頁（Tab 1）：**
   - 保留既有系統健康狀態頁與 `pnpm sandbox --once` 相容性。
   - 新增 Tab 1「領養盲盒與基因統計」：選擇父母品種與 seed 抽盲盒生貓（顯示 7 層特徵卡、稀有突變與相容修正標記、實際毛色色塊、基礎性格數值條、小怪癖標籤、鎖定 JSON），並提供一鍵抽 1,000 隻（`seed_0001 ~ seed_1000`）與 `TC-02` 快捷組合分布長條圖。
   - **嚴格單向依賴：** 前端僅發送請求與繪製結果，所有基因計算 100% 在伺服器端呼叫 `@shinuan/game-core`。

### 1.2 Out-of-Scope（明確排除）

- `PetState` 完整開局工廠、存檔初始化、`TimeEngine`、`EconomyEngine`、`BehaviorEngine` 與 `GameEngine` 總組裝（分屬 `S2`～`S4`）。
- 30 日後天養成記憶重算與 `QuirkModifiers` 行為機率套用邏輯（屬 `S4-01`）。
- 修改 `packages/contracts/src/**`、`packages/config-loader/**`、`content/**`、`scripts/import-catalog.mjs`、`docs/PRD/**`（維持 PR 單一職責）。
- 任何外部 npm 依賴套件（零新增 Vite、React、圖表庫或工具套件）。

---

## 2. 規格追溯對照表（Master PRD ↔ 模組檔案 ↔ 責任）

| Master PRD v2.1.31 章節 | 規格重點 | 交付路徑 | 設計責任 |
| --- | --- | --- | --- |
| §0、§5.1、§8.A.1、§11.1 | `PRNGAlgorithmVersion` (`mulberry32-v1`)、FNV-1a 32-bit、`RandomGenerator` 注入與純淨度 | `packages/game-core/src/engine/prng.ts` | 純 ES2022 UTF-8 編碼 + FNV-1a 32-bit + `mulberry32-v1` |
| §3.1、§8.A.1～§8.A.4 | 7 大圖層固定順序、特殊骨架規則、三種配對權重、4 層稀有突變與通用白名單 | `packages/game-core/src/domain/genetics-constants.ts`、`packages/game-core/src/engine/genetics-engine.ts` | 逐值對齊 PRD，鎖定每步 PRNG 消費順序 |
| §8.A.3 第 2 點 | 規則 1 -> 2 -> 3 單次循序替換 + 終極驗證 + 規則 4 `SAFE_DEFAULT_APPEARANCE` 回退 | `packages/game-core/src/engine/appearance-compatibility.ts` | 獨立純函式模組，可單獨驗證規則級聯與回退 |
| §8.A.1、§8.A.2、§8.A.4 步驟 4 | 色盤品種權重、區間色線性插值、`ColorParams` HSL `±8%` 微調 | `packages/game-core/src/engine/color-params.ts` | 純數學 RGB <-> HSL 轉換與無彩色保護 |
| §3.2 第一層、第二層、§8.A.4 步驟 5、§8.B.2 | 初始 `breedBase` 跨品種公式；步驟 5 獨立抽取 0/1/2 款 MVP 小怪癖 | `packages/game-core/src/engine/genetics-engine.ts` | 確保步驟 5 絕不影響步驟 1～4 外觀 |
| §8.E.2 `TC-01`、`TC-02` | Golden Fixture 鎖定、確定性測試、1,000 種子全組合統計驗收 | `tests/fixtures/genetics-golden-v1.json`、`tests/unit/tc-01-genetics-determinism.test.ts`、`tests/unit/tc-02-genetics-statistics.test.ts` | 完整涵蓋 PRD 驗收劇本與邊界不變量 |
| §5.2、§7、§11.2、Spec Map §三 | 本機可視化驗收看板 Tab 1（盲盒生貓＋色塊＋1,000 隻分布圖） | `apps/local-sandbox/src/**`、`apps/local-sandbox/test/**` | 零外部套件 HTTP 服務 + 零規則計算純 UI |

---

## 3. 模組架構與檔案清單

```text
packages/game-core/
├── package.json                                  # 新增內部連結 "@shinuan/contracts": "workspace:*"（零外部套件）
├── src/
│   ├── index.ts                                  # 保留 GAME_CORE_PACKAGE_NAME，統一 re-export domain / engine / ports
│   ├── ports/
│   │   └── index.ts                              # re-export Clock / RandomGenerator / GameRepository 型別（自 @shinuan/contracts）
│   ├── domain/
│   │   ├── index.ts
│   │   ├── genetics-constants.ts                 # PRNG_ALGORITHM_VERSION、GENETICS_VERSION、各配對與變異常數、通用白名單
│   │   └── genetics-types.ts                     # GeneticsConfig、GeneticsGenerateInput、GeneticsGenerationResult、GeneticsGenerationTrace、GeneticsError
│   └── engine/
│       ├── index.ts
│       ├── prng.ts                               # encodeUtf8、fnv1a32、createMulberry32、createSeededRandom
│       ├── color-params.ts                       # parseHexRgb、formatRgbHex、rgbToHsl、hslToRgb、interpolateHexRgb、adjustHexHsl、generateColorParams
│       ├── appearance-compatibility.ts           # applyCompatibilityRules（規則 1->2->3 單次循序 + 最終檢核 + 規則 4 回退）
│       └── genetics-engine.ts                    # calculateInitialBasePersonality、drawQuirks、generateCatGenetics、GeneticsEngine
└── test/
    ├── smoke.test.ts                             # 既有測試保留
    ├── prng.test.ts                              # FNV-1a 32-bit 向量、UTF-8 編碼、mulberry32-v1 確定性與 [0, 1) 邊界
    ├── color-params.test.ts                      # RGB<->HSL、區間線性插值、無彩色保護、±8% 範圍與大寫 HEX
    ├── appearance-compatibility.test.ts          # 規則 1/2/3、規則 1 抑止規則 3、規則 4 觸發回退
    └── genetics-engine.test.ts                   # 步驟 1～6 單元測試、注入 mock rng 精確邊界、fail-closed 錯誤碼

apps/local-sandbox/
├── package.json                                  # 新增內部連結 @shinuan/{contracts,config-loader,game-core}: workspace:*（零外部套件）
├── src/
│   ├── status.ts                                 # 保留既有 SandboxStatus / DEFAULT_STATUS / renderStatusPage（向下相容 smoke.test）
│   ├── api.ts                                    # createSandboxHandler（處理 /、/api/status、/api/breeds、/api/genetics/roll、/api/genetics/simulate）
│   ├── page.ts                                   # 渲染 Dashboard HTML（系統健康狀態 + Tab 1 領養盲盒與基因統計，純呈現零規則）
│   └── server.ts                                 # 載入 content/（loadGameConfig）並啟動 127.0.0.1 HTTP 服務；保留 --once 行為
└── test/
    ├── smoke.test.ts                             # 既有測試保留
    └── sandbox-api.test.ts                       # 測試 /、/api/status、/api/breeds、/api/genetics/roll、/api/genetics/simulate 與 400/404

tests/
├── fixtures/
│   └── genetics-golden-v1.json                   # TC-01 正式 Golden Fixture（經獨立 QA 與 Reviewer 逐步核對後首次鎖定）
└── unit/
    ├── tc-01-genetics-determinism.test.ts        # PRD §8.E.2 TC-01 驗收測試
    └── tc-02-genetics-statistics.test.ts         # PRD §8.E.2 TC-02（1,000 種子全組合）驗收測試
```

**Game Core 純淨度硬性守門提醒（`scripts/check-shinuan-integrity.mjs`）：**
- `packages/game-core/tsconfig.json` 強制 `"types": []`（ES2022），禁止使用任何 Node／Browser 全域 API（包含 `TextEncoder`、`Buffer`、`window`、`document`、`fs`、`path`、`process`、`Date.now`、`Math.random`、`getTimezoneOffset`）。
- 由於守門腳本會掃描非註解原始碼（含字串字面值）中的禁用識別字，**`packages/game-core/` 內之變數名、函式名、錯誤碼與錯誤訊息亦不得包含 `window`、`document`、`process` 等獨立識別字**。

---

## 4. 核心演算法與規格細節（零歧義鎖定）

### 4.1 版本識別常數與錯誤契約

```ts
export const PRNG_ALGORITHM_VERSION = 'mulberry32-v1' as const;
export const GENETICS_VERSION = '1.0.0' as const;

export type GeneticsErrorCode =
  | 'INVALID_SEED'
  | 'INVALID_BREED'
  | 'INVALID_PET_ID'
  | 'INVALID_RANDOM_VALUE'
  | 'CONFIG_VERSION_MISMATCH'
  | 'BREED_CONFIG_MISSING'
  | 'TRAIT_POOL_MISSING'
  | 'EMPTY_COLOR_PALETTE'
  | 'INVALID_HEX_COLOR';

export class GeneticsError extends Error {
  readonly code: GeneticsErrorCode;
  constructor(code: GeneticsErrorCode, message: string) {
    super(message);
    this.name = 'GeneticsError';
    this.code = code;
  }
}
```

- **輸入 fail-closed 驗證（步驟 0）：**
  1. `seed` 必須為非空字串（`typeof seed === 'string' && seed.length > 0`），否則拋出 `INVALID_SEED`。
  2. `fatherBreed` 與 `motherBreed` 必須皆為 `BREED_IDS` 合法成員，否則拋出 `INVALID_BREED`。
  3. `fatherPetId` / `motherPetId` 若非 `undefined` 且非 `null`，必須為非空字串，否則拋出 `INVALID_PET_ID`（省略時一律正規化為 `null`）。
  4. `config.breeds.version`、`config.traits.version`、`config.appearanceCompatibility.version` 三者必須完全一致且為非空字串（否則拋出 `CONFIG_VERSION_MISMATCH`）；該共同版本即作為 `PetGenetics.rulesVersion`（v1 為 `"v1"`）。
  5. `fatherBreed` 與 `motherBreed` 必須存在於 `config.breeds.breeds` 與 `config.traits.traitPools`，且對應 `colorPalette` 非空（否則拋出 `BREED_CONFIG_MISSING` / `TRAIT_POOL_MISSING` / `EMPTY_COLOR_PALETTE`）。
  6. 每次呼叫 `rng.next()` 皆檢查 `Number.isFinite(v) && v >= 0 && v < 1`，若外部注入之 mock `rng` 回傳越界值（如 `NaN`、`-0.1`、`1.0`）立即拋出 `INVALID_RANDOM_VALUE`。

---

### 4.2 確定性 PRNG：純 ES2022 UTF-8 + FNV-1a 32-bit + `mulberry32-v1`

1. **純 ES2022 UTF-8 編碼（`encodeUtf8(input: string): Uint8Array`）：**
   - 嚴格遵循 UTF-8 / WHATWG Encoding 規範將 JS UTF-16 字串轉為位元組序列：
     - `0x0000..0x007F`：1 byte
     - `0x0080..0x07FF`：2 bytes
     - 合法代理對（High surrogate `0xD800..0xDBFF` 後接 Low surrogate `0xDC00..0xDFFF`）：組合為 `0x10000..0x10FFFF` 輸出 4 bytes
     - 孤立代理碼位（lone surrogate）：替換為 U+FFFD（`0xEF, 0xBF, 0xBD`）
     - 其餘 `0x0800..0xFFFF`：3 bytes
   - 測試端須以 Node 原生 `new TextEncoder().encode(...)` 交叉驗證 ASCII、繁體中文、Emoji 與孤立代理字元逐位元組一致。

2. **FNV-1a 32-bit（`fnv1a32(seed: string): number`）：**
   ```ts
   const FNV1A_32_OFFSET_BASIS = 0x811c9dc5;
   const FNV1A_32_PRIME = 0x01000193;

   export function fnv1a32(seed: string): number {
     const bytes = encodeUtf8(seed);
     let hash = FNV1A_32_OFFSET_BASIS;
     for (let i = 0; i < bytes.length; i += 1) {
       hash ^= bytes[i]!;
       hash = Math.imul(hash, FNV1A_32_PRIME);
     }
     return hash >>> 0;
   }
   ```
   - 已知標準驗證向量：`fnv1a32("") === 0x811c9dc5`、`fnv1a32("a") === 0xe40c292c`、`fnv1a32("foobar") === 0xbf9cf968`。

3. **Mulberry32（`createMulberry32(seedUint32: number): RandomGenerator`）：**
   ```ts
   export function createMulberry32(seedUint32: number): RandomGenerator {
     let state = seedUint32 >>> 0;
     return {
       next(): number {
         state = (state + 0x6d2b79f5) >>> 0;
         let t = Math.imul(state ^ (state >>> 15), 1 | state);
         t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
         return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
       },
     };
   }

   export function createSeededRandom(seed: string): RandomGenerator {
     return createMulberry32(fnv1a32(seed));
   }
   ```
   - 嚴格保證輸出落於半開區間 `[0, 1)`，且跨 Node／Browser／React Native（Hermes / V8 / JSC）位元層級完全一致。

---

### 4.3 遺傳生成 6 步驟與精確 PRNG 消費順序（`GeneticsEngine`）

全程僅使用**單一 `RandomGenerator` 實例**（預設為 `createSeededRandom(seed)`；單元測試可選擇透過 `rng?: RandomGenerator` 注入受控實例），並依以下**不可變動之固定順序**消費亂數：

#### 共用抽取輔助函式（鎖定規則）

- **等權重單選 `pickUniform(items, rng)`：**
  - 若 `items.length === 1`：直接回傳 `items[0]`，**不消耗 `rng.next()`**。
  - 若 `items.length > 1`：消耗 1 次 `r = nextRandom(rng)`，回傳 `items[Math.floor(r * items.length)]`。
- **權重池單選 `pickWeightedTrait(pool, rng)`（對齊 PRD §3.1「若該圖層特徵池有多個候選值，則依池內權重再抽一次」）：**
  - 若 `pool.length === 1`：直接回傳 `pool[0].trait`，**不消耗 `rng.next()`**。
  - 若 `pool.length > 1`：消耗 1 次 `r = nextRandom(rng)`，依陣列順序累加 `acc += entry.weight`，回傳第一個滿足 `r < acc` 之 `entry.trait`；浮點尾端保護回傳最後一筆 `pool[pool.length - 1].trait`。
- **通用特徵白名單 `COMMON_TRAIT_WHITELISTS`（保留 `@shinuan/contracts` `APPEARANCE_LAYER_TRAITS` 原順序）：**
  - `head`（4）：`['standard_round', 'chubby_round', 'flat_face', 'square_muzzle']`
  - `ears`（3，排除 `folded_tip`）：`['pointed_medium', 'small_round', 'tufted_large']`
  - `eyes`（3）：`['almond', 'big_round', 'droopy_cute']`
  - `pupilColor`（4，排除 `heterochromia_blue_gold`）：`['amber', 'emerald', 'sapphire', 'copper']`
  - `coatPattern`（6，排除 `starry_rare`）：`['solid', 'tabby_mackerel', 'bicolor_tuxedo', 'colorpoint', 'calico', 'tortoiseshell']`
  - `tail`（3，排除 `kinked_kirin`）：`['long_straight', 'fluffy_plume', 'short_bobtail']`
  - `body`（5）：`['normal', 'chubby', 'short_legs', 'large_fluffy', 'giant_fluffy']`

#### 步驟 1：特殊顯性骨架規則（PRD §8.A.4 步驟 1）

按固定順序依序檢查（先 `munchkin` `body`，後 `exotic` `head`；若雙親同時包含 `munchkin` 與 `exotic`，兩條規則皆依此順序執行）：

1. **曼赤肯（`munchkin`）`body` 規則**（當 `fatherBreed === 'munchkin' || motherBreed === 'munchkin'` 時觸發，並鎖定 `'body'`）：
   - 雙親皆為 `munchkin`：消耗 1 次 `r = nextRandom(rng)`：
     - `r < 0.90` -> `'short_legs'`
     - `else` -> `'normal'`
   - 僅一方為 `munchkin`（令 `otherBreed` 為另一方品種）：消耗 1 次 `r = nextRandom(rng)`：
     - `r < 0.50` -> `'short_legs'`
     - `r < 0.75` -> `pickWeightedTrait(traitPools[otherBreed].body, rng)`（如 `maine_coon` 為 `'giant_fluffy'`）
     - `else` -> `'normal'`
   - 記錄 `trace.layerSources.body = 'special_rule'`。
2. **異國短／長毛（`exotic`）`head` 規則**（當 `fatherBreed === 'exotic' || motherBreed === 'exotic'` 時觸發，並鎖定 `'head'`）：
   - 雙親皆為 `exotic`：消耗 1 次 `r = nextRandom(rng)`：
     - `r < 0.90` -> `'flat_face'`
     - `else` -> `'standard_round'`
   - 僅一方為 `exotic`（令 `otherBreed` 為另一方品種）：消耗 1 次 `r = nextRandom(rng)`：
     - `r < 0.60` -> `'flat_face'`
     - `else` -> `pickWeightedTrait(traitPools[otherBreed].head, rng)`
   - 記錄 `trace.layerSources.head = 'special_rule'`。

#### 步驟 2：一般圖層獨立抽選（PRD §8.A.4 步驟 2、§3.1 第 3 點）

依 `APPEARANCE_LAYER_NAMES` 固定順序遍歷 `['head', 'ears', 'eyes', 'pupilColor', 'coatPattern', 'tail', 'body']`：
- 若該層已於步驟 1 鎖定，**直接略過**（不消耗 `rng.next()`）。
- 否則進入 **第一階段（來源抽選）**，消耗 1 次 `rSource = nextRandom(rng)`：
  - **配對類型 A — 雙親同種純種品種貓**（`fatherBreed === motherBreed && fatherBreed !== 'domestic'`）：
    - `rSource < 0.90` -> 來源為 `same_breed`，呼叫 `pickWeightedTrait(traitPools[fatherBreed][layer], rng)`。
    - `else` -> 進入第二階段（變異路徑）。
  - **配對類型 B — 米克斯 ＋ 純種品種貓**（`(fatherBreed === 'domestic') !== (motherBreed === 'domestic')`，令 `purebred = fatherBreed === 'domestic' ? motherBreed : fatherBreed`）：
    - `rSource < 0.30` -> 來源為 `domestic`，呼叫 `pickWeightedTrait(traitPools['domestic'][layer], rng)`。
    - `rSource < 0.80` -> 來源為 `purebred`，呼叫 `pickWeightedTrait(traitPools[purebred][layer], rng)`。
    - `else` -> 進入第二階段（變異路徑）。
  - **配對類型 C — 其他配對**（不同純種品種貓跨配，或 `domestic + domestic`）：
    - `rSource < 0.40` -> 來源為 `father`，呼叫 `pickWeightedTrait(traitPools[fatherBreed][layer], rng)`。
    - `rSource < 0.80` -> 來源為 `mother`，呼叫 `pickWeightedTrait(traitPools[motherBreed][layer], rng)`。
    - `else` -> 進入第二階段（變異路徑）。
- **第二階段（變異路徑）**（僅第一階段抽中變異時進入）：
  - **設有稀有突變之 4 層（`ears`、`pupilColor`、`coatPattern`、`tail`）：** 消耗 1 次 `rMut = nextRandom(rng)`：
    - `rMut < 0.75` -> 來源為 `mutation_common`，呼叫 `pickUniform(COMMON_TRAIT_WHITELISTS[layer], rng)`（不排除父母既有特徵，嚴格對齊 PRD §3.1「從該圖層合法通用特徵白名單等權重隨機重組」）。
    - `else`（`rMut >= 0.75`，佔 25%）-> 來源為 `mutation_rare`，直接取 `RARE_MUTATION_TRAITS[layer]`（不額外消耗 `rng.next()`）。
  - **無稀有突變之 3 層（`head`、`eyes`、`body`）：** 來源為 `mutation_common`，直接呼叫 `pickUniform(COMMON_TRAIT_WHITELISTS[layer], rng)`。

#### 步驟 3：確定性相容性修正（PRD §8.A.3 第 2 點、§8.A.4 步驟 3）

本步驟**零 `rng.next()` 消耗**，獨立匯出函式 `applyCompatibilityRules(layers, compatibilityConfig)`：

1. 依 `order` 嚴格遞增順序（v1 為規則 1 `flat_face_giant_body` -> 規則 2 `colorpoint_amber_pupil` -> 規則 3 `folded_ear_giant_body`）執行**單次循序套用（不反覆迴圈重跑）**。
2. 每次套用直接以更新後的 `current` 作為下一條規則之輸入（例：`head: flat_face` + `body: giant_fluffy` + `ears: folded_tip` 時，規則 1 先將 `body` 改為 `chubby`，輪到規則 3 時條件不符故不觸發），並將觸發之規則 `id` 依序記錄於 `appliedRuleIds`。
3. 單次循序套用完畢後執行**最終合法性檢查**：
   - (a) 全部 7 個圖層值皆屬於對應 `APPEARANCE_LAYER_TRAITS[layer]`；
   - (b) 不再滿足 `rules` 中任何一條規則之 `when` 條件。
4. 若最終檢查未通過（例如外部測試注入會造成連鎖新衝突的規則集或異常圖層值），觸發**規則 4 終極回退**：改以 `compatibilityConfig.safeDefaultAppearance`（v1 等於 `SAFE_DEFAULT_APPEARANCE_LAYERS`）取代並標記 `fallbackTriggered = true`。

#### 步驟 4：動態毛色微調 `colorParams`（PRD §8.A.1、§8.A.2、§8.A.4 步驟 4）

1. **決定採用之品種色盤（`paletteBreed`）：**
   - 同品種（`fatherBreed === motherBreed`）：`paletteBreed = fatherBreed`（**0 次** `rng.next()`）。
   - 米克斯 ＋ 純種品種貓：消耗 1 次 `rPal = nextRandom(rng)`，`rPal < 0.30` -> `'domestic'`，否則 -> `purebred`。
   - 其他跨品種（兩方皆不同純種）：消耗 1 次 `rPal = nextRandom(rng)`，`rPal < 0.50` -> `fatherBreed`，否則 -> `motherBreed`。
2. **從選定品種之 `colorPalette` 等權重抽出一組色碼：**
   - `swatch = pickUniform(breedDef.colorPalette, rng)`（6 大品種在 v1 皆有 2～4 組色碼，皆消耗 1 次 `rng.next()`）。
3. **解析主色基準 HEX：**
   - 若 `swatch.primary.kind === 'single'`：直接取 `swatch.primary.hex`（**0 次** `rng.next()`）。
   - 若 `swatch.primary.kind === 'range'`：消耗 1 次 `t = nextRandom(rng)`，於 RGB 空間線性插值取整：
     `c = Math.round(c1 + (c2 - c1) * t)`（分別對 R、G、B 通道計算，避免灰階色相環跳動）。
4. **抽取 HSL 明度與飽和度微調係數（嚴格依序先明度、後飽和度）：**
   - `lightnessDelta = roundDelta(-0.08 + nextRandom(rng) * 0.16)`
   - `saturationDelta = roundDelta(-0.08 + nextRandom(rng) * 0.16)`
   - 其中 `roundDelta(v)` 將數值四捨五入至小數第 4 位並 Clamp 於 `[-0.08, +0.08]`（且將 `-0` 正規化為 `0`），兼顧精度（`0.0001` 遠細於 8-bit RGB 步進 `1/255 ≈ 0.0039`）與 JSON 跨引擎穩定序列化。
5. **套用 HSL 微調並輸出大寫 `#RRGGBB`：**
   - 採用標準 W3C RGB <-> HSL 轉換公式（`h ∈ [0, 360)`、`s ∈ [0, 1]`、`l ∈ [0, 1]`）。
   - **無彩色保護規則：** 當基準色為純無彩色（`r === g && g === b`，即 `s === 0`，如 `#2B2B2B`、`#F8F8F8`、`#333333`）時，維持 `s' = 0`（僅套用 `l' = clamp(l + lightnessDelta, 0, 1)`），避免黑貓／白貓因 `h = 0` 而偏紅；一般彩色則同時套用 `s' = clamp(s + saturationDelta, 0, 1)` 與 `l' = clamp(l + lightnessDelta, 0, 1)`。
   - 若 `swatch.secondaryHex !== null`，對 `swatch.secondaryHex` 套用相同之 `(lightnessDelta, saturationDelta)`（同樣遵守無彩色保護規則）得到最終 `secondaryHex`；若為 `null` 則維持 `null`。
   - 輸出之 `primaryHex` 與非空 `secondaryHex` 一律格式化為 6 碼大寫 HEX（`/^#[0-9A-F]{6}$/`）。

#### 步驟 5：小怪癖獨立抽選（PRD §3.2 第二層、§8.A.4 步驟 5、§8.B.2）

- **強制排在步驟 1～4 全部完成之後執行**，確保新增、停用或調整小怪癖抽取邏輯絕不改變步驟 1～4 之任何外觀輸出（對齊 `TC-01` 驗證項）。
- 消耗 1 次 `rCount = nextRandom(rng)` 決定個數：
  - `rCount < 0.50` -> `0` 個（直接回傳 `[]`，不再消耗亂數）。
  - `rCount < 0.85` -> `1` 個。
  - `else` -> `2` 個。
- 建立可選池副本 `remaining = [...MVP_QUIRK_IDS]`（順序固定為 `['cursor_hunter', 'sun_bather', 'treat_lover', 'shy_observer']`），迴圈抽取 `count` 次：
  - `idx = Math.floor(nextRandom(rng) * remaining.length)`
  - 取出 `remaining[idx]` 加入結果並以 `remaining.splice(idx, 1)` 移除（不重複、等權重、確定性順序）。

#### 步驟 6：初始基礎性格 `breedBase` 計算（PRD §3.2 第一層、§8.A.2）

本步驟**零 `rng.next()` 消耗**，獨立匯出函式 `calculateInitialBasePersonality(fatherBreed, motherBreed, breedsConfig)`，對 `affection`、`laziness`、`tsundere`、`curiosity` 四維度分別計算：

- 同品種雙親（`fatherBreed === motherBreed`）：`value = parentBase`
- 米克斯 ＋ 純種品種貓（不論米克斯為父或母）：
  `value = Math.round((domesticBase * 3 + purebredBase * 7) / 10)`
  *(註：與 PRD `Math.round(domesticBase * 0.3 + purebredBase * 0.7)` 數學完全等價，以整數縮放除以 10 消除 IEEE-754 二進位誤差，例如避免 `50 * 0.3 + 45 * 0.7 = 46.49999999999999` 誤捨為 `46` 而非精確 `46.5 -> 47`。)*
- 其他跨品種（兩方皆不同純種品種貓）：
  `value = Math.round((fatherBase + motherBase) / 2)`

---

### 4.4 對外型別與函式介面契約（`@shinuan/game-core`）

```ts
export type GeneticsConfig = Pick<
  ValidatedGameConfig,
  'breeds' | 'traits' | 'appearanceCompatibility'
>;

export type LayerDrawSource =
  | 'special_rule'
  | 'same_breed'
  | 'domestic'
  | 'purebred'
  | 'father'
  | 'mother'
  | 'mutation_common'
  | 'mutation_rare';

export interface GeneticsGenerationTrace {
  readonly seedUint32: number;
  readonly rawLayers: AppearanceLayers;
  readonly layerSources: Readonly<Record<AppearanceLayerName, LayerDrawSource>>;
  readonly appliedCompatibilityRuleIds: readonly string[];
  readonly fallbackTriggered: boolean;
  readonly colorPaletteBreed: BreedId;
  readonly colorSwatchIndex: number;
}

export interface GeneticsGenerateInput {
  readonly fatherBreed: BreedId;
  readonly motherBreed: BreedId;
  readonly seed: string;
  readonly fatherPetId?: string | null;
  readonly motherPetId?: string | null;
  /** 選填：僅供確定性單元測試注入受控 PRNG；未提供時自動以 FNV-1a + mulberry32-v1 建立。 */
  readonly rng?: RandomGenerator;
  /** 選填：預設 true；設為 false 時略過步驟 5（供 TC-01 驗證步驟 5 不影響步驟 1～4 外觀）。 */
  readonly includeQuirks?: boolean;
}

export interface GeneticsGenerationResult {
  readonly genetics: PetGenetics;
  readonly basePersonality: BasePersonality;
  readonly quirks: readonly QuirkId[];
  readonly trace: GeneticsGenerationTrace;
}
```

- 除函式式入口 `generateCatGenetics(config, input): GeneticsGenerationResult` 外，同步提供薄包裝類別 `GeneticsEngine`（建構子注入 `config: GeneticsConfig`，提供 `generate(input)` 與 `calculateInitialBasePersonality(fatherBreed, motherBreed)` 方法），對齊 PRD §0 / §8.A 命名慣例。
- 所有回傳物件（含 `genetics`、`appearance`、`colorParams`、`basePersonality`、`quirks`、`trace`）皆採不可變設計（可 `Object.freeze` 保護，避免呼叫端意外突變）。

---

### 4.5 `TC-01` Golden Fixture 與 `TC-02` 統計驗證設計

#### `TC-01`（`tests/unit/tc-01-genetics-determinism.test.ts` + `tests/fixtures/genetics-golden-v1.json`）

1. **連續 10 次確定性：** `seed = "test-seed-001"`、`prngAlgorithmVersion = "mulberry32-v1"`、`geneticsVersion = "1.0.0"`、`rulesVersion = "v1"`，連續呼叫 10 次結果深度完全一致。
2. **不同 Seed PRNG 序列相異：** 驗證 `"test-seed-001"` 與 `"test-seed-002"` 之 `fnv1a32` 雜湊值不同，且前 10 筆 `mulberry32-v1` 序列不同（不強求外觀必相異）。
3. **步驟 5 隔離性：** 對多組 `(fatherBreed, motherBreed, seed)` 比對 `includeQuirks: true` 與 `includeQuirks: false`，斷言 `genetics`（含 7 層外觀與 `colorParams`）100% 逐欄相等。
4. **Golden Fixture 鎖定（`tests/fixtures/genetics-golden-v1.json`）：**
   - 收錄至少 8 組代表性固定案例：
     - `"test-seed-001"`（`domestic + ragdoll`）
     - `"test-seed-002"`（`domestic + ragdoll`）
     - 同種純種（`ragdoll + ragdoll`、`munchkin + munchkin`、`exotic + exotic`）
     - 特殊骨架跨配（`munchkin + maine_coon`、`exotic + domestic`、`munchkin + exotic` 雙特殊規則同時觸發）
   - 每筆 Fixture 均記錄 `seedUint32`、`firstFivePrng`、`expectedGenetics`、`expectedBasePersonality`、`expectedQuirks`、`expectedTrace`，便於獨立 QA 與 Reviewer 逐步驗算公式後首次正式鎖定。

#### `TC-02`（`tests/unit/tc-02-genetics-statistics.test.ts`）

統一使用獨立固定種子序列 `seed_0001` ～ `seed_1000`（每筆獨立初始化 PRNG）：

| 測試組 | 配對 | 驗證斷言（1,000 筆統計） |
| --- | --- | --- |
| 1 | `munchkin + maine_coon` | 步驟 1 `rawLayers.body`：`short_legs` `50% ± 5%`、`giant_fluffy` `25% ± 5%`、`normal` `25% ± 5%`（三項互斥合計 100%）；最終 `appearance.body` 亦滿足 `short_legs` `50% ± 5%`、`giant_fluffy` `25% ± 5%`（約 23.75%，因 ~1.25% `head` 突變為 `flat_face` 觸發規則 1 轉 `chubby`）、`normal` `25% ± 5%` |
| 2 | `munchkin + munchkin` | `body`：`short_legs` `90% ± 5%`、`normal` `10% ± 5%`（合計 100%） |
| 3 | `exotic + domestic` | `head`：`flat_face` `60% ± 5%`、`standard_round` `40% ± 5%`（合計 100%） |
| 4 | `exotic + exotic` | `head`：`flat_face` `90% ± 5%`、`standard_round` `10% ± 5%`（合計 100%） |
| 5 | `domestic + ragdoll` 與 `ragdoll + domestic`（正反順序皆測） | (a) 未鎖定圖層（`eyes`、`body` 等）第一階段來源 `trace.layerSources`：`domestic` `30% ± 5%`、`purebred` `50% ± 5%`、`mutation`（common+rare）`20% ± 5%`；(b) 最終外觀特徵分布吻合含通用重組重疊之理論閉式值（`eyes`: `almond` `36.67% ± 5%` / `big_round` `56.67% ± 5%` / `droopy_cute` `6.67% ± 5%`；`body`: `normal` `34% ± 5%` / `large_fluffy` `54% ± 5%`）；(c) 色盤來源 `domestic` `30% ± 5%` / `ragdoll` `70% ± 5%`；(d) 初始 `basePersonality` 精確等於 `{ affection: 81, laziness: 68, tsundere: 29, curiosity: 59 }` |
| 6 | `ragdoll + ragdoll` | (a) 未鎖定圖層來源 `same_breed` `90% ± 5%`、`mutation` `10% ± 5%`；(b) `body` 最終 `large_fluffy` 吻合理論 `92% ± 5%`；(c) 至少出現 1 種稀有突變比率吻合理論 `9.63% ± 3%` |
| 7 | 補充跨純種（`ragdoll + british_shorthair`）＋全組不變量 | (a) 來源 `father` `40% ± 5%`、`mother` `40% ± 5%`、`mutation` `20% ± 5%`；(b) 至少 1 種稀有突變吻合理論 `18.55% ± 5%`；(c) 色盤 `50% / 50% ± 5%`；(d) 小怪癖數量 `0: 50% ± 5%`、`1: 35% ± 5%`、`2: 15% ± 5%` 且單貓無重複；(e) 全數 1,000 筆結果零違反相容規則 1～3 且 `colorParams` 合法 |

---

### 4.6 `apps/local-sandbox` Tab 1 領養盲盒與基因統計頁設計

- **零外部框架原則：** 維持純 Node `node:http` + 原生 HTML/CSS/JS（無 Vite、無 CDN 資源、100% Windows 本機離線可開），僅綁定 `127.0.0.1`（預設埠 `5174`，支援 `SHINUAN_SANDBOX_PORT` 覆寫）。
- **嚴格單向依賴：** 所有基因生成與 1,000 隻統計計算一律於後端透過 `@shinuan/game-core` `GeneticsEngine` 執行，前端 JS 禁止撰寫任何品種權重、相容規則、色碼插值或性格計算邏輯。
- **向下相容：** 保留 `renderStatusPage()`、`DEFAULT_STATUS` 匯出與 `pnpm sandbox --once` 輸出健康狀態頁行為，不破壞既有 `apps/local-sandbox/test/smoke.test.ts`。
- **HTTP API 端點：**
  - `GET /`：渲染含分頁導覽列之完整本機看板（`Tab 1：領養盲盒與基因統計` 預設開啟；`系統狀態` 顯示載入設定來源 `content` / `fallback` 與版本；預留 Tab 2～4 灰階佔位頁籤）。
  - `GET /api/status`：回傳 `{ name, phase, healthy, configSource, prdVersion, versions: { prngAlgorithmVersion, geneticsVersion, rulesVersion }, breedCount, foodCount }`。
  - `GET /api/breeds`：回傳 `ValidatedGameConfig.breeds.breeds` 清單供前端渲染父母品種選單。
  - `POST /api/genetics/roll`：請求體 `{ fatherBreed, motherBreed, seed?: string }`（若 `seed` 省略或空白則由後端產生預設種子字串如 `blindbox-<ts>-<seq>` 並回傳），呼叫 `GeneticsEngine.generate(...)` 回傳 `GeneticsGenerationResult`（含 `genetics`、`basePersonality`、`quirks`、`trace`）。
  - `POST /api/genetics/simulate`：請求體 `{ fatherBreed, motherBreed, count?: number, seedPrefix?: string }`（`count` 預設 `1000`，範圍限 `1..5000`；`seedPrefix` 預設 `'seed_'` 產生 `seed_0001..seed_1000`），呼叫 `GeneticsEngine.generate(...)` 聚合回傳：
    - `count`、`fatherBreed`、`motherBreed`、`basePersonality`
    - `layers`：7 層各特徵次數與百分比（附 `isRare` 標記）
    - `layerSources`：7 層來源路徑統計（`special_rule` / `same_breed` / `domestic` / `purebred` / `father` / `mother` / `mutation_common` / `mutation_rare`）
    - `rareSummary`：至少 1 種稀有突變之貓數與百分比
    - `compatibilitySummary`：規則 1～3 各自觸發次數與規則 4 回退次數
    - `paletteBreedCounts`：各色盤品種被選中次數與百分比
    - `quirkCountDistribution`（`0` / `1` / `2`）與 `quirkIdCounts`
- **Tab 1 畫面元素（PO 眼睛看得到）：**
  1. 父母品種下拉選單＋`seed` 輸入框＋「隨機新種子」／「抽盲盒生貓」按鈕＋6 組 `TC-02` 快捷配對按鈕。
  2. **單貓盲盒結果卡：** 主／輔實際毛色大色塊（含 HEX、色盤來源品種、HSL `lightnessDelta` / `saturationDelta`）、7 大圖層特徵卡（稀有突變金色標章、相容修正標示）、4 維度基礎性格橫條、小怪癖徽章、鎖定 `PetGenetics` 原始 JSON 折疊檢視。
  3. **1,000 隻統計分布區：** 一鍵觸發 `POST /api/genetics/simulate`，以純 CSS 橫向長條圖視覺化呈現 7 圖層特徵分布、來源權重占比、稀有突變率、相容規則觸發數與小怪癖分布。
- **HTTP 防護：** 請求體上限 `16 KB`；非法 JSON、未知品種、越界 `count` 統一回傳 HTTP `400` 搭配 `{ ok: false, code, message }`；未知路徑回傳 `404`；不支援之 HTTP Method 回傳 `405`；HTML 全面跳脫防止 XSS。

---

### 4.7 Fail-Closed 收斂兜底原則

- 凡本設計與 Master PRD 未明列之異常輸入、非法設定或越界亂數，一律採最保守之 **fail-closed 策略**（於 `game-core` 拋出具 `UPPER_SNAKE_CASE` 錯誤碼之 `GeneticsError`，於 `local-sandbox` 回傳 HTTP `400` JSON 錯誤）。
- 不涉及 Master PRD 數值、基因機率、PRNG 位元順序或設計衝突的次要實作細節（如看板 CSS 視覺排版、HTML 區塊結構、內部私有輔助函式拆分與測試輔助工具設計），授權實作者在不違背本設計前提下自行決定並於交付摘要完整列明；**僅於發現真正的 Master PRD 衝突、設計自相矛盾或實作不可行時才停工回報 `BLOCKED`**。

---

## 5. PO 已定案之 6 項設計決策（2026-11-26 確認）

以下 6 項工程細節已於 2026-11-26 獲 PO 核准定案（若 Claude Code 實作期間發現任何疑異、漏洞或與 Master PRD 衝突，須依遇疑即停條款回報 `BLOCKED` 提交 PO 裁定）：

1. **Workspace 內部連結與零外部依賴：** 核准於 `packages/game-core/package.json` 新增 `"@shinuan/contracts": "workspace:*"`、於 `apps/local-sandbox/package.json` 新增 `@shinuan/{contracts,config-loader,game-core}: "workspace:*"` 並同步 `pnpm-lock.yaml`（**零新增、移除或升級任何外部 npm 套件**）。
2. **`apps/local-sandbox` 零外部框架方案：** 延續 `S0-01` 既有 `node:http` + 原生 HTML/CSS/JS 實作 Tab 1（後端呼叫 `GeneticsEngine`、前端零規則純呈現），不引入 Vite 或外部前端圖表庫，兼顧零依賴與快速驗收。
3. **純 ES2022 UTF-8 編碼器與 `mulberry32-v1` 位元運算鎖定：** 因 `packages/game-core` 強制 `"types": []` 不含 Node/DOM `TextEncoder`，於 `game-core` 內建純 ES2022 UTF-8 編碼器供 FNV-1a 32-bit 使用（並與 Node `TextEncoder` 逐位元組交叉驗證），確保跨平台輸出 100% 一致。
4. **`colorParams` 區間插值、四位小數捨入與無彩色保護：** 區間色採 RGB 線性插值；`lightnessDelta` / `saturationDelta` 四捨五入至小數第 4 位（`[-0.08, +0.08]`）；純無彩色（`s === 0`，如 `#2B2B2B`、`#F8F8F8`、`#333333`）保留 `s' = 0` 僅微調明度，避免黑／白貓偏紅；輸出 HEX 一律大寫。
5. **米克斯＋純種 `breedBase` 整數縮放防 IEEE-754 浮點漂移：** 以數學等價之 `Math.round((domesticBase * 3 + purebredBase * 7) / 10)` 計算，避免 `45 * 0.7 = 31.499999999999996` 導致四捨五入差 1 分。
6. **回傳唯讀 `trace` 診斷欄位與 `TC-01`/`TC-02` 驗收作法：** `GeneticsEngine` 回傳結果附帶 `trace`（不寫入 `PetGenetics`），使 `TC-02` 同時驗證第一階段來源權重（30/50/20、90/10）與含通用重組重疊之最終特徵理論分布；`tests/fixtures/genetics-golden-v1.json` 併記 FNV-1a 雜湊與前 5 筆 PRNG 輸出供獨立 QA 與 Reviewer 逐步驗算後首次鎖定。

---

## 6. 規劃之驗收條件（AC）

1. **AC1（檔案範圍、零外部依賴與禁區保護）：** PR 異動僅限核准路徑（設計檔副本、`packages/game-core/**`、`apps/local-sandbox/**`、`tests/**`、`pnpm-lock.yaml`），零新增外部 npm 依賴，0 筆涉及 `docs/PO-step-by-step/`、`docs/PRD/`、`packages/contracts/src/`、`packages/config-loader/`、`content/`、`GEMINI.md`。
2. **AC2（Game Core 純淨度與確定性 PRNG）：** `node scripts/check-shinuan-integrity.mjs` 退出碼 `0`；FNV-1a 32-bit 通過標準向量與 UTF-8 交叉驗證；`mulberry32-v1` 嚴格回傳 `[0, 1)` 且確定重現。
3. **AC3（`TC-01` 基因確定性與 Golden Fixture 首次鎖定）：** `tc-01-genetics-determinism.test.ts` 全綠；`seed: "test-seed-001"` 連抽 10 次完全一致、與 `"test-seed-002"` PRNG 序列相異、步驟 5 隔離不影響步驟 1～4 外觀、`tests/fixtures/genetics-golden-v1.json` 經獨立 QA 與 Reviewer 逐步驟核對公式無誤。
4. **AC4（`TC-02` 1,000 種子全組合統計與相容規則／色彩不變量）：** `tc-02-genetics-statistics.test.ts` 與相容規則 1～4、色彩微調、異常輸入 fail-closed 單元測試全綠，全數符合 `Master PRD v2.1.31` §3.1、§3.2、§8.A.1～§8.A.4、§8.E.2 預期區間。
5. **AC5（`apps/local-sandbox` Tab 1 可視化驗收與單向依賴）：** `pnpm sandbox --once` 維持通過；HTTP API 路由測試全綠；啟動 `pnpm sandbox` 於瀏覽器可實際選父母品種抽盲盒生貓、檢視毛色色塊／7 層特徵卡／性格／小怪癖，並一鍵跑出 1,000 隻分布長條圖；前端原始碼零遊戲規則計算。
6. **AC6（工具鏈全綠與三模型閉環）：** `corepack pnpm install --frozen-lockfile`、`corepack pnpm typecheck`、`corepack pnpm test`、`node scripts/check-shinuan-integrity.mjs` 全數退出碼 `0`；PR 標示角色分工與 Issue 關聯，經獨立 QA `PASS` 與獨立 Reviewer `APPROVED` 後方提交 PO 核准 Merge（R3-A）。
