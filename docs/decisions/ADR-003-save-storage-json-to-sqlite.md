# ADR-003：跨階段存檔演進架構（Phase A 防損 JSON → Phase C 手機端 SQLite 無痛銜接）

- **狀態：** `ACCEPTED`（PO 已於 2026-11-26 拍板核准，透過 `SHINUAN-DOC-03` 納入 `docs/decisions/ADR-003-save-storage-json-to-sqlite.md`）
- **決策日期：** 2026-11-26
- **關聯規格：** `Master PRD v2.1.31`（§5.1、§5.2、§8.A.5、§8.E.1、§8.E.3 `TC-MH-11`）、`docs/specs/SPEC-03-economy-save/SPEC-03-economy-save-design.md`、`docs/specs/SPEC-01-contracts-config-genetics/S1-04-preset-parents-litter-design.md`

---

## 1. 背景與目標

- **Phase A（Windows 本機驗證）：** 採零外部依賴之防損 JSON 存檔（`@shinuan/storage-json`：`save.tmp` → 讀回驗證 → `save.bak` → 原子替換）。
- **Phase C（Android / iOS 手機上線）：** 須升級為 SQLite（`game_saves` 與 `game_events` 兩張表），兼顧手機斷電原子寫入（WAL Transaction）、快速除錯事件日誌查詢與 30 日滾動清理。
- **核心目標：** 從 Phase A 升級至 Phase C 時，**`packages/game-core` 零修改**，且同一支 `TC-MH-11`（`lowMoodDuration` 跨存檔續算）與 `v1 -> v2` 遷移測試在兩種 Adapter 上 100% 同源通過！

---

## 2. 統一介面與共用核心層設計

1. **唯一存檔契約：** 所有上層 App（`local-cli`、`local-sandbox`、`apps/mobile`）一律只依賴 `@shinuan/contracts` 的 `GameRepository` 介面（`load(): Promise<GameState | null>` / `save(state: GameState): Promise<void>`）。
2. **純邏輯集中於 `packages/game-core/src/save/`（零 I/O）：**
   - `validateGameState`、`migrateGameState`（`v1 -> v2`）、`serializeGameState`、`deserializeAndMigrateGameState` 全部屬於純 TS 函式。
   - **JSON Adapter（Phase A）與 SQLite Adapter（Phase C）強制共用同一套驗證與遷移函式**，杜絕雙平台反序列化漂移或舊貓外觀遭重置的風險。

---

## 3. Phase C SQLite 表結構與原子交易規範（對齊 PRD §8.E.1 #3）

```sql
-- 主存檔表（單一活躍存檔列，採 WAL 模式與 BEGIN IMMEDIATE 交易）
CREATE TABLE IF NOT EXISTS game_saves (
  id                TEXT PRIMARY KEY,
  schema_version    INTEGER NOT NULL,        -- 目前為 2（向後相容 v2.1.30 / v2.1.31 選填欄位）
  game_core_version TEXT NOT NULL,
  pet_state_json    TEXT NOT NULL,           -- 完整序列化 PetState（含 lastSimulatedAt / lowMoodDuration / discoveredQuirks）
  daily_limits_json TEXT NOT NULL,           -- 完整序列化 DailyLimits（含 littersGeneratedToday / lastLitterGeneratedAt）
  account_meta_json TEXT NOT NULL,           -- 獨立帳戶層元資料（AdoptionSlotPolicy: maxFreeOwnedPets / purchasedExtraPetSlots / ownedPetIds，不混入單一 PetState，預留 Phase E 雲端同步權威）
  created_at        INTEGER NOT NULL,        -- 由注入 Clock.now() 寫入，僅維運追蹤
  updated_at        INTEGER NOT NULL         -- 由注入 Clock.now() 寫入，不得取代 pet.lastSimulatedAt
);

-- 行為追蹤與除錯日誌表（非主存檔來源，定期清理 > 30 天紀錄）
CREATE TABLE IF NOT EXISTS game_events (
  seq               INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type        TEXT NOT NULL,
  event_timestamp   INTEGER NOT NULL,
  payload_json      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_game_events_ts ON game_events (event_timestamp);
```

- **交易與防損規則：**
  1. 寫入前先以 `validateGameState` 通過驗證；
  2. 開啟 SQLite `PRAGMA journal_mode = WAL;` 與 `PRAGMA synchronous = FULL;`；
  3. 透過單一 `TRANSACTION` 寫入 `game_saves`（必要時先寫入 `game_saves_backup` 保留升級前最後一版合法快照，對應 Phase A 的 `save.bak`）；
  4. `game_events` 寫入失敗不得回滾主存檔 `game_saves`；每次啟動自動執行 `DELETE FROM game_events WHERE event_timestamp < now - 30 * 86400000`。
- **選用套件建議（Phase C 導入，Phase A 不安裝）：** 建議採 `op-sqlite`（支援 JSI 同步／非同步高效存取，或 Expo 體系之 `expo-sqlite`），封裝於獨立套件 `packages/storage-sqlite`，不影響 `packages/game-core`。

---

## 4. 共用驗收合約（Contract Test Suite）

於 `tests/unit/tc-mh-11-save-persistence.test.ts` 將 `TC-MH-11` 與損毀／遷移測試抽成可重複注入 `GameRepository` 工廠的 Contract Test Suite：
- Phase A 針對 `@shinuan/storage-json` 執行；
- Phase C 針對 `@shinuan/storage-sqlite` 跑**同一套測試案例**，確保雙階段行為 100% 一致。

---

## 5. PO 拍板確認紀錄（2026-11-26）

- [x] 核准 Phase A（`@shinuan/storage-json`）與 Phase C（`@shinuan/storage-sqlite`）嚴格共用 `GameRepository` 契約與 `packages/game-core/src/save/` 純邏輯驗證／遷移層。
- [x] 核准 Phase C SQLite 表結構採 WAL 模式 ＋ `game_saves_backup` 升級備份 ＋ `game_events` 30 日自動清理，並以共用 Contract Test Suite 驗證 `TC-MH-11`。
