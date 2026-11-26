# SPEC-04 技術設計文件（Design Spec）：30 日人格記憶、`QuirkModifiers`、`BehaviorEngine`、`GameEngine` 總組裝、CLI 與長時模擬驗收

> **狀態：APPROVED（PO 已於 2026-11-26 核准 §5 全部 4 項設計決策，並要求三張派工單全數置頂強制加入 Claude Design 自我審核與遇疑即停條款；已定稿 `SHINUAN-S4-01`、`SHINUAN-S4-02`、`SHINUAN-S4-03` 派工包）**
> **對應唯一正式規格：** `Master PRD v2.1.30`（§0、§3.2、§4.3、§5.1、§5.2、§8.A.1、§8.B.1～§8.B.3、§8.E.2 `TC-05`／`TC-06`／`TC-08`／`TC-09`）
> **設計產出路徑（Dropbox）：** `D:\Dropbox\ai-bridge\shinuan\tasks\SHINUAN-S4-01\SPEC-04-behavior-cli-simulation-design.md`
> **未來納入 Repo 路徑：** `docs/specs/SPEC-04-behavior-cli-simulation/SPEC-04-behavior-cli-simulation-design.md`

---

## 1. 目標與三張小單切分邊界（`S4-01` / `S4-02` / `S4-03`）

| 小單 ID | 主題 | 核心實作範圍 | 自動化驗收 | PO 眼睛看得到的成果 |
| --- | --- | --- | --- | --- |
| **`SHINUAN-S4-01`** | 30 日人格記憶、`QuirkModifiers` 與 `BehaviorEngine` | `packages/game-core/src/engine/personality/**`、`packages/game-core/src/engine/behavior/**`（4 維度 30 日滾動公式、4 款 MVP 怪癖修飾器、6 級優先仲裁、10s POKE 滑窗、15s/60s 獨立冷卻、傲嬌 45% 撇頭、輸出唯讀 `PetViewModel`） | **`TC-05`**、**`TC-06`** ＋ 單元測試 | `apps/local-sandbox` Tab 4 互動區：連戳貓咪 4 下觸發背對生氣＋15 秒冷卻倒數條＋四維度人格面板 |
| **`SHINUAN-S4-02`** | `GameEngine` 總組裝與 `apps/local-cli` 互動指令列 | `packages/game-core/src/engine/game-engine.ts`（統一 `dispatch(command)` 串接 Time → Economy → Memory/Personality → RecoveryState → Behavior → ViewModel）＋ `apps/local-cli`（Windows 終端機互動養貓 CLI） | CLI 端對端整合測試（`tests/integration/`） | 終端機與網頁雙介面完整驅動同一套 `GameEngine` |
| **`SHINUAN-S4-03`** | 長時模擬驗收套件與 Phase A 結案報告 | `tests/simulation/tc-08-365day-stability.test.ts`、`tests/simulation/tc-09-60day-care-burden.test.ts`（情境 A / B-1 / B-2 / B-3 / C 逐段對帳）＋ Tab 4 趨勢曲線圖 ＋ Phase A 結案報告 | **`TC-08`**、**`TC-09`**（全子情境逐段對帳） | 看板一鍵跑出 60 天／365 天四大數值曲線圖 → **Phase A 正式封版！** |

---

## 2. `SHINUAN-S4-01`：人格記憶、`QuirkModifiers` 與 `BehaviorEngine` 規格鎖定

### 2.1 30 日滾動人格記憶（`personality-engine.ts`，對齊 PRD §3.2）

- **視窗切分（依注入 `timezoneOffsetMinutes` 之本地日期 `YYYY-MM-DD`）：**
  - `recent7Days`：含當日在內最近 7 個本地日曆日（`[today - 6d, today]`）。
  - `prior23Days`：第 8～30 個本地日曆日（`[today - 29d, today - 7d]`）。
  - 超過 30 日之舊 `dailyBuckets` 鍵值於寫入或跨日時自動滾動清理。
- **無有效歷史回歸規則：** 若某維度於過去 30 日內對應之有效互動次數為 `0`，則 `memoryScore = breedBase[dim]`（使 `round(breedBase * 0.6 + breedBase * 0.4) = breedBase` 精確回歸品種天性基準）。
- **四維度精確公式（當 30 日有效次數 > 0，結果 Clamp `[0, 100]` 並四捨五入）：**
  1. **`affection`（親人）：**
     - `r7 = min(1, (pets7d / 21) * 0.6 + (wetFood7d / 7) * 0.4)`
     - `r23 = min(1, (pets23d / 69) * 0.6 + (wetFood23d / 23) * 0.4)`
     - `memoryScore = (r7 * 0.7 + r23 * 0.3) * 100`
     - `finalAffection = Math.round(breedBase.affection * 0.6 + memoryScore * 0.4)`
  2. **`curiosity`（好奇）：**
     - `r7 = min(1, plays7d / 14)`、`r23 = min(1, plays23d / 46)`
     - `memoryScore = (r7 * 0.7 + r23 * 0.3) * 100`
     - `finalCuriosity = Math.round(breedBase.curiosity * 0.6 + memoryScore * 0.4)`
  3. **`laziness`（慵懶，依 `interactions7d = pets7d + plays7d + feeds7d`）：**
     - `interactions7d <= 3` → `100`；`interactions7d >= 14` → `20`；介於 `3~14` → `100 - ((interactions7d - 3) / 11) * 80`
     - `finalLaziness = Math.round(breedBase.laziness * 0.6 + memoryScore * 0.4)`
  4. **`tsundere`（傲嬌）：**
     - `interactions7d < 3` → `90`；否則 `treatRatio = min(1, premiumFood7d / 7)`、`memoryScore = 60 - treatRatio * 50`（滿標降至 `10`）
     - `finalTsundere = Math.round(breedBase.tsundere * 0.6 + memoryScore * 0.4)`
- **重算時機：** 每次有效 `FeedPet`、`DrinkWater`、`PetCat`、`PlayWithPet` 後立即重算；每次 `advanceTo(now)` 偵測本地跨日時亦重算一次。

### 2.2 小怪癖修飾器（`quirk-modifiers.ts`，對齊 PRD §3.2、§8.B.2）

- **套用順序鐵律：** 同一行為命中多個 Quirk 時，**先套用全部 `additiveProbabilityModifier`，再套用全部 `multiplicativeWeightModifier`，最後嚴格 Clamp 於 `[0.05, 0.95]`**。絕不修改 `BasePersonality`、需求、健康或積分。
- **Phase A 4 款 MVP 白名單：**
  - `cursor_hunter`：`additive +0.30`（畫面點擊靠近基礎機率 `0.20 -> 0.50`）
  - `sun_bather`：`multiplicative * 1.3`（日間 `07:00~23:00` 待機選擇母雞蹲／貴妃躺權重）
  - `treat_lover`：`multiplicative * 1.25`（餵食零食／主食罐後待機親近動作權重）
  - `shy_observer`：`additive -0.15`（待機主動漫步靠近螢幕中央機率）
- **隱藏怪癖揭露（`discoveredQuirks`）：** 當某個持有之 Quirk 首次實際影響行為觸發時，自動加入 `pet.discoveredQuirks`（不重複），供 UI 呈現驚喜解鎖感。

### 2.3 `BehaviorEngine` 6 級優先仲裁與冷卻狀態（`behavior-engine.ts`，對齊 PRD §8.B.1）

維護輕量執行期仲裁狀態 `BehaviorRuntimeState`（不進存檔，含 `activeDecision`、`activeStartedAt`、`activeEndsAt`、`activePriority`、`pendingFollowUp`〔供傲嬌 `sniff_and_turn_away` `2000ms` 後自動接 `eat` `3000ms`〕、`pokeTimestampsMs: number[]`、`negativeCooldownEndsAt`、`moderateReminderCooldownEndsAt`）：

| 優先級 | 類別 | 條件與同級仲裁 | 持續時間與冷卻 |
| :---: | --- | --- | --- |
| **100** | `CRITICAL_NEEDS` | `health < 30 \|\| hunger < 15 \|\| hydration < 15`；`iconIds` 合併全部達標（`hospital`/`water`/`fish`）；主動畫序 **`health < 30 > hydration < 15 > hunger < 15`**；可中斷任何低優先級（含 90 與 40 `eat`） | 持續至三者皆達標 |
| **90** | `NEGATIVE_REACTION` | `TriggerLanding`（`dropHeightRatio > 0.25`）或 `[now - 10000, now]` 內 `PokePet > 3` 次（第 4 次觸發）；同級序 **`LANDING > POKE`**；可暫時喚醒睡眠 | 動畫 `4,000 ms`；結束後進入 **`15,000 ms` 互動無效冷卻**（`negativeCooldownEndsAt = activeEndsAt + 15000`；冷卻中再 Poke **不延長**；`PetCat`/`PlayWithPet` 仍播動畫但不給 Mood/積分；`FeedPet`/`DrinkWater` 照常生效） |
| **80** | `SLEEP_MODE` | 本地 `23:00 ~ 07:00` 且無進行中之高優先／Priority 40 互動；`sleep`（或 `cat_loaf`）+ `curled_sleep` + `sleep_zzz` | 僅可被 Priority 100/90 或有效玩家互動（40）喚醒，互動畢回歸睡眠 |
| **60** | `MODERATE_NEEDS` | `hunger < 40 \|\| hydration < 40 \|\| mood < 45` 且未在 `60,000 ms` 提醒冷卻內；`iconIds` 合併；主動畫序 **`hydration < 40 > hunger < 40 > mood < 45`** | 持續 `5,000 ms`，獨立共用冷卻 `60,000 ms`（自 `startedAt` 起算） |
| **40** | `PLAYER_INTERACTION` | 有效 `FeedPet`/`DrinkWater`/`PetCat`/`PlayWithPet`；同 Tick 佇列序 **`FeedPet > DrinkWater > PlayWithPet > PetCat`**；傲嬌 `tsundere >= 70` 餵 `free_basic_kibble` 時 45% 先播 `sniff_and_turn_away`（`2,000 ms` + `sweat`）再自動接 `eat` | `3,000 ms`，不可被待機或 `23:00` 跨夜中斷，可被 100/90 中斷（**動畫中斷絕不回滾已生效之數值與積分**） |
| **10** | `IDLE_AND_PATROL` | 無以上事件；依 `laziness`（`30% + laziness * 0.5%`）與 `QuirkModifiers` 選擇 `walk` / `cat_loaf` / `side_sleep`（需 `mood >= 80`） | `4,000 ~ 8,000 ms`，隨時可被高優先級中斷 |

### 2.4 唯讀 `PetViewModel` 投影（對齊 PRD §5.2）

- 純函式 `projectPetViewModel(pet, decision, updatedAt): PetViewModel`：
  - **嚴格剔除** `decision.interruptible` 與 `decision.cooldownMs`（禁止出現在 `PetViewModel.behavior`）。
  - `display.isSleeping = (decision.animationId === 'sleep')`、`display.isHealthCritical = (pet.health < 40)`、`display.recoveryState = pet.recoveryState`、`display.isCarePaused = pet.isCarePaused`。

---

## 3. `SHINUAN-S4-02`：`GameEngine` 總組裝與 `apps/local-cli`

1. **`GameEngine` 統一管線（`packages/game-core/src/engine/game-engine.ts`）：**
   - 依賴注入：`{ clock: Clock, rng: RandomGenerator, config: LoadedGameConfig }`（不直接依賴 `GameRepository` 磁碟 I/O，存檔由上層 App 呼叫 `storage-json` 持久化）。
   - `dispatch(command: GameCommand)` 固定順序：
     1. 除 `ToggleCarePause(false)` 解除暫停外，先執行 `TimeEngine.advancePetStateTo(pet, command.timestamp, tz)`（若觸發 `DayRolledOverEvent` → 重算 30 日人格 ＋ 呼叫 `EconomyEngine.evaluateDailyHighHealthReward`）；
     2. 查詢 `BehaviorEngine.isInNegativeCooldown(command.timestamp)` 傳給 `EconomyEngine`；
     3. 執行對應指令（Economy / CarePause / Poke / Landing），若屬有效照護互動則更新 `pet.memories.dailyBuckets[localDate]` 並重算 `basePersonality`；
     4. 若改變需求或健康，立即執行 `evaluateRecoveryState(pet, command.timestamp)`（P1-4）；
     5. 執行 `BehaviorEngine.evaluate(...)` 產生 `BehaviorDecision` 與 `BehaviorDecidedEvent`；
     6. 產出唯讀 `PetViewModel` 與完整不可變 `GameEvent[]`。
   - `dispatchBatch(commands: readonly GameCommand[])`：同一時間戳多筆指令自動依 `FeedPet > DrinkWater > PlayWithPet > PetCat` 排序處理。
2. **`apps/local-cli`（Windows 終端機互動養貓 CLI）：**
   - 透過 `@shinuan/game-core`、`@shinuan/config-loader`、`@shinuan/storage-json` 提供互動 REPL 指令：`adopt`、`status`、`feed <itemId>`、`water`、`pet`、`play`、`poke`、`advance <hours>`、`pause on|off`、`shop`、`inspect <itemId> <sec>`、`buy <itemId>`、`save`、`quit`，另支援非互動 `--script` 模式便於自動化端對端整合測試。

---

## 4. `SHINUAN-S4-03`：長時模擬驗收套件與 Phase A 結案

1. **`tests/simulation/tc-08-365day-stability.test.ts`（`TC-08`）：**
   - 固定種子驅動連續 365 天隨機玩家行為（涵蓋正常登入、數日失蹤、`CarePause` 開關、只用免費糧水、偶爾逛商店購買、連戳生氣），每步斷言零 `NaN`/`Infinity`、積分 `>= 0`、`health ∈ [10, 100]`、`needs ∈ [0, 100]`，並驗證第 365 天存檔 JSON 往返還原逐欄位一致。
2. **`tests/simulation/tc-09-60day-care-burden.test.ts`（`TC-09` 全 5 子情境逐段對帳）：**
   - **情境 A**（每日早晚 2 糧 + 2 水 + 2 互動，60 日維持 `Health = 100`）；
   - **子情境 B-1**（每日 1 次 3 糧 + 4 水 + 3 互動，Day 2～60 照護前精確 `26.4 / 26.4 / 77.0 / 100.0`）；
   - **子情境 B-2**（`Health=10 CRITICAL` 起手，Day 2 `40.5` → Day 3 `56.0` → Day 4 `71.5` → Day 5 `87.0` → Day 5 `16:00` 精確滿血 `100.0` 重置 `NORMAL`）；
   - **子情境 B-3**（連續 10 日只餵 3 糧 + 3 水不互動：Day 6 `09:36` 跌破 40 → Day 9 `09:36` 啟動 `-0.05/hr` 扣 `1.12` → Day 10 `08:00` 切換 `-0.1/hr` 受 `40` 地板保護）；
   - **情境 C**（3 日未登入救援起手 → 每日早晚 2 糧 + 2 水 + 2 互動，含夜間持續回血與兩段暫停 → Day 3 `12:40` 精確達 `Health = 100.0` 重置 `NORMAL`）。
3. **Phase A 結案報告與看板曲線：**
   - `apps/local-sandbox` Tab 4 加入「一鍵執行 60 天／365 天模擬」並以純原生 SVG 繪製四大數值（`Hunger` / `Hydration` / `Mood` / `Health`）趨勢曲線圖；
   - 產出 `docs/acceptance/PHASE-A-CLOSEOUT-REPORT.md` 彙整 `TC-01 ~ TC-10` 與 `TC-MH-01 ~ TC-MH-12` 實測證據。

---

## 5. 待 PO 核准的 4 項關鍵設計決策

1. **決策 1（`BehaviorRuntimeState` 不進存檔，重啟採安全初始態）：** 對應 PRD §5.1「存檔不儲存動畫影格」，10 秒 POKE 滑窗、15 秒負面冷卻與 60 秒提醒冷卻僅存活於 `GameEngine` 執行期記憶體，重啟 App 時自動歸零並依當下生理狀態與時段重新仲裁。
2. **決策 2（傲嬌撇頭 `sniff_and_turn_away` 數值結算時機）：** 遵守 PRD §8.B.1「數值與動畫解耦」原則，當 `tsundere >= 70` 餵免費乾糧觸發 45% 先撇頭（`2,000 ms`）再接 `eat`（`3,000 ms`）時，飽食度數值已於 `FeedPet` 指令當下生效，後續動畫若被緊急求救中斷絕不回滾數值。
3. **決策 3（`GameEngine` 不直接持有磁碟 `GameRepository`）：** 維持 `packages/game-core` 100% 純淨與同步可測性（`dispatch()` 為純同步方法），由外層 `apps/local-cli`、`apps/local-sandbox` 與未來 Phase B 手機端 App 呼叫 `@shinuan/storage-json`（或 SQLite）負責 `load()` / `save()`。
4. **決策 4（`S4-01`～`S4-03` 全部強制比照加入 Claude Design 自我審核與遇疑即停條款）：** 特別要求 `S4-03` 跑 `TC-09` 逐段對帳時，若與 PRD 參考時間表發現任何偏差（哪怕小數第 6 位），必須立即停工提交 PO 查核，嚴禁調鬆斷言或覆寫預期值。
