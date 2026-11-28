<a id="top"></a>

# SPEC-02 技術設計文件（Design Spec）：`TimeEngine`、精確交點切割、`MoodHealthPenalty`、`RecoveryState` 與 `CarePause`

> **導覽與追溯：** [← 回到規格入口](../README.md#entry-spec-02) ｜ [所屬規格 SPEC-02](./SPEC.md) ｜ [Phase A 規格地圖](../PHASE-A-SPEC-MAP.md#spec-02) ｜ [Master PRD v2.1.31](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [GitHub Issue #13](https://github.com/blissjoy/shinuan/issues/13) / [#14](https://github.com/blissjoy/shinuan/issues/14)

> **狀態：APPROVED（PO 已於 2026-11-26 核准 §5 全部 4 項設計決策，並於 2026-11-27 `SHINUAN-DOC-08` 補齊跨時區與夏令時間偏移語義；派工包強制要求 Claude 實作前自我審核）**
> **對應唯一正式規格：** `Master PRD v2.1.31`（§0、§4.2、§5.1、§8.A.1、§8.C.1、§8.E.2 `TC-03`／`TC-04`／`TC-09`、§8.E.3 `TC-MH-01`～`TC-MH-12`、§10.2）
> **設計產出路徑（Dropbox）：** `D:\Dropbox\ai-bridge\shinuan\tasks\SHINUAN-S2-01\SPEC-02-time-engine-health-design.md`
> **未來納入 Repo 路徑：** `docs/specs/SPEC-02-time-engine-health/SPEC-02-time-engine-health-design.md`（隨 `SHINUAN-S2-01` 任務分支或獨立純文件 PR 納入）

---

## 1. 目標與小單切分邊界（`S2-01` vs `S2-02`）

為降低單次開發與獨立 QA 風險、且避免 `S2-02` 重寫 `S2-01` 主迴圈，本設計將 `SPEC-02` 切分為清晰疊加的 2 張小單：

| 小單 ID | 主題 | 核心實作模組（`packages/game-core/src/engine/time/`） | 自動化驗收 | `apps/local-sandbox` Tab 2 進度 |
| --- | --- | --- | --- | --- |
| **`SHINUAN-S2-01`** | `TimeEngine` 基礎推進與需求衰退 | `constants.ts`、`local-time.ts`、`threshold-crossing.ts`（基礎日夜與 `Hunger/Hydration=20` 交點）、`time-engine.ts`（`advancePetNeeds` / `advancePetStateTo` 基礎版：防時鐘回撥、0.25h 步長、`07:00`/`23:00` 切割、本地跨日 `ageInDays`、`Hunger`/`Hydration`/`Mood` 衰退） | **`TC-03`**（跨夜、跨日、零頭累計、分段誤差 `< 1e-9`、時鐘回撥） | Tab 2 基礎版：四大狀態條、日夜背景切換、快轉 `+15m / +1h / +6h / +24h` |
| **`SHINUAN-S2-02`** | 精確交點切割、`MoodHealthPenalty`、`RecoveryState` 與 `CarePause` | 擴充 `threshold-crossing.ts`（全 12 組門檻＋`below40Hours=72`／`below20Hours=48`／`boostAcc=2.0`）、`health-penalty.ts`、`recovery-state.ts`、`care-pause.ts`、完整版 `advancePetStateTo` 與 `evaluateRecoveryState`（P1-4） | **`TC-04`**、**`TC-MH-01`～`TC-MH-10`**、**`TC-MH-12`**、Property-based 不變量測試 | Tab 2 完整版：一鍵演練「3 天未登入 → `CRITICAL` → 2h Boost → 滿血復活」、`CarePause` 開關、`RecoveryState` 燈號與 `lowMoodDuration` 面板 |

> **零外部依賴與平台純淨度保證：** `packages/game-core/src/engine/time/**` 100% 純 ES2022 TypeScript，嚴禁呼叫 `Date.now()`、`new Date().getHours()`、`getTimezoneOffset()`、`Math.random()` 或任何 Node/Browser API；所有本地日曆計算一律以注入之 `timezoneOffsetMinutes` 透過 `UTC` 欄位推算。

---

## 2. 集中共用常數契約（`TIME_ENGINE_CONSTANTS`）

集中定義於 `packages/game-core/src/engine/time/constants.ts`，嚴禁其他模組自訂不同容差或數值：

```ts
export const TIME_ENGINE_CONSTANTS = Object.freeze({
  MS_PER_MINUTE: 60_000,
  MS_PER_HOUR: 3_600_000,
  MS_PER_DAY: 86_400_000,

  /** 一般模擬最大基礎步長：0.25 小時（15 分鐘）。 */
  MAX_SIMULATION_STEP_HOURS: 0.25,
  MAX_SIMULATION_STEP_MS: 900_000,

  /** 數值門檻比較與時間戳去重容差（PRD §8.C.1）。 */
  VALUE_EPSILON: 1e-9,
  TIME_EPSILON_MS: 1e-3,

  /** 日夜本地時間邊界與係數。 */
  DAY_START_HOUR: 7,
  NIGHT_START_HOUR: 23,
  DAY_PERIOD_FACTOR: 1.0,
  NIGHT_PERIOD_FACTOR: 0.3,

  /** 需求衰退基礎速率（/hr，乘以 periodFactor）。 */
  HUNGER_DECAY_PER_HOUR: 4.0,
  HYDRATION_DECAY_PER_HOUR: 4.0,
  MOOD_BASE_DECAY_PER_HOUR: 1.25,
  MOOD_LOW_NEED_EXTRA_DECAY_PER_HOUR: 1.5,

  /** 健康扣血速率（/hr，不受 periodFactor 減免）。 */
  STARVATION_HEALTH_RATE: -2.0,
  MOOD_BELOW_40_HEALTH_RATE: -0.05,
  MOOD_BELOW_20_HEALTH_RATE: -0.1,

  /** 健康保護下限與安全地板。 */
  HEALTH_MIN_FLOOR: 10,
  HEALTH_MOOD_SAFE_FLOOR: 40,
  HEALTH_MAX: 100,

  /** 需求與低心情門檻。 */
  LOW_NEED_THRESHOLD: 20,
  BOOST_NEED_THRESHOLD: 50,
  NATURAL_RECOVERY_NEED_THRESHOLD: 60,
  MOOD_HIGH_RECOVERY_THRESHOLD: 70,
  MOOD_LOW_40_THRESHOLD: 40,
  MOOD_LOW_20_THRESHOLD: 20,
  LOW_MOOD_40_TRIGGER_HOURS: 72.0,
  LOW_MOOD_20_TRIGGER_HOURS: 48.0,

  /** 健康救援恢復速率（/hr，不受 periodFactor 減免）與上限。 */
  RECOVERY_BOOST_RATE: 10.0,
  RECOVERY_BOOST_MAX_HOURS: 2.0,
  NATURAL_RECOVERY_HIGH_MOOD_RATE: 2.5,
  NATURAL_RECOVERY_MID_MOOD_RATE: 1.25,
} as const);
```

---

## 3. 核心數學模型與精確交點切割演算法

### 3.1 注入時區本地時間換算（`local-time.ts`）

- 給定 Unix 時間戳 `utcMs`（`number`，須為有限數）與 `timezoneOffsetMinutes`（相對於 UTC 之偏移分鐘數，例如台灣 UTC+8 為 `+480`）：
  - `localMs = utcMs + timezoneOffsetMinutes * 60_000`
  - 使用 `new Date(localMs)` 的 **`getUTCFullYear()`、`getUTCMonth()`、`getUTCDate()`、`getUTCHours()`、`getUTCMinutes()`、`getUTCSeconds()`、`getUTCMilliseconds()`**（嚴禁呼叫任何非 `UTC` 之 getter！）。
- **日夜係數 `getPeriodFactor(utcMs, timezoneOffsetMinutes)`：**
  - 本地時間 `07:00:00.000 <= localTimeOfDay < 23:00:00.000` → `1.0`；其餘（`23:00:00.000 ~ 07:00:00.000`）→ `0.3`。
- **下一個固定時間邊界 `findNextClockBoundaryMs(utcMs, timezoneOffsetMinutes)`：**
  - 找出嚴格大於 `utcMs + TIME_EPSILON_MS` 之最近一個本地 `00:00`（跨日）、`07:00`（日夜切換）或 `23:00`（日夜切換）對應的 UTC 毫秒時間戳。
  - **為何同時切 `00:00`？** 確保跨本地午夜時精確觸發 `DayRolledOverEvent` 與 `ageInDays` 遞增，同時不影響夜間 `periodFactor = 0.3` 計算。
- **跨時區旅行與夏令時間（DST）語義鎖定（`P1-07`）：**
  - MVP 階段不於 `packages/game-core` 引入龐大 IANA 時區資料庫；每次 `advancePetStateTo(pet, targetTimestamp, timezoneOffsetMinutes)` 調用，一律以**該次調用當下由 `Clock.getTimezoneOffsetMinutes()` 注入之單一固定偏移值**套用於該次 `[lastSimulatedAt, targetTimestamp]` 離線補算區間，不追溯離線期間曾發生的歷史夏令時間切換點。
  - 若玩家往西跨時區旅行導致 `currentLocalDate < dailyLimits.lastClaimedLocalDate` 或 `currentLocalDate < dailyLimits.localDate`，跨日獎勵與 R1 繁育上限受 `SPEC-03` §2.2 既有日期倒退防護保護（絕不重複發放或偷重置），待進入新本地日曆日即自動恢復正常。

### 3.2 時鐘回撥與輸入防護（Fail-Closed）

1. 若 `targetTimestamp`、`pet.lastSimulatedAt` 或 `timezoneOffsetMinutes` 非有限數（`!Number.isFinite(...)`），拋出明確錯誤（`TimeEngineError`）。
2. 若 `targetTimestamp < pet.lastSimulatedAt`（時鐘回撥，PRD §10.2 #2）：
   - 忽略負時間差（`Δt = 0`），**嚴禁修改 `pet.lastSimulatedAt` 或任何需求／健康數值**；
   - 回傳原 `pet` 與一筆 `ClockRollbackDetectedEvent { type: 'ClockRollbackDetected', timestamp: targetTimestamp, lastKnownTimestamp: pet.lastSimulatedAt, observedTimestamp: targetTimestamp }`。
3. 若 `Math.abs(targetTimestamp - pet.lastSimulatedAt) <= TIME_EPSILON_MS`：視為零時間差，直接回傳原狀態（若 `targetTimestamp > pet.lastSimulatedAt` 可同步更新 `lastSimulatedAt` 但不執行零時間區段）。
4. 若 `pet.isCarePaused === true`（PRD §4.2、§8.C.1 步驟 5.6）：
   - 凍結全部需求衰退、低心情計時、健康扣減與 `RecoveryState` 累計時數；
   - **不更新 `lastSimulatedAt`（或由解除暫停時統一將 `lastSimulatedAt` 設為 `resumeTimestamp`）**，維持暫停期間完全零補算。

### 3.3 右極限（`t_start + 0⁺`）片斷線性積分與精確交點切割

在任何子區段 `[t_start, t_max]`（其中 `t_max = min(targetTimestamp, t_start + MAX_SIMULATION_STEP_MS, nextClockBoundaryMs)`）內，因為**所有數值在未跨越門檻前都是線性函數**，只要我們計算出所有「數值確實朝門檻移動且交點落於 `(t_start + TIME_EPSILON_MS, t_max]`」之候選交點，取**最早的一個交點 `t_next`** 作為本子區段終點，就能保證：
- 開區間 `(t_start, t_next)` 內**絕無任何狀態切換或門檻跨越**；
- 一次補算 120h 與分 10 次 × 12h（甚至每分鐘切一次）在數學上逐段等價，誤差嚴格 `< 1e-9`！

**右極限比較輔助函式（消除邊界雙義性，100% 對齊 `TC-09` 與 `TC-MH-05`）：**
```ts
/** 在 t_start + 0⁺ 時，數值是否嚴格小於 threshold（含正好等於 threshold 且正在下降）。 */
function isBelowRightLimit(value: number, threshold: number, ratePerHour: number): boolean {
  return value < threshold - VALUE_EPSILON ||
    (Math.abs(value - threshold) <= VALUE_EPSILON && ratePerHour < 0);
}

/** 在 t_start + 0⁺ 時，數值是否嚴格大於 threshold（含正好等於 threshold 且正在上升）。 */
function isAboveRightLimit(value: number, threshold: number, ratePerHour: number): boolean {
  return value > threshold + VALUE_EPSILON ||
    (Math.abs(value - threshold) <= VALUE_EPSILON && ratePerHour > 0);
}
```

**單一子區段 `[t_start, t_max]` 之 4 階段精確步進：**

1. **決定當前開區間 `(t_start, t_next)` 之瞬間斜率（全數由 `t_start + 0⁺` 決定）：**
   - `periodFactor = getPeriodFactor(t_start, timezoneOffsetMinutes)`
   - **需求斜率：**
     - `hungerRate = pet.needs.hunger > VALUE_EPSILON ? -4.0 * periodFactor : 0`
     - `hydrationRate = pet.needs.hydration > VALUE_EPSILON ? -4.0 * periodFactor : 0`
     - `lowNeedActive = isBelowRightLimit(hunger, 20, hungerRate) || isBelowRightLimit(hydration, 20, hydrationRate)`
     - `moodRate = pet.needs.mood > VALUE_EPSILON ? -(1.25 + (lowNeedActive ? 1.5 : 0)) * periodFactor : 0`
   - **低心情計時與 `moodHealthRate`（`S2-02`）：**
     - `moodBelow40 = isBelowRightLimit(mood, 40, moodRate)`
     - `moodBelow20 = isBelowRightLimit(mood, 20, moodRate)`
     - 若 `!moodBelow40`（`mood >= 40`）：`below40Hours = 0`、`below20Hours = 0`、`below40Rate = 0`、`below20Rate = 0`、`rawMoodHealthRate = 0`。
     - 若 `moodBelow40 && !moodBelow20`（`Mood 20~39`）：`below20Hours = 0`、`below40Rate = +1`、`below20Rate = 0`；若 `isAboveRightLimit(below40Hours, 72.0, +1)` 則 `rawMoodHealthRate = -0.05`，否則 `0`。
     - 若 `moodBelow20`（`Mood 0~19`）：`below40Rate = +1`、`below20Rate = +1`；
       - 若 `isAboveRightLimit(below20Hours, 48.0, +1)` → `rawMoodHealthRate = -0.1`（取代 `-0.05`，不疊加）；
       - 否則若 `isAboveRightLimit(below40Hours, 72.0, +1)` → `rawMoodHealthRate = -0.05`；
       - 否則 → `0`。
   - **飢餓／缺水扣血速率 `starvationHealthRate` 與 40/10 地板合併（`S2-02`）：**
     - `canStarve = lowNeedActive && isAboveRightLimit(health, 10, -1)` → `starvationHealthRate = canStarve ? -2.0 : 0`。
     - `effectiveMoodHealthRate = (rawMoodHealthRate < 0 && health > 40 + VALUE_EPSILON) ? rawMoodHealthRate : 0`（抵達 `40.0` 後強制為 `0/hr`！）。
     - `totalHealthPenaltyRate = starvationHealthRate + effectiveMoodHealthRate`。
   - **健康救援恢復速率 `recoveryHealthRate`（`S2-02`）：**
     - 先在 `t_start` 執行一次 `evaluateRecoveryState`（確保若剛進入 `RECOVERY_BOOST` 或耗盡 `2.0h` 已處於正確狀態）。
     - 若 `recoveryState === 'RECOVERY_BOOST'` 且 `!isBelowRightLimit(hunger, 50, hungerRate) && !isBelowRightLimit(hydration, 50, hydrationRate)` 且 `recoveryBoostAccumulatedHours < 2.0 - VALUE_EPSILON`：
       - `recoveryHealthRate = +10.0`、`boostAccRate = +1.0`。
     - 否則若 `recoveryState === 'RECOVERY_BOOST'`（需求跌破 50）：立即退回 `CRITICAL`（保留 `recoveryBoostAccumulatedHours`），`recoveryHealthRate = 0`、`boostAccRate = 0`。
     - 若 `recoveryState === 'NATURAL_RECOVERY'` 且 `!isBelowRightLimit(hunger, 60, hungerRate) && !isBelowRightLimit(hydration, 60, hydrationRate)`：
       - 若 `!isBelowRightLimit(mood, 70, moodRate)` → `recoveryHealthRate = +2.5`；
       - 否則若 `!isBelowRightLimit(mood, 40, moodRate)` → `recoveryHealthRate = +1.25`；
       - 否則（`mood < 40`）→ `recoveryHealthRate = 0`。
     - 其他情況：`recoveryHealthRate = 0`、`boostAccRate = 0`。
   - **總健康淨速率：** `netHealthRate = totalHealthPenaltyRate + recoveryHealthRate`（註：因回血條件均要求 `hunger/hydration >= 50`，與飢餓 `< 20` 互斥；若 `NATURAL_RECOVERY` 期間恰好同時無低心情扣血亦自然分離，即使極端邊界交會也滿足線性疊加並由下方門檻精確切割）。

2. **收集候選交點並取最早 `t_next`（Signed Rate Threshold Crossing）：**
   統一使用帶正負號交點函式：
   ```ts
   function computeSignedCrossingMs(
     tStart: number,
     tMax: number,
     currentValue: number,
     targetThreshold: number,
     ratePerHour: number,
   ): number | null {
     if (ratePerHour === 0) return null;
     if (Math.abs(currentValue - targetThreshold) <= VALUE_EPSILON) return null;
     const deltaHours = (targetThreshold - currentValue) / ratePerHour;
     if (deltaHours <= 0) return null; // 遠離門檻
     const tCross = tStart + deltaHours * MS_PER_HOUR;
     if (tCross > tStart + TIME_EPSILON_MS && tCross <= tMax) {
       return tCross;
     }
     return null;
   }
   ```
   檢查全部候選交點清單：
   - `hunger`：`60, 50, 20, 0`（`S2-01` 檢 `20, 0`；`S2-02` 補 `60, 50`）
   - `hydration`：`60, 50, 20, 0`（`S2-01` 檢 `20, 0`；`S2-02` 補 `60, 50`）
   - `mood`：`70, 40, 20, 0`（`S2-01` 檢 `0`；`S2-02` 補 `70, 40, 20`）
   - `health`：`100, 40, 10`（`S2-02`）
   - `below40Hours`：`72.0`、`below20Hours`：`48.0`（`S2-02`）
   - `recoveryBoostAccumulatedHours`：`2.0`（`S2-02`）
   - 取 `t_next = min(t_max, ...allValidCrossings)`，且對與 `t_start` 距離 `<= TIME_EPSILON_MS` 之重複交點去重忽略（防止無窮迴圈；另加安全防呆迴圈上限檢查）。

3. **線性推進 `actualHours = (t_next - t_start) / MS_PER_HOUR` 並對齊精確門檻：**
   - 依斜率線性更新 `hunger`、`hydration`、`mood`、`below40Hours`、`below20Hours`、`recoveryBoostAccumulatedHours` 與 `health`。
   - 對非常接近門檻（`Math.abs(val - threshold) <= VALUE_EPSILON`）的值貼齊精確門檻（避免 `39.99999999999999` 誤判為 `< 40`！）；並嚴格 Clamp：`needs ∈ [0, 100]`、`health ∈ [10, 100]`（若僅有 `MoodHealthPenalty` 作用且 `starvationHealthRate === 0`，額外斷言 `health >= 40`）、`recoveryBoostAccumulatedHours ∈ [0, 2.0]`。

4. **區段終點狀態機評估（`evaluateRecoveryState`）：**
   - 若 `health >= 100 - VALUE_EPSILON` → `health = 100`，若 `recoveryState !== 'NORMAL'` 轉回 `'NORMAL'`（發 `RecoveryStateChangedEvent`）並重置 `recoveryBoostAccumulatedHours = 0`。
   - 否則若 `recoveryState === 'NORMAL'` 且 `health < 40 - VALUE_EPSILON` → 轉 `'CRITICAL'`，重置 `recoveryBoostAccumulatedHours = 0`（僅此次轉換歸零！）。
   - 若 `recoveryState === 'RECOVERY_BOOST'` 且 `recoveryBoostAccumulatedHours >= 2.0 - VALUE_EPSILON` → `recoveryBoostAccumulatedHours = 2.0`，立即轉 `'NATURAL_RECOVERY'`（即使 `health < 40` 或需求未滿 60/60/70 亦絕不退回 `CRITICAL`）。
   - 若 `recoveryState === 'CRITICAL'` 且 `hunger >= 50 - VALUE_EPSILON && hydration >= 50 - VALUE_EPSILON && recoveryBoostAccumulatedHours < 2.0 - VALUE_EPSILON` → 轉 `'RECOVERY_BOOST'`。
   - 若 `recoveryState === 'RECOVERY_BOOST'` 且 `(hunger < 50 - VALUE_EPSILON || hydration < 50 - VALUE_EPSILON)` → 退回 `'CRITICAL'`（**保留** `recoveryBoostAccumulatedHours`）。
   - 若 `t_next` 跨越本地 `00:00` → `ageInDays += 1` 並發 `DayRolledOverEvent { fromLocalDate, toLocalDate }`。

---

## 4. `CarePause` 與指令後即時重評（P1-4）契約

1. **`evaluateRecoveryState(pet, timestamp)`（供所有改變需求／健康之 `GameCommand` 結算後立即呼叫）：**
   - 依 §3.3 步驟 4 規則立即檢查狀態轉換，並同步處理 `mood >= 40` 時立即重置 `lowMoodDuration = { below40Hours: 0, below20Hours: 0 }`（以及 `mood >= 20 && mood < 40` 時重置 `below20Hours = 0`），以 `timestamp` 作為 `RecoveryStateChangedEvent.timestamp`，絕不延遲至下一個 `SimulationStep`。
2. **`toggleCarePause(pet, enabled, timestamp, timezoneOffsetMinutes)`：**
   - **開啟（`false -> true`）：** 先呼叫 `advancePetStateTo(pet, timestamp, timezoneOffsetMinutes)` 完成此前所有應有離線結算，再將 `isCarePaused = true` 並發出 `CarePauseToggledEvent { enabled: true, timestamp }`。
   - **解除（`true -> false`）：** 若 `timestamp < pet.lastSimulatedAt` 仍受時鐘回撥保護拒絕倒退；否則**不執行暫停期間補算**，直接設 `isCarePaused = false`、`lastSimulatedAt = timestamp`，呼叫一次 `evaluateRecoveryState(pet, timestamp)`，並發出 `CarePauseToggledEvent { enabled: false, timestamp }`。
   - **冪等性：** 重複開啟或重複關閉時回傳不變狀態（或無額外狀態破壞）。

---

## 5. 待 PO 核准的 4 項關鍵設計決策

以下 4 項均完全遵守 `Master PRD v2.1.31` 核心數值與公式（零更動任何 PRD 規則），確認後即可據此產出 `SHINUAN-S2-01` 與 `SHINUAN-S2-02` 精簡派工包：

1. **決策 1（純函式不可變 API ＋ 可選分段追蹤 `segments`）：** `advancePetStateTo(pet, targetTimestamp, timezoneOffsetMinutes, options?: { traceSegments?: boolean })` 採不可變回傳 `{ pet, events, segments }`；開啟 `traceSegments` 時直接輸出每個子區段的起訖時間、斜率與轉換點，供 `TC-09` 情境 B/C 逐段對帳與看板檢視，免去重複寫模擬器。
2. **決策 2（右極限門檻語義 `t_start + 0⁺` 作為唯一片斷積分規則）：** 統一以門檻處數值與斜率方向決定子區段規則（並於交點處將 `|val - threshold| <= 1e-9` 貼齊精確門檻），確保 `TC-03`、`TC-04`、`TC-09`（B-1/B-2/B-3/C）與 `TC-MH-01～12` 全部 `< 1e-9` 零漂移通過。
3. **決策 3（跨日職責切分）：** `TimeEngine` 僅負責依注入時區更新 `ageInDays` 並發出 `DayRolledOverEvent`；高健康度日結獎勵（`+25` 積分）歸屬 `SPEC-03` `EconomyEngine`，保持 `TimeEngine` 與經濟系統完全解耦。
4. **決策 4（`S2-01` 先行建置 `Hunger=20` / `Hydration=20` 交點與共用常數）：** `S2-01` 階段即建立 `TIME_ENGINE_CONSTANTS` 與通用 `computeSignedCrossingMs` 引擎骨架（處理日夜 `07:00`/`23:00`、`00:00` 跨日與 `Hunger/Hydration = 20, 0`），讓 `S2-02` 只需無縫加入健康／低心情／救援交點而零重寫主迴圈。

---

## 6. 驗收對照矩陣（`S2-01` ＋ `S2-02`）

| 驗收劇本 | 歸屬小單 | 核心斷言重點 |
| --- | --- | --- |
| **`TC-03`** | `S2-01` | `22:50~23:05`（10m×1.0 + 5m×0.3）、`06:45~07:15` 跨日、未滿 15m 零頭累計、24h 單次 vs 4×6h 分段誤差 `< 1e-9`、時鐘回撥不改 `lastSimulatedAt` 且恢復後正常補算 |
| **`TC-04`** | `S2-02` | `health=40` 不進 `CRITICAL`、`health=39` 進 `CRITICAL`（僅此轉換歸零 `boostAcc`）、50/50 進 `RECOVERY_BOOST`、跌至 49 暫停保留 `boostAcc`、用滿 `2.0h` 即使 `health=30` 亦轉 `NATURAL_RECOVERY` 不卡死、跨 40 與 100 Clamp |
| **`TC-MH-01 ~ 10`, `12`** | `S2-02` | `Mood>=40` 零扣血、`20~39` 滿 `72h` 後 `-0.05/hr`、`0~19` 滿 `48h` 後 `-0.1/hr`（不疊加）、`40.0` 安全地板隔離、`-2.1/hr` 合併至 `40.0` 再 `-2.0/hr` 至 `10.0` 停住、`Mood>=40` 歸零計時、`NATURAL_RECOVERY` `+2.5/+1.25/0` 分級、120h 單次 vs 10×12h 誤差 `< 1e-9`、夜間低心情不減免 |
| **Property-based 不變量** | `S2-02` | 隨機時間分割與隨機狀態組合下：`10 <= health <= 100`、`0 <= needs <= 100`、`0 <= recoveryBoostAccumulatedHours <= 2.0`、零 `NaN`/`Infinity`、任意切分誤差 `< 1e-9` |
| *註：`TC-MH-11`（存檔續算）歸屬 `S3-02`；`TC-08`/`TC-09`（365/60 日總模擬）歸屬 `S4-03`（但 `S2-02` 單元測試會先行以核心子情境驗算確保零偏差）。* | | |
