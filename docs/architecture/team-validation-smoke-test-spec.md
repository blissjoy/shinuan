# TEAM-001 能力驗證受測模組規格：`add(a, b)`

- 文件性質：能力驗證規格（BRIDGE-003），非產品規格
- Task ID：TEAM-001
- 撰寫角色：Architect
- 規格狀態：草稿，待 PO 於 G2a 核准
- 依據：`tasks/in-progress/TEAM-001-ai-team-capability-validation.md`；流程依據 Master PRD v2.1.28 §5.4.2～§5.4.5（僅流程，不涉及產品功能）

---

## 0. 聲明（必讀）

1. 本規格**只用於 BRIDGE-003「AI 團隊實際執行能力驗證」**，目的是驗證 Architect → Developer → QA → Reviewer 的跨角色流程。
2. 本規格**不是產品規格**，沒有對應的 PRD 條款，也沒有對應的 TC 編號（TC-01～TC-09、TC-MH-01～TC-MH-12 均與本規格無關）。
3. 本規格**不構成 Developer 的修改授權**。Developer 只能在 TEAM-001 任務文件「修改範圍」中、經 PO 於 G2a 逐列核准並於 G2b 確認生效的完整路徑內寫入。本文件第 10 節的路徑清單只是**提案**，在 G2a、G2b 完成前不構成任何寫入授權。
4. 本規格不構成 QA 的權限擴張。QA 的寫入路徑與可執行命令，一律以任務文件「QA 的權限與命令」（QA-W-1、QA-W-2、QA-W-3 及 PO 專屬裁定）為準；本文件與任務文件不一致時，以任務文件為準。
5. 本規格不涉及 Game Core、`packages/` 或任何產品程式碼，也不修改任何遊戲數值、公式或規則。
6. 文中標記「**推定，尚未實際執行驗證**」者，是 Architect 依 Node.js 文件或一般知識所做的推定；Architect 沒有執行 Node 的權限，該等描述不得視為已驗證事實。

---

## 1. 測試目標與範圍

### 1.1 目標

以一個極小、行為完全確定的純函式 `add(a, b)`，讓各角色在正式任務流程中實際完成：

- Architect：定義介面、輸入、輸出、預期結果與驗收條件（本文件）。
- Developer：依本規格及核准路徑實作受測模組，並提供開發驗證紀錄。
- QA：依本規格獨立撰寫及執行測試，依實際結果判定 PASS／FAIL／INCOMPLETE，並記錄缺陷。
- Reviewer：審查實際變更、測試結果與證據。

### 1.2 範圍內

- 受測模組 `add.mjs` 的介面與行為（第 2～5 節）。
- 正向、負向及邊界測試案例（第 6、7 節）。
- 驗收條件（第 8 節）與結果判定方式（第 12 節）。
- 執行環境、檔案清單、交接界線、風險（第 9～15 節）。

### 1.3 範圍外

- 任何 PRD 產品功能、Game Core、`packages/`。
- 效能、並行、國際化、錯誤訊息文字內容。
- 套件管理（不建立 `package.json`、不安裝任何套件）。
- CI、覆蓋率工具、型別檢查工具（TypeScript 等）。

---

## 2. 介面

| 項目 | 定義 |
|---|---|
| 受測模組路徑（repo 相對） | `.ai-team-smoke-test/add.mjs` |
| 模組格式 | ECMAScript Module（ESM），副檔名 `.mjs`（不依賴任何 `package.json` 的 `"type"` 欄位） |
| 匯出方式 | **具名匯出** `add`（`export function add(a, b) { ... }` 或等價的具名匯出寫法） |
| 預設匯出 | **不得**有預設匯出（`export default`）；匯入模組命名空間時，`default` 屬性必須為 `undefined` |
| 其他匯出 | 不得有 `add` 以外的匯出 |
| 函式簽章 | `add(a: number, b: number): number`（以 JSDoc 或文字表示即可，不使用 TypeScript） |
| 呼叫方式 | 同步函式；回傳值為 `number`，不得回傳 Promise 或其他型別 |
| 相依 | 模組**不得**有任何 `import` 或動態 `import()`，不得使用 `require`；只使用 JavaScript 語言內建功能 |
| 副作用 | 匯入模組及呼叫函式都不得產生副作用：不得輸出到 console、不得讀寫檔案、不得存取網路、不得修改全域物件、不得使用 `Date`、`Math.random()`、`process` |

QA 匯入方式（QA 測試檔位於 `tests/team-validation-smoke/` 時的相對路徑）：

```js
import { add } from '../../.ai-team-smoke-test/add.mjs';
import * as mod from '../../.ai-team-smoke-test/add.mjs'; // 用於檢查匯出項目
```

---

## 3. 輸入

### 3.1 允許的輸入

`a` 與 `b` 必須**同時**符合：

1. `typeof x === 'number'`（原始型別 number；`Number` 包裝物件不符合）。
2. `Number.isFinite(x) === true`（排除 `NaN`、`Infinity`、`-Infinity`）。

在上述條件內，值域為全部有限 IEEE 754 雙精度浮點數，包含：

- 正數、負數、`0`、`-0`。
- 非整數（例如 `0.1`）。
- `Number.MAX_VALUE`、`-Number.MAX_VALUE`、`Number.MIN_VALUE`、`Number.MAX_SAFE_INTEGER` 等極值。

### 3.2 不允許的輸入

| 類別 | 範例 | 判定 |
|---|---|---|
| 非 number 型別 | `string`、`boolean`、`null`、`undefined`（含未傳入參數）、`bigint`、`object`（含 `Number` 包裝物件、陣列、一般物件） | `typeof x !== 'number'` → 型別錯誤 |
| number 型別但非有限值 | `NaN`、`Infinity`、`-Infinity` | `typeof x === 'number'` 且 `Number.isFinite(x) === false` → 值域錯誤 |

### 3.3 參數數量

- 只使用前兩個參數。第三個以後的參數**一律忽略**，不影響結果，也不觸發錯誤。
- 少於兩個參數時，缺少的參數值為 `undefined`，依 3.2 視為型別錯誤。

### 3.4 驗證順序

1. 先完整驗證 `a`（先檢查型別，再檢查是否為有限值）。
2. `a` 通過後，再完整驗證 `b`（同樣先型別、再有限值）。
3. 遇到第一個不符合的檢查即丟出對應錯誤，不再進行後續檢查。

---

## 4. 輸出與錯誤行為

### 4.1 正常回傳

- 回傳值型別：原始 `number`。
- 回傳值定義：JavaScript 運算式 `a + b` 在 IEEE 754 雙精度下的結果，**不做任何四捨五入、截斷、修正或額外檢查**。
- 因此：
  - `0.1 + 0.2` 的結果為 `0.30000000000000004`（不修正）。
  - 兩個有限輸入相加溢位時，回傳 `Infinity` 或 `-Infinity`（不丟出錯誤）。輸入的有限性檢查只針對輸入，不針對輸出。
  - `-0` 的符號依 IEEE 754：`(-0) + (-0)` 為 `-0`；`(-0) + 0` 為 `+0`。
- 相同輸入必須永遠得到相同輸出（確定性）。

### 4.2 錯誤行為

| 條件 | 丟出的錯誤 |
|---|---|
| 參數型別不是 `number`（3.2 第一列） | `TypeError`（內建建構子） |
| 參數是 `number` 但不是有限值（3.2 第二列） | `RangeError`（內建建構子） |

- 錯誤必須**同步丟出**（`throw`），不得以回傳值、`undefined`、`NaN` 或 rejected Promise 表示錯誤。
- 丟出的錯誤物件必須同時符合：`err instanceof <建構子>` 為 `true`，且 `err.name === '<建構子名稱>'`（即 `'TypeError'` 或 `'RangeError'`）。
- 錯誤訊息（`err.message`）內容**不規定、不測試**；建議為非空字串並指出是哪一個參數，但不列入驗收。

---

## 5. 預期結果總覽

每個測試案例的明確預期值或預期錯誤，見第 6 節（正向）與第 7 節（負向）表格中的「預期結果」欄。比對規則：

- **數值比對**一律使用 `Object.is(actual, expected)` 語意（`node:assert` 的 `assert.strictEqual` 即為此語意，可區分 `-0` 與 `+0`，且 `NaN` 與 `NaN` 相等）。
- 正向案例另須確認 `typeof actual === 'number'`。
- **錯誤比對**使用 `assert.throws(fn, <建構子>)`，並另外確認 `err.name`；不比對錯誤訊息。

---

## 6. 正向測試案例

| 案例 ID | 呼叫 | 預期結果（`Object.is` 比對） | 涵蓋重點 |
|---|---|---|---|
| P-01 | `add(1, 2)` | `3` | 基本正整數 |
| P-02 | `add(-5, 3)` | `-2` | 負數 |
| P-03 | `add(0, 0)` | `0`（`+0`） | 零 |
| P-04 | `add(0.1, 0.2)` | `0.30000000000000004` | 浮點數不修正 |
| P-05 | `add(-0, -0)` | `-0` | 負零符號（邊界） |
| P-06 | `add(-0, 0)` | `0`（`+0`） | 負零與正零（邊界） |
| P-07 | `add(1.5, -1.5)` | `0`（`+0`） | 相反數相加 |
| P-08 | `add(Number.MAX_SAFE_INTEGER, 1)` | `9007199254740992` | 安全整數上限（邊界） |
| P-09 | `add(Number.MIN_VALUE, 0)` | `Number.MIN_VALUE`（`5e-324`） | 最小正數（邊界） |
| P-10 | `add(Number.MAX_VALUE, Number.MAX_VALUE)` | `Infinity` | 正向溢位（邊界，不丟錯） |
| P-11 | `add(-Number.MAX_VALUE, -Number.MAX_VALUE)` | `-Infinity` | 負向溢位（邊界，不丟錯） |
| P-12 | `add(1, 2, 3)` | `3` | 第三個參數被忽略 |
| P-13 | 連續呼叫 `add(1, 2)` 三次 | 三次皆為 `3` | 確定性 |

所有正向案例的回傳值都必須滿足 `typeof 回傳值 === 'number'`。

### 6.1 介面案例

| 案例 ID | 檢查 | 預期結果 |
|---|---|---|
| I-01 | `import { add } from '../../.ai-team-smoke-test/add.mjs'` 後檢查 `typeof add` | 匯入成功，且為 `'function'` |
| I-02 | `import * as mod from '../../.ai-team-smoke-test/add.mjs'` 後檢查 `mod.default` | `undefined` |
| I-03 | 檢查 `Object.keys(mod)` | 完全等於 `['add']` |

---

## 7. 負向測試案例

| 案例 ID | 呼叫 | 預期結果 | 涵蓋重點 |
|---|---|---|---|
| N-01 | `add('1', 2)` | 丟出 `TypeError` | `a` 為字串 |
| N-02 | `add(1, '2')` | 丟出 `TypeError` | `b` 為字串 |
| N-03 | `add(true, 1)` | 丟出 `TypeError` | 布林 |
| N-04 | `add(null, 1)` | 丟出 `TypeError` | `null` |
| N-05 | `add(1, undefined)` | 丟出 `TypeError` | 明確傳入 `undefined` |
| N-06 | `add(1)` | 丟出 `TypeError` | 缺少 `b` |
| N-07 | `add()` | 丟出 `TypeError` | 缺少兩個參數 |
| N-08 | `add(1n, 2)` | 丟出 `TypeError` | `bigint` |
| N-09 | `add(new Number(1), 2)` | 丟出 `TypeError` | `Number` 包裝物件 |
| N-10 | `add([1], 2)` | 丟出 `TypeError` | 陣列 |
| N-11 | `add({}, 1)` | 丟出 `TypeError` | 一般物件 |
| N-12 | `add(NaN, 1)` | 丟出 `RangeError` | `a` 為 `NaN` |
| N-13 | `add(1, NaN)` | 丟出 `RangeError` | `b` 為 `NaN` |
| N-14 | `add(Infinity, 1)` | 丟出 `RangeError` | `a` 為 `Infinity` |
| N-15 | `add(1, Infinity)` | 丟出 `RangeError` | `b` 為 `Infinity` |
| N-16 | `add(-Infinity, 1)` | 丟出 `RangeError` | `a` 為 `-Infinity` |
| N-17 | `add(1, -Infinity)` | 丟出 `RangeError` | `b` 為 `-Infinity` |
| N-18 | `add('1', NaN)` | 丟出 `TypeError` | 驗證順序：`a` 先於 `b` |
| N-19 | `add(NaN, '1')` | 丟出 `RangeError` | 驗證順序：`a` 先於 `b` |

所有負向案例的錯誤物件都必須同時符合 4.2 的 `instanceof` 與 `name` 條件。

---

## 8. 驗收條件

以下驗收條件是**最終版本必須全部通過的完整、正確標準**。分成兩類：

- **AC（功能驗收條件）**：由 QA 以第 9 節的環境實際執行測試判定。
- **RV（審查檢查項目）**：由 Reviewer 以閱讀程式碼、差異及證據判定，不屬於 QA 的執行判定範圍。

### 8.1 功能驗收條件（QA）

| 編號 | 驗收條件 | 對應案例 |
|---|---|---|
| AC-01 | 受測模組 `.ai-team-smoke-test/add.mjs` 可被以 ESM 匯入，具名匯出 `add` 為函式 | I-01 |
| AC-02 | 受測模組沒有預設匯出，且除 `add` 外沒有其他匯出 | I-02、I-03 |
| AC-03 | 合法輸入下，回傳值型別為 `number`，且以 `Object.is` 比對完全等於預期值（含浮點、負零、極值、溢位） | P-01～P-11 |
| AC-04 | 第三個以後的參數被忽略；相同輸入重複呼叫得到相同結果 | P-12、P-13 |
| AC-05 | 任一參數型別不是 `number`（含缺少參數、`bigint`、`Number` 包裝物件、陣列、物件）時，同步丟出 `TypeError`，且 `err.name === 'TypeError'` | N-01～N-11 |
| AC-06 | 任一參數為 `NaN` 時，同步丟出 `RangeError`，且 `err.name === 'RangeError'` | N-12、N-13 |
| AC-07 | 任一參數為 `Infinity` 或 `-Infinity` 時，同步丟出 `RangeError`，且 `err.name === 'RangeError'` | N-14～N-17 |
| AC-08 | 先完整驗證 `a` 再驗證 `b`，丟出第一個不符合項目對應的錯誤 | N-18、N-19 |
| AC-09 | QA 以核准命令 `node --test tests/team-validation-smoke/add.qa.test.mjs`（任務文件 QA-W-2b）執行時，第 6、7 節**每一個**案例 ID 都有對應的測試被實際執行且通過；輸出摘要中失敗數為 0，且沒有被取消、略過（skip）或標記為 todo 的測試 | 全部案例 |

### 8.2 審查檢查項目（Reviewer）

| 編號 | 檢查項目 |
|---|---|
| RV-01 | 受測模組符合第 2 節「相依」與「副作用」規定：沒有 `import`／`require`／動態 `import()`；沒有 console 輸出、檔案或網路存取、全域修改、`Date`、`Math.random()`、`process` |
| RV-02 | Developer 只在 G2b 生效的完整路徑內新增或修改檔案；沒有範圍外檔案變更 |
| RV-03 | v1 快照 `.ai-team-smoke-test/snapshots/add.v1.mjs` 的內容與 v1 交付時的 `.ai-team-smoke-test/add.mjs` 完全相同，且建立後未再被修改 |
| RV-04 | v1 之後對 `.ai-team-smoke-test/add.mjs` 的每一項修改，都對應到正式缺陷紀錄；修改內容沒有超出該缺陷的必要範圍 |
| RV-05 | 本規格（第 2～8 節的介面、預期值與驗收條件）在 Developer 與 QA 工作期間未被變更 |
| RV-06 | QA 測試檔的命名、位置與案例 ID 對應符合第 11 節；QA 報告附實際命令及原始輸出 |

---

## 9. 執行環境與執行方式

### 9.1 環境

| 項目 | 定義 |
|---|---|
| 作業系統 | Windows（PO 本機環境） |
| Node.js | v24.15.0（T0 已核實版本） |
| 測試框架 | 只使用 Node.js 內建 `node:test` 與 `node:assert`（建議 `node:assert/strict`） |
| 套件 | **不安裝任何套件**；不建立 `package.json`、`node_modules` 或 lockfile |
| 執行位置 | repo 根目錄（所有路徑皆為 repo 相對路徑） |

### 9.2 命令

| 角色 | 命令 | 狀態 |
|---|---|---|
| Developer（開發驗證，建議） | `node --test .ai-team-smoke-test/add.dev.test.mjs` | 建議命令，是否授權由 PO／Manager 決定 |
| QA（正式驗收） | `node --test tests/team-validation-smoke/add.qa.test.mjs`（輸出依任務文件 QA-W-2b 保存） | PO 於 2026-11-22 核准本次命令修訂方向及 RV-05 一次性例外；前版 G2a-R1 已由 PO 正式核准（前版核准時 SHA-256 `940f7b466422c5ce0f5b00334c5f19cb8e1e7926d18d475538ff612a10071511`），本文件為 G2a-R1a 狀態修訂候選版，尚待 PO 最終核准，R1a 狀態修訂紀錄見 §16。新命令自新基準核准後的第 2 輪起適用；修訂後固定不變，再次變更須經 PO 核准。第 1 輪依修訂前命令執行，其歷史結果仍為 INCOMPLETE，不因本修訂改變。 |

### 9.3 Node.js v24.15.0 的測試檔探索行為

本節只描述命令與執行環境的行為，不描述受測模組的任何行為。各點以下列三種標示區分依據：

- 【**已觀察**】：TEAM-001 第 1 輪正式 QA 執行（round-1）原始輸出 `test-results/_tmp/TEAM-001/round-1/node-test-output.txt` 可直接看到的事實。
- 【**已以 repo 外探針驗證**】：2026-11-22 在 repo 外探針目錄（Windows、Git Bash、Node.js v24.15.0，探針根目錄路徑含空白，使用與本任務無關的常數比較測試檔）實際執行所得的命令行為。**探針結果只證明命令可行性，不是 QA 證據，不是 QA PASS，不得作為任何 AC 的證據，也不能取代正式 QA。**
- 【**推定，尚未實際執行驗證**】：尚未在正式 repo QA 執行環境驗證的事項。

1. 【**已觀察**】在 Windows、Node.js v24.15.0、repo 根目錄下執行修訂前命令 `node --test tests/team-validation-smoke/` 時，Node.js 沒有在目錄內探索測試檔，而是把目錄本身當成單一模組入口載入，產生 `Error: Cannot find module 'D:\Joy codes\shinuan\tests\team-validation-smoke'`（`code: 'MODULE_NOT_FOUND'`），摘要為 `ℹ tests 1`、`ℹ pass 0`、`ℹ fail 1`，唯一的 test 是目錄本身。第 6、7 節及 6.1 節的 35 個案例 ID 都沒有被執行，第 1 輪 QA 結論為 INCOMPLETE。本節修訂前「目錄參數會遞迴探索測試檔」的推定在此環境不成立。
2. 【**已以 repo 外探針驗證**（非 QA 證據）】在探針目錄執行目錄參數對照命令 `node --test tests/probe-smoke/`，結束碼 1，輸出 `Error: Cannot find module '…\tests\probe-smoke'`（`code: 'MODULE_NOT_FOUND'`）、`ℹ tests 1`、`ℹ fail 1`，沒有任何探針測試被執行，重現第 1 點的同類錯誤。
3. 【**已以 repo 外探針驗證**（非 QA 證據）】以明確檔案路徑執行 `node --test tests/probe-smoke/probe.qa.test.mjs`，結束碼 0；該檔案被載入並執行，其唯一的測試顯示通過（`✔`），摘要為 `ℹ tests 1`、`ℹ pass 1`、`ℹ fail 0`、`ℹ cancelled 0`、`ℹ skipped 0`、`ℹ todo 0`；同目錄的另一個測試檔（`other.qa.test.mjs`）**沒有**被執行。即：明確指定單一測試檔案時，只載入並執行該檔案，不會執行同目錄的其他測試檔。
4. 【**已以 repo 外探針驗證**（非 QA 證據）】指定不存在的檔案 `node --test tests/probe-smoke/missing.qa.test.mjs` 時，結束碼 1，輸出全文只有一行 `Could not find 'tests/probe-smoke/missing.qa.test.mjs'`，**沒有** `ℹ tests` 等摘要行，也沒有任何測試通過。本規格先前的「可能出現 `MODULE_NOT_FOUND` 或測試數 0」只是推定，**不得**作為已驗證事實。
5. 【**推定，尚未實際執行驗證**】第 2～4 點的行為在正式 repo QA 執行環境（repo 根目錄 `D:\Joy codes\shinuan`、命令 `node --test tests/team-validation-smoke/add.qa.test.mjs`）中同樣成立。探針與正式 repo QA 環境可能有差異（例如目錄內容、設定檔），探針不能完全排除此差異。
6. 【**推定，尚未實際執行驗證**】`tests/team-validation-smoke/add.qa.test.mjs` 尚未在任何一輪中真正被載入執行；第 2 輪第一次載入時，仍可能發現 QA 測試檔本身的問題（TEST DEFECT，依 13.2 處理）。
7. 【已觀察／已以探針驗證】輸出重導到檔案（非 TTY）時，第 1 輪原始輸出及探針 V-5、V-6 的輸出使用 spec 格式摘要（`ℹ tests N`、`ℹ pass N`、`ℹ fail N` 等）。V-7 不適用，因其輸出沒有摘要行。判定仍以案例 ID 與通過／失敗標記為準，不依賴特定格式（見 RISK-08）。
8. Developer 檔案 `.ai-team-smoke-test/add.dev.test.mjs` 不是 QA 命令的參數，因此不會被 QA 命令執行（由命令形式決定，不依賴測試檔探索行為）。

**相容性設計及判定原則：**

- QA 測試全部寫在 `tests/team-validation-smoke/add.qa.test.mjs` 單一檔案中；QA 命令只執行此檔案。`tests/team-validation-smoke/` 內的其他檔案（包括 QA 另行新增的測試檔）**不會**被 QA 命令執行；如需新增測試檔並納入執行，必須先由 PO 核准修訂命令。
- 測試資料內嵌於測試檔，不另建 `.mjs`／`.js`／`.cjs` 輔助檔。
- 結果判定以「每個案例 ID 都在輸出中出現且通過」為準（AC-09）。指定檔案不存在、沒有載入任何測試、缺少任何案例 ID，或輸出缺乏足夠的判讀證據時，依 AC-09 及第 12 節判定為 INCOMPLETE，不得改用其他命令。
- **不得單獨以命令結束碼或 Node.js 摘要行判定 QA PASS**；結束碼 0 或摘要 `ℹ fail 0` 都不足以證明每個案例 ID 都已執行且通過。

---

## 10. 檔案清單

### 10.1 兩個工作目錄的用途

依 PO 正式裁定，以下兩個目錄是 TEAM-001 的能力驗證工作目錄，不另建 ADR；G2a、G2b 的逐列完整路徑核准即為對此目錄安排的正式 PO 確認。此裁定**只適用於這兩個目錄**，不延伸到其他目錄結構變更。

| 目錄 | 用途 | 寫入角色 |
|---|---|---|
| `.ai-team-smoke-test/` | 放置受測模組、Developer 開發測試及 v1 快照；與產品程式碼（`packages/`）完全分離 | Developer（僅限 G2b 生效的路徑） |
| `tests/team-validation-smoke/` | 放置 QA 獨立撰寫的驗收測試；與 Developer 檔案分離，確保 QA 命令只執行 QA 測試 | QA（依任務文件 QA-W-1） |

### 10.2 Developer 檔案（提案，待 PO 於 G2a 逐列核准；G2a、G2b 完成前不構成任何寫入授權）

| 列 | 完整 repo 相對路徑 | 用途 | 建立／修改時機 |
|---|---|---|---|
| D-1 | `.ai-team-smoke-test/add.mjs` | 受測模組；QA 測試唯一匯入的對象 | v1 建立；之後只能依正式缺陷紀錄修改 |
| D-2 | `.ai-team-smoke-test/add.dev.test.mjs` | Developer 開發測試（`node:test` + `node:assert`） | v1 建立；之後可依開發需要修改 |
| D-3 | `.ai-team-smoke-test/snapshots/add.v1.mjs` | v1 快照：保存 v1 交付時 `add.mjs` 的完整內容，供 Reviewer 比對 v1 與最終版本 | v1 交付時建立，內容與 v1 `add.mjs` 完全相同；**建立後不得修改、刪除、移動或重新命名** |

說明：

- D-3 位於子目錄 `.ai-team-smoke-test/snapshots/`；建立該子目錄（以及 `.ai-team-smoke-test/` 本身）由誰、以何種方式執行，需由 PO 決定（見第 15 節 OPEN-02）。
- Developer 不得新增、修改上表以外的任何檔案；需要時必須停止並回報 Manager。
- 建議 Developer 於 v1 交付時回報 D-1 與 D-3 的 SHA-256，供 Reviewer 驗證 RV-03（是否授權 Developer 執行雜湊命令由 PO／Manager 決定）。

### 10.3 QA 檔案（依任務文件 QA-W-1）

| 項目 | 要求 |
|---|---|
| 測試目錄 | `tests/team-validation-smoke/`（由 Manager 建立並提供確認證據） |
| 測試檔 | `tests/team-validation-smoke/add.qa.test.mjs`（T0 已確認不被 `.gitignore` 忽略） |
| 命名規則及命令範圍 | QA 命令只執行 `tests/team-validation-smoke/add.qa.test.mjs`（見 9.2、9.3）；全部案例須寫在此檔案中，其他檔案不會被執行。新增或拆分 QA 測試檔案時，必須先取得 PO 對新命令的核准。不得使用目錄參數、glob 或其他未核准路徑取代指定命令 |
| 匯入對象 | 只能匯入 `../../.ai-team-smoke-test/add.mjs`；**不得**匯入 v1 快照或 Developer 開發測試 |
| 正式報告 | `test-results/TEAM-001/qa-report.md`（依任務文件） |
| 原始輸出 | `test-results/_tmp/TEAM-001/round-N/node-test-output.txt`（依任務文件 QA-W-2b） |

---

## 11. 測試程式架構

### 11.1 QA 測試檔結構要求

- 使用 `import { test } from 'node:test'`（或 `describe`／`it`）與 `import assert from 'node:assert/strict'`。
- **每一個案例 ID（I-01～I-03、P-01～P-13、N-01～N-19）都必須是一個獨立的測試**，測試名稱以案例 ID 開頭（例如 `P-04 add(0.1, 0.2) 回傳 0.30000000000000004`），讓原始輸出可以逐案例追溯。
- 不使用 `test.skip`、`test.todo`、`only` 或條件式跳過。
- 不依賴時間、隨機數、環境變數、執行順序或其他測試的狀態。
- 測試資料直接內嵌於測試檔（`NaN`、`Infinity`、`-0`、`bigint`、`undefined` 等無法以 JSON 表示，因此不使用 JSON fixture）。

### 11.2 測試資料及 fixture 要求

- 本規格**不需要任何 fixture 檔案**。
- 若 QA 仍認為需要額外測試資料檔，該檔案不得是 `.mjs`／`.js`／`.cjs`（避免被測試探索誤判），且必須位於 `tests/team-validation-smoke/` 內，並在 QA 報告中說明用途。

### 11.3 Developer 開發測試

- 涵蓋範圍由 Developer 決定，建議涵蓋第 6、7 節全部案例。
- 開發驗證結果必須如實回報（已執行並通過／已執行但失敗／未執行及原因）。
- 開發測試不能取代 QA 驗收；QA 不得引用開發測試結果作為通過證據。

---

## 12. 結果判定方式

QA 依原始輸出 `node-test-output.txt` 判定：

| 結論 | 條件 |
|---|---|
| PASS | AC-01～AC-09 全部成立：每一個案例 ID 的測試都已實際執行並通過，失敗數 0，沒有取消、略過或 todo |
| FAIL | 至少一個案例 ID 的測試已實際執行且失敗，且失敗原因經分析屬於受測模組（見 13.2）。報告中列出失敗的案例 ID、對應 AC 編號、實際值與預期值 |
| INCOMPLETE | 沒有已確認的受測模組失敗，但至少一個案例 ID 沒有被實際執行（例如命令沒有找到測試檔、測試數為 0、案例遺漏、輸出無法保存或無法判讀） |

- 同時有失敗與未執行項目時，結論為 FAIL，並另列未執行項目。
- 不得以部分案例通過推論 PASS。

---

## 13. 錯誤處理及停止條件

### 13.1 Developer

- 需要寫入第 10.2 節以外、或 G2b 未生效的路徑 → 停止並回報 Manager。
- 認為規格有矛盾、不可實作，或需要修改預期值 → 停止並回報 Manager，不得自行解釋或修改規格。
- 需要安裝套件 → 停止並回報。

### 13.2 QA

- 依任務文件 QA-W-2、QA-W-3 的停止條件執行（`round-N` 已存在、`mkdir` 失敗、輸出無法保存等）。
- 失敗原因判別：
  - 錯誤堆疊或斷言指向受測模組的行為與預期值不符 → 屬受測模組缺陷，記入缺陷紀錄。
  - 受測模組無法載入（檔案不存在、語法錯誤）→ AC-01 失敗，屬受測模組缺陷。
  - 錯誤來自 QA 測試檔本身（語法錯誤、案例寫錯、預期值與本規格不符）→ 屬 TEST DEFECT，**停止並回報 Manager**，不得自行修改既有測試檔（依任務文件 QA-W-1）。
- 認為本規格本身有矛盾或預期值有誤 → 停止並回報 Manager，不得自行修改預期值。

### 13.3 Reviewer

- 發現範圍外變更、缺陷紀錄與修改無法對應、快照被修改或規格被變更 → 依 RV 項目提出 CHANGES REQUESTED 或回報 Manager。

---

## 14. 與 Developer、QA、Reviewer 的工作交接界線

| 交接點 | 交出方 | 接收方 | 交接內容 | 界線 |
|---|---|---|---|---|
| 規格 → 實作 | Architect（經 PO G2a 核准、G2b 確認） | Developer | 本規格；G2b 生效的路徑清單 | Architect 不撰寫受測模組或測試；規格不構成寫入授權 |
| 規格 → 驗收測試 | Architect（經 PO G2a 核准） | QA | 本規格第 2～8.1、9、11、12 節 | QA 只接收上述指定章節；不接收第 8.2 節（Reviewer 專用審查項目），也不接收本規格以外、由 Manager 持有的其他角色回報及內部紀錄。Manager 不得將完整規格檔直接交付 QA，應依本列核准的交接範圍提供必要資訊。QA 依規格獨立撰寫測試，不參考 Developer 開發測試的內容或結果 |
| 實作 → 驗收 | Developer | QA（經 Manager） | 修改檔案清單（供定位） | Manager 不得把 Developer 的測試結果作為 QA 依據 |
| 缺陷 → 修正 | QA（缺陷紀錄，經 Manager） | Developer | 失敗案例 ID、AC 編號、實際值與預期值 | Developer 只依正式缺陷紀錄修正 D-1；不得修改規格或 QA 測試 |
| 驗收 → 審查 | QA（PASS 報告） | Reviewer（經 Manager） | 修改檔案清單、QA 報告路徑、原始輸出路徑 | Reviewer 獨立判斷，不以 QA 或 Manager 結論代替審查 |

**交接範圍說明（PO 決策，G2a 前置修訂）：**

- QA 的交接範圍只限本規格第 2～8.1、9、11、12 節；第 8.2 節是 Reviewer 專用審查項目，不交付 QA。
- Reviewer 取得完整規格，包括第 8.2 節 RV-01～RV-06。
- 技術限制：本規格檔位於 repository，QA 在技術上仍可能讀取完整檔案。上述交接限制屬於流程及資訊交付層級的隔離，並未實現作業系統或 repository 權限層級的存取隔離。

---

## 15. 風險、防護措施、規格限制及未解決問題

### 15.1 風險與防護措施

| 編號 | 風險 | 發生條件 | 防護措施 |
|---|---|---|---|
| RISK-01 | QA 命令沒有載入或沒有執行 QA 測試檔 | 第 1 輪已實際證明：目錄參數 `node --test tests/team-validation-smoke/` 在本環境不會依預期載入測試檔（`MODULE_NOT_FOUND`，35 個案例未執行，見 9.3 第 1 點）。修訂後仍可能發生的條件：指定檔案不存在或路徑錯誤；案例被寫在命令未指定的其他檔案；正式 repo QA 環境的行為與 repo 外探針結果不同（見 9.3 第 5 點） | 影響：案例未執行，QA 結論只能是 INCOMPLETE，需再增加一輪。防護：QA 命令以明確檔案路徑指定 `add.qa.test.mjs`，不得使用目錄參數、glob 或其他未核准路徑；AC-09 要求每個案例 ID 都出現在輸出中且通過，未出現即 INCOMPLETE；不得單獨以結束碼或摘要判定 PASS；不得自行改命令，新命令須經 PO 核准 |
| RISK-02 | 檔案被 `.gitignore` 忽略，導致 Reviewer 或後續 Git 紀錄看不到 | 檔名或副檔名符合忽略規則 | 依 T0 結果：`.ai-team-smoke-test/add.mjs`、`.ai-team-smoke-test/snapshots/add.v1.mjs`、`tests/team-validation-smoke/add.qa.test.mjs` 不被忽略；`.ai-team-smoke-test/add.v1.tmp` 被 `*.tmp` 忽略，因此**任何檔名都不得使用 `.tmp` 副檔名**（快照採 `.mjs`）。`.ai-team-smoke-test/add.dev.test.mjs` 未在 T0 檢查範圍內（見 OPEN-01） |
| RISK-03 | QA 測試誤匯入 v1 快照或 Developer 開發測試，造成驗收對象錯誤 | 匯入路徑寫錯 | 10.3 規定唯一匯入對象；RV-06 由 Reviewer 檢查 |
| RISK-04 | v1 快照在 v1 之後被修改，使 Reviewer 無法比對 | Developer 修正時誤改快照 | D-3 建立後不得修改；建議回報 SHA-256；RV-03 檢查 |
| RISK-05 | 規格在流程中途被變更，使驗收標準漂移 | 任何角色修改本文件 | RV-05；本文件只有 Architect 經 Manager 派遣、並經 PO 核准後才能修改 |
| RISK-06 | 浮點或負零比對方式錯誤，產生假失敗或假通過 | 使用 `==`、`assert.equal`（非 strict）或 `===`（無法區分 `-0`） | 第 5 節規定以 `Object.is` 語意比對（`node:assert/strict` 的 `strictEqual`） |
| RISK-07 | 測試失敗原因誤判（受測模組缺陷 vs TEST DEFECT） | 錯誤來源不明確 | 13.2 的判別規則；每案例獨立測試、名稱帶案例 ID |
| RISK-08 | 原始輸出格式（TAP 或 spec）與預期不同，判讀困難 | Node.js v24 非 TTY 預設 reporter 與推定不同 | 判定以案例 ID 與通過／失敗標記為準，不依賴特定格式；無法判讀即 INCOMPLETE |

### 15.2 規格限制

- Node.js 行為描述（9.3）除已標示【已觀察】或【已以 repo 外探針驗證】的內容外，其餘仍屬推定，尚未實際執行驗證。
- 本規格不測試錯誤訊息文字、效能及 RV-01 所列「無副作用」的執行期行為（由 Reviewer 以閱讀程式碼判定）。
- 本規格假設在 Windows 上由 repo 根目錄執行命令；repo 路徑含空白字元，ESM 相對匯入不受影響【**推定，尚未實際執行驗證**】。

### 15.3 未解決問題（待 PO／Manager 決定）

| 編號 | 問題 | 選項 | Architect 建議 |
|---|---|---|---|
| OPEN-01 | `.ai-team-smoke-test/add.dev.test.mjs` 是否被 `.gitignore` 忽略，T0 未檢查 | A：G2a 前由 Manager 依授權補做唯讀檢查；B：接受未檢查風險 | A |
| OPEN-02 | `.ai-team-smoke-test/` 與 `.ai-team-smoke-test/snapshots/` 兩個目錄由誰、以何種命令建立（任務文件只規定 QA 的六個上層目錄由 Manager 負責） | A：比照 QA 上層目錄由 Manager 經 PO 授權命令建立；B：允許 Developer 以寫檔工具隱含建立；C：取消 `snapshots/` 子目錄，快照改放 `.ai-team-smoke-test/` 根層（需重新做 `.gitignore` 檢查） | A |
| OPEN-03 | Developer 執行開發測試命令（9.2）及回報 SHA-256 的命令授權 | A：PO 核准 9.2 建議命令及雜湊命令；B：Developer 不執行命令，只交付檔案 | A |

---

## 16. 修訂紀錄

| 修訂 | 日期 | 修訂範圍 | 原因 | 依據 | 修訂前 SHA-256 |
|---|---|---|---|---|---|
| G2a 基準 | — | — | PO 於 G2a 核准 | 任務文件交付紀錄 | 本身即 G2a 基準；其 SHA-256 為 `804bec248529056708ef00c1724ea06da332d5652035b38a5fa16b86eec3ad94` |
| R1（候選新基準 G2a-R1，尚待 PO 最終核准） | 2026-11-22 | §8.1 AC-09 命令文字；§9.2 QA 列；§9.3 全節；§10.3「測試檔」「命名規則及命令範圍」兩列；§15.1 RISK-01；§15.2 第 1 點；新增本節 | T4-R1 第 1 輪 QA 結論 INCOMPLETE：原命令 `node --test tests/team-validation-smoke/` 把目錄當成模組入口載入（`MODULE_NOT_FOUND`），沒有執行任何案例 | PO 2026-11-22 第二階段 A 決策（AC-09 命令文字一次性修訂） | `804bec248529056708ef00c1724ea06da332d5652035b38a5fa16b86eec3ad94` |
| R1a（G2a-R1a 狀態修訂候選版，尚待 PO 最終核准） | 2026-11-22（候選版製作日；非核准日） | §9.2 QA 列狀態文字；§16 新增本筆紀錄及下方「R1a 說明」 | 前版 G2a-R1 已經 PO 正式核准，但文件仍保留「尚待 PO 最終核准」的過時狀態文字 | PO 授權採用 C-γ 製作 G2a-R1a 狀態修訂候選版 | `940f7b466422c5ce0f5b00334c5f19cb8e1e7926d18d475538ff612a10071511`（前版 G2a-R1 正式核准版本） |

R1 說明：

- **新命令：** `node --test tests/team-validation-smoke/add.qa.test.mjs`（輸出依任務文件 QA-W-2b 保存），自新基準核准後的第 2 輪起適用。
- **RV-05 一次性例外：** AC-09 位於第 8 節，修改其命令文字**構成 RV-05 涵蓋的規格變更**。PO 於 2026-11-22（第二階段 A 決策）明確承認此點，並核准**一次性例外**，只限本次 R1 對 AC-09 命令文字的修訂；此例外不延伸到任何其他位置或未來修訂，不構成通案豁免。RV-05 原文維持不變。Reviewer 審查 RV-05 時，以 G2a 基準加上本次 PO 核准的修訂範圍作為對照，差異超出上表 R1 修訂範圍即不符合 RV-05。
- **不改變驗收標準：** R1 不變更第 2～7 節任何介面、輸入、輸出、案例或預期值，不變更 AC-01～AC-08，也不變更 AC-09 的驗收條件、對應案例、通過條件與失敗條件；沒有新增、刪除或修改任何測試案例。只變更 QA 執行命令文字及相關說明。
- **命令可行性探針：** 2026-11-22 由 Manager 在 repo 外探針目錄（Node.js v24.15.0，路徑含空白）執行：V-5 目錄參數對照組重現 `MODULE_NOT_FOUND`（結束碼 1）；V-6 明確檔案路徑只載入並執行指定檔案、通過、不執行同目錄其他測試檔（結束碼 0）；V-7 不存在的檔案只輸出 `Could not find 'tests/probe-smoke/missing.qa.test.mjs'`、沒有摘要行（結束碼 1）；V-8（glob）未執行。探針結果**只證明命令可行性，不是 QA 證據，不是 QA PASS，不能取代正式 QA**（見 9.3）。
- **第 1 輪歷史證據：** 第 1 輪（round-1）依修訂前命令執行，結論 INCOMPLETE；其 QA 報告段落及原始輸出為歷史證據，不因本修訂改動。
- **修訂後 SHA-256：** 無法寫入本檔案本身，由 Manager 另行記錄。

R1a 說明：

- **狀態：** G2a-R1a 為狀態修訂候選版，尚待 PO 最終核准。
- **前版：** 前版 G2a-R1 已由 PO 正式核准，前版正式核准版本 SHA-256 為 `940f7b466422c5ce0f5b00334c5f19cb8e1e7926d18d475538ff612a10071511`。上方 G2a、R1 兩列為歷史紀錄，維持原文；R1 列中「尚待 PO 最終核准」是 R1 修訂當時的候選狀態。
- **修訂範圍：** 只修正 §9.2 QA 列的狀態表述，並在本節新增本筆紀錄；不改動 AC-09、QA 命令、測試案例、驗收標準或任何技術規格。
- **R1a 修訂後 SHA-256：** 以本次完成後的實際量測結果為準，無法寫入本檔案本身，另由交付紀錄保存。

