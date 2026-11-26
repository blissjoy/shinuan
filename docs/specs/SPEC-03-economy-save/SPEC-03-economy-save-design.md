# SPEC-03 技術設計文件（Design Spec）：`EconomyEngine`、原生廣告商店、背包與防損 JSON 存檔遷移

> **狀態：APPROVED（PO 已於 2026-11-26 核准 §5 全部 4 項設計決策，並要求於派工包強制加入 Claude Design 自我審核與遇疑即停條款；已定稿 `SHINUAN-S3-01` 與 `SHINUAN-S3-02` 派工包）**
> **對應唯一正式規格：** `Master PRD v2.1.30`（§2.1、§4.4、§5.1、§8.A.1、§8.C.2、§8.C.3、§8.E.1、§8.E.2 `TC-07`、§8.E.3 `TC-MH-11`）
> **設計產出路徑（Dropbox）：** `D:\Dropbox\ai-bridge\shinuan\tasks\SHINUAN-S3-01\SPEC-03-economy-save-design.md`
> **未來納入 Repo 路徑：** `docs/specs/SPEC-03-economy-save/SPEC-03-economy-save-design.md`

---

## 1. 目標與小單切分邊界（`S3-01` vs `S3-02`）

| 小單 ID | 主題 | 核心實作範圍 | 自動化驗收 | `apps/local-sandbox` Tab 3 進度 |
| --- | --- | --- | --- | --- |
| **`SHINUAN-S3-01`** | `EconomyEngine`、商店探索任務與背包消耗 | `packages/game-core/src/engine/economy/**`（200 初始積分、雙重防重每日簽到、商店開啟與停留 `>= 3s` 探索任務、互動積分上限 25 與超額續給 `mood +3`、高健康日結 `+25`、購買入包、免費品無限免扣庫存、軟下架商品背包可用） | **`TC-07`**（防重、跨午夜重置、探索上限 30、購買／背包、免費品、軟下架與 100 Clamp）＋ 邊界單元測試 | Tab 3 商店與背包頁：分類篩選、品牌合作／測試商品標示、停留 3 秒領分、購買與餵食消耗 |
| **`SHINUAN-S3-02`** | 防損 JSON 存檔與 `v1 -> v2` 遷移 | `packages/game-core/src/save/**`（純 TS 結構驗證＋`v1 -> v2` 遷移＋序列化）＋ 本機防損 `JsonGameRepository`（`save.tmp` → 驗證 → `save.bak` → 原子替換與毀損回退） | **`TC-MH-11`**（`lowMoodDuration` 跨存檔續算）＋ 損毀回退與 `v1 -> v2` 遷移不改外觀／個性測試 | Tab 3 存檔區塊：手動存檔／重整網頁還原／模擬損毀回退驗證 |

> **平台純淨度紅線（不可妥協）：** `packages/game-core` 內嚴禁出現任何 `fs`、`path`、`process`、`Date.now()` 或系統時區呼叫；所有磁碟讀寫與原子替換統一封裝在外部 Adapter（實作 `@shinuan/contracts` 的 `GameRepository` 介面）。

---

## 2. `SHINUAN-S3-01`：`EconomyEngine` 完整規則與數學鎖定

### 2.1 常數契約（`ECONOMY_CONSTANTS`）

```ts
export const ECONOMY_CONSTANTS = Object.freeze({
  INITIAL_COINS: 200,
  DAILY_CHECK_IN_COINS: 40,
  DAILY_CHECK_IN_MIN_COOLDOWN_MS: 20 * 3_600_000,
  OPEN_SHOP_COINS: 5,
  INSPECT_PRODUCT_COINS: 10,
  INSPECT_PRODUCT_MIN_DWELL_MS: 3_000,
  DAILY_EXPLORATION_COIN_CAP: 30,
  INTERACTION_COINS: 5,
  INTERACTION_MOOD_GAIN: 3,
  DAILY_INTERACTION_COIN_CAP: 25,
  DAILY_HIGH_HEALTH_COINS: 25,
  DAILY_HIGH_HEALTH_MIN_HEALTH: 90,
  DAILY_HIGH_HEALTH_MIN_MOOD: 80,
  DEFAULT_DRINK_WATER_ITEM_ID: 'free_fresh_water',
} as const);
```

### 2.2 本地日期重置與防倒退護欄（`syncDailyLimitsForDate`）

所有經濟指令執行前，一律以注入之 `timezoneOffsetMinutes` 透過 `TimeEngine` 共用的 `toLocalDateString(timestamp, timezoneOffsetMinutes)` 取得 `currentLocalDate`：

1. **時鐘／日期倒退防護：**
   - 若 `currentLocalDate < dailyLimits.localDate` 或 `currentLocalDate < dailyLimits.lastActiveLocalDate`：判定為日期倒退（跨西時區或手動調錶），**不重置當日上限**，並於領獎類指令回傳 `CommandRejectedEvent`（`reason: 'CLOCK_OR_DATE_ROLLBACK'`）。
2. **正常跨本地午夜（`currentLocalDate > dailyLimits.localDate`）：**
   - 重置當日計數欄位：`localDate = currentLocalDate`、`lastActiveLocalDate = currentLocalDate`、`claimedRewardIds = []`、`exploredProductIds = []`、`shopOpenedToday = false`、`explorationCoinsEarned = 0`、`interactionCoinsEarned = 0`、`dailyHighHealthRewardClaimed = false`。
   - **完整保留** `lastClaimedLocalDate` 與 `lastClaimedTimestamp`（供每日簽到 20h 冷卻判定！）。

### 2.3 六大經濟與照護指令語義（純函式不可變，輸入 `(state, catalog, command, timezoneOffsetMinutes, context?)`）

1. **`ClaimDailyCheckIn`（`+40` 積分，雙重防重）：**
   - 必須同時滿足：
     1. `lastClaimedTimestamp === null || timestamp >= lastClaimedTimestamp`（否則拒領 `CLOCK_ROLLBACK`）；
     2. `lastClaimedLocalDate === null || currentLocalDate > lastClaimedLocalDate`；
     3. `lastClaimedTimestamp === null || (timestamp - lastClaimedTimestamp) >= 20 * 3_600_000`。
   - 通過時：`coins += 40`、`lastClaimedLocalDate = currentLocalDate`、`lastClaimedTimestamp = timestamp`，發 `DailyCheckInClaimedEvent`、`CoinsChangedEvent`、`CommandExecutedEvent`。
2. **`OpenShop`（每日首次 `+5` 積分）：**
   - 若日期未倒退且 `!dailyLimits.shopOpenedToday`：`shopOpenedToday = true`、`coins += 5`，發 `CoinsChangedEvent`（`reason: 'OPEN_SHOP'`）與 `CommandExecutedEvent`。
   - 當日重複開啟：允許操作（回 `CommandExecutedEvent`）但不再發放積分（`+0`）。
3. **`InspectProduct`（停留 `>= 3000ms`、不重複商品 `+10` 積分，日上限 `30`）：**
   - 查 `catalog` 確認商品存在且 `gameBalance.status === 'active'`（`pending_review` 與 `discontinued` 商店隱藏，不得作為有效探索對象）。
   - 若 `dwellMs < 3000`：記錄瀏覽但不發放積分（不計入 `exploredProductIds`，玩家下次停留滿 3 秒仍可領取）。
   - 若 `dwellMs >= 3000` 且尚未在 `exploredProductIds` 且 `explorationCoinsEarned < 30`：
     - `grant = Math.min(10, 30 - explorationCoinsEarned)`，`coins += grant`、`explorationCoinsEarned += grant`、將 `itemId` 加入 `exploredProductIds`，發 `ProductInspectedEvent`、`CoinsChangedEvent`。
   - 同日重複檢視同一商品或已達 `30` 積分上限：發 `ProductInspectedEvent`，但 `grant = 0`。
4. **`PetCat` / `PlayWithPet` 互動獎勵結算（`+5` 積分日上限 `25`；超額仍續給 `mood +3`）：**
   - 接受選填 `context.inNegativeCooldown: boolean`（預留給 `SPEC-04` `BehaviorEngine` Priority 90 15 秒冷卻；未傳預設 `false`）：
     - 若 `inNegativeCooldown === true`：不增加 `mood`、不增加 `coins`（依 PRD §8.B.1 Priority 90 規則）。
     - 若 `inNegativeCooldown === false`：
       - **一律套用 `mood = clamp(mood + 3, 0, 100)`**（即使已超過每日 25 積分上限，第 6 次起依然 `+3` Mood，不阻斷緊急救援！）；
       - 若 `interactionCoinsEarned < 25`：`grant = Math.min(5, 25 - interactionCoinsEarned)`，`coins += grant`、`interactionCoinsEarned += grant`，發 `CoinsChangedEvent`；
       - 立即呼叫 `evaluateRecoveryState(nextPet, timestamp)`（P1-4：若 `mood` 升回 `>= 40` 立即歸零 `lowMoodDuration`）。
5. **`BuyItem`（購買放入背包）：**
   - 檢核 `quantity` 為正整數（預設 `1`）；商品須存在於 `catalog`、`gameBalance.status === 'active'`、且 `vendorInfo.productType !== 'free'`（免費品不需購買）。
   - `totalPrice = item.gameBalance.price * quantity`；若 `pet.coins < totalPrice` 回傳 `CommandRejectedEvent`（`reason: 'INSUFFICIENT_COINS'`），確保 `coins` 永不為負。
   - 扣款並增加 `inventory[itemId] += quantity`，發 `CoinsChangedEvent`、`ItemPurchasedEvent`、`CommandExecutedEvent`。
6. **`FeedPet` / `DrinkWater`（餵食與補水消耗）：**
   - `DrinkWater` 未指定 `itemId` 時預設 `'free_fresh_water'`，且嚴格要求 `category === 'water'`；`FeedPet` 嚴格要求 `category ∈ {'kibble', 'wet_food', 'treat'}`。
   - **免費品（`productType === 'free'`）：** 僅須 `status === 'active'`，無限供應，**絕不檢查亦不扣減 `inventory`**。
   - **付費品（`regular` / `sponsored`）：** 允許 `status === 'active'` **或 `status === 'discontinued'`**（軟下架商品背包內仍可正常使用！），拒絕 `pending_review`；須 `(inventory[itemId] ?? 0) >= 1`，消耗 1 份（數量歸 0 時自 `inventory` 移除該鍵以維持存檔整潔）。
   - 套用 `gameEffect` 至 `hunger` / `hydration` / `mood` 並嚴格 Clamp `[0, 100]`，發 `ItemConsumedEvent`、`NeedsUpdatedEvent`，並立即呼叫 `evaluateRecoveryState(nextPet, timestamp)`（P1-4）。
7. **跨日高健康日結獎勵（`evaluateDailyHighHealthReward`）：**
   - 僅於 `advancePetStateTo` 觸發 `DayRolledOverEvent` 且完成跨日結算之當下呼叫一次：若 `!dailyLimits.dailyHighHealthRewardClaimed && pet.health >= 90 && pet.mood >= 80`，發放 `+25` 積分、標記 `dailyHighHealthRewardClaimed = true`，絕不補發離線錯過的歷史天數。

---

## 3. `SHINUAN-S3-02`：防損 JSON 存檔與 `v1 -> v2` 遷移規格

### 3.1 純邏輯層（`packages/game-core/src/save/`，零 `fs`/`path`）

1. **`validateGameState(raw: unknown)`：**
   - 深度檢查所有必填欄位與值域不變量：`schemaVersion === 2`、有限數檢核（拒 `NaN`/`Infinity`）、`needs ∈ [0, 100]`、`health ∈ [10, 100]`、`recoveryBoostAccumulatedHours ∈ [0, 2.0]`、`lowMoodDuration.below40Hours >= 0`、`lowMoodDuration.below20Hours >= 0`、`coins >= 0`、`inventory` 均為非負整數、`genetics` 七大圖層與版本號完整、`dailyLimits` 日期字串符合 `YYYY-MM-DD`。
   - 完全相容 `Master PRD v2.1.30` 選填增量欄位（如 `discoveredQuirks`、`coatGenotype`、`noseColor`、`pawPadColor`、`littersGeneratedToday` 等）。
2. **`migrateGameState(raw: unknown)`（`v1 -> v2` 漸進遷移）：**
   - 若 `schemaVersion === 2`：直接執行 `validateGameState` 回傳。
   - 若 `schemaVersion === 1`：補齊所有 v2 缺失欄位預設值：
     - `pet.microchipId ??= null`
     - `pet.genetics.fatherPetId ??= null`、`pet.genetics.motherPetId ??= null`
     - `pet.recoveryBoostAccumulatedHours ??= 0`
     - `pet.lowMoodDuration ??= { below40Hours: 0, below20Hours: 0 }`
     - `pet.isCarePaused ??= false`
     - `pet.discoveredQuirks ??= []`
     - 升級 `schemaVersion = 2`，最後必須通過 `validateGameState`；**嚴禁更動既有 `seed`、`appearance`、`basePersonality`、`quirks`、`coins`、`inventory` 或 `lastSimulatedAt`**。
   - 若 `schemaVersion` 未知或高於支援版本（`> 2`）：Fail-Closed 拒絕載入，不得靜默降級覆寫存檔。

### 3.2 防損磁碟寫入與回退流程（Node `JsonGameRepository` Adapter）

檔案位置（同一資料夾內三檔配對）：`save.json`（主檔）、`save.tmp`（暫存寫入檔）、`save.bak`（上一次已驗證合法備份檔）。

1. **防損寫檔（`save(state)`）：**
   1. 以 `validateGameState(state)` 驗證記憶體狀態合法；
   2. 寫入 `save.tmp`（UTF-8 無 BOM，格式化 JSON 利於本機除錯）並刷入磁碟；
   3. **讀回驗證：** 立即重新讀取 `save.tmp` 執行 `JSON.parse` ＋ `validateGameState`，任一步失敗則丟棄 `save.tmp` 並拋錯（絕不覆寫原 `save.json`）；
   4. 若既有的 `save.json` 存在且可解析通過驗證，先複製為 `save.bak`；
   5. 將 `save.tmp` 原子替換為 `save.json`（Windows 上若 `rename` 遇鎖定或既存在衝突，採安全的原子替換處理並確保 `save.bak` 完好）。
2. **防損讀檔與遷移回退（`load()`）：**
   1. 若 `save.json` 與 `save.bak` 皆不存在 → 回傳 `null`（全新開局）；
   2. 嘗試讀取並解析 `save.json`：
      - 若為 `v1` 舊存檔：先將原始未改動檔案備份為 `save.bak`（保留原始現場），再執行 `migrateGameState`；若遷移成功即走防損寫檔升級為 `v2`；若遷移失敗則安全回退讀取 `save.bak` 或拋出明確遷移錯誤；
      - 若 `save.json` 損毀／截斷／JSON 壞檔／Schema 驗證失敗 → 自動嘗試讀取 `save.bak` 並回傳（帶明確可觀測狀態供日誌與看板提示「已自 `save.bak` 自動救援還原」）；
      - 若 `save.json` 與 `save.bak` 皆損毀 → Fail-Closed 拋出明確 `SaveCorruptedError`，絕不覆寫原始壞檔。

---

## 4. 強制前置紀律：Design 自我審核與遇疑即停條款

比照 `SPEC-02` PO 指示，未來 `SHINUAN-S3-01` 與 `SHINUAN-S3-02` 派工包均須置頂要求：
- Claude 實作前必須先對本設計與 `Master PRD v2.1.30`、`@shinuan/contracts` 執行自我審核；遇任何邏輯、邊界或契約矛盾立即 `BLOCKED` 提出質疑提交 PO，嚴禁硬做。

---

## 5. 待 PO 核准的 4 項關鍵設計決策

1. **決策 1（`OpenShop` `+5` 與 `InspectProduct` 探索上限 `30` 的計算口徑）：**
   - **建議（方案 A）：** `DAILY_EXPLORATION_COIN_CAP = 30` 僅限於 `InspectProduct`（每款 `+10` × 最多 3 款不重複商品 = 剛好 `30` 積分），每日首次 `OpenShop`（`+5` 積分）獨立於 `shopOpenedToday` 計算，商店探索合計每日最高 `35` 積分（對齊 `DailyLimits` 已有之獨立欄位 `shopOpenedToday` 與 `explorationCoinsEarned`，且無第 3 款商品只給 `+5` 的零頭困惑）。
   - *(備選方案 B：`OpenShop` `+5` 也併入 `30` 上限，則第 3 款商品僅領 `+5`。)*
2. **決策 2（Node 本機防損 `JsonGameRepository` 存放位置）：**
   - **建議（方案 A）：** 獨立建立極輕量內部套件 `packages/storage-json`（零外部 npm 依賴，僅用 Node 內建 `node:fs/promises` + `node:path`，專責實作 `GameRepository`），讓 `apps/local-sandbox`（`S3-02`）與 `apps/local-cli`（`S4-02`）直接共用同一套防損存檔引擎，完全不污染 `packages/game-core` 純淨度，也不在兩個 App 複製程式碼。
   - *(備選方案 B：先放 `apps/local-sandbox`，等 `S4-02` 再抽共用。)*
3. **決策 3（背包物品數量歸 `0` 時之鍵值清理）：**
   - 消耗最後 1 份付費品使庫存歸 `0` 時，直接自 `pet.inventory` 移除該 `itemId` 鍵（保持存檔精簡，讀取時統一以 `inventory[itemId] ?? 0` 判定）。
4. **決策 4（免費基礎品 `BuyItem` 行為）：**
   - 對 `productType === 'free'` 的商品呼叫 `BuyItem` 一律回傳 `CommandRejectedEvent`（`reason: 'FREE_ITEM_NO_PURCHASE_REQUIRED'`），明確引導直接透過 `FeedPet`／`DrinkWater` 無限使用且不污染 `inventory`。

---

## 6. 驗收對照矩陣（`S3-01` ＋ `S3-02`）

| 驗收劇本 | 歸屬小單 | 核心斷言重點 |
| --- | --- | --- |
| **`TC-07`** | `S3-01` | 開局 200 積分；20h＋本地日期雙重防重簽到；`OpenShop` 首開 `+5`；`InspectProduct` `<3s` 不給分、`>=3s` 每品 `+10` 同日重複不給分、上限 `30`；跨午夜（`23:59 -> 00:01`）正確重置；互動超過 `25` 積分後續給 `mood +3`；購買扣分不負數；免費品免扣背包；軟下架 `discontinued` 商店隱藏但背包可用；需求嚴格 `[0, 100]` Clamp |
| **`TC-MH-11`** | `S3-02` | Day 1 `08:00` Fixture（`lowMoodDuration = {55.5, 23.5}`）→ 防損存檔 → 關閉重載斷言 `{55.5, 23.5}` → `TimeEngine` 推進 `1.0h` → 斷言 `{56.5, 24.5}`（誤差 `< 1e-9`） |
| **防損與遷移專測** | `S3-02` | `save.tmp` 驗證失敗不破壞 `save.json`；`save.json` 損毀自動自 `save.bak` 還原；`v1 -> v2` 遷移補齊全部缺失欄位且 `genetics.appearance`／`seed`／`basePersonality`／`quirks` 100% 零更動；遷移失敗安全回退備份 |
