<a id="top"></a>

# SPEC-01｜資料契約、外部設定與貓咪基因遺傳引擎

> **導覽：** [← 回到規格入口](../README.md) ｜ [Phase A 規格地圖](../PHASE-A-SPEC-MAP.md#spec-01) ｜ [Master PRD v2.1.30](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) ｜ [ROADMAP](../../../ROADMAP.md)

---

## 1. 這個 SPEC 的目的是什麼？

解決整個產品最上游的 3 件核心大事：
1. **統一全系統語言（契約鎖死）：** 讓 `game-core`、商店設定、本機看板與未來 Android／iOS 前端講同一套資料結構，不互相打架。
2. **讓設定可隨時調整不改程式（外部 JSON ＋ 安全檢查）：** 品種特徵池、相容規則、商品目錄與系統內定父母全部放在外部 JSON，由驗證器把關防呆。
3. **打造最吸睛的「領養盲盒與真實遺傳」體驗：** 讓每位玩家選出爸媽後，都能生出獨一無二、外觀永久鎖定且符合真實貓咪遺傳學的專屬貓咪！

---

## 2. 要完成哪些功能？

### In-Scope（本 SPEC 涵蓋）
- **跨模組型別契約（`packages/contracts`）：** 定義 `PetState`、`GameState`、`PetGenetics`、`PetAppearance`、`ColorParams`、`PetViewModel`、`GameCommand`、`GameEvent`、`Clock`、`RandomGenerator` 與三區塊商業商品契約。
- **外部靜態設定與商業批次匯入（`content/` + `packages/config-loader`）：** 載入與驗證品種、特徵、相容規則、8 款預設商品與 7 大定價級距天花板，提供 CSV／JSON 批次匯入 CLI 工具，以及損毀設定安全 Fallback。
- **雙軌遺傳引擎（`packages/game-core`）：**
  - **純品種模式（`S1-03`）：** 確定性 PRNG（FNV-1a 32-bit + `mulberry32-v1`）、7 大外觀圖層抽選、特殊骨架規則（曼赤肯短腿／加菲扁臉）、4 條確定性相容修正規則、HSL `±8%` 毛色微調與 4 款小怪癖。
  - **個體父母真實遺傳與一胎 3～5 隻模式（`S1-04`）：** 資料驅動 `preset-parents.v1.json`、9 基因座孟德爾毛色與毛長（`L/l`）遺傳、對稱多基因眼色光譜、確定性鼻頭與肉球、2% 罕見 XXY 公三花彩蛋、精確「像爸爸色 % / 像媽媽色 % / 驚喜新色 %」配對預覽、領養預覽隱藏怪癖遮罩、R1 每日 3 胎上限與帳號總免費擁有上限。
- **領養可視化體驗（`apps/local-sandbox` Tab 1）：** 開瀏覽器直接測試品種盲盒 1,000 隻統計，以及皮克敏式 2D 即時換色選爸媽 → 一胎生 3～5 隻小貓領養。

### Out-of-Scope（明確排除）
- 不實作時間推移衰退、健康救援（`SPEC-02`）、積分購買消費（`SPEC-03`）或即時行為互動（`SPEC-04`）。
- 暫緩商業貓舍合作（父母來源型別僅預留 `system`、`influencer_ip`、`rescue_shelter`）。

---

## 3. 對應 Master PRD 哪幾點？

- **[Master PRD v2.1.30](../../PRD/AI_虛擬桌寵專案規格與需求書%20%28Master%20PRD%29.md) §0 核心術語表：** 全專案統一資料名詞與契約定義。
- **§2.1 / §8.C.2 商品目錄與 7 大定價級距上限：** 三區塊商業化商品 Schema 與防呆天花板驗證。
- **§3.1 / §8.A.1～§8.A.4 品種特徵傳承與純品種遺傳：** 6 大品種特徵池、7 大圖層、相容修正規則 1～4、Seed 永久鎖定。
- **§3.2（第一、二層）/ §8.B.2 小怪癖抽取與預覽神秘感：** 50%/35%/15% 怪癖數抽取與預覽僅示 `hasHiddenQuirks`。
- **§8.A.5 / §8.D 個體父母真實遺傳與一胎 3～5 隻領養：** 9 基因座毛色／毛長、眼色光譜、鼻頭／肉球、2% XXY 彩蛋、R1 每日 3 胎上限與帳號總免費名額。
- **§8.E.2 自動化驗收劇本：** `TC-01`、`TC-02`、`TC-10`。

---

## 4. 小單、技術設計書與驗收成果

- **`SHINUAN-S1-01`（Issue #3 / PR #4 — 已合併 ✅）**
  - **主題：** `packages/contracts` 跨模組型別與介面契約
  - **技術設計書：** [S1-01-contracts-design.md](S1-01-contracts-design.md)
  - **驗收與成果：** `pnpm typecheck` 零錯＋契約列舉與級距單元測試全綠，鎖死全系統型別不互打。

- **`SHINUAN-S1-02`（Issue #5 / #7，PR #6 / #8 — 已合併 ✅）**
  - **主題：** `content/` 靜態 JSON、`packages/config-loader` 與批次匯入驗證 CLI
  - **技術設計書：** [S1-02-config-loader-design.md](S1-02-config-loader-design.md)
  - **驗收與成果：** 7 級距白名單、Fail-Closed 邊界、損毀設定 Fallback 與 `scripts/import-catalog.mjs` 全綠。

- **`SHINUAN-S1-03`（Issue #9 — 開發 95% 暫停中 🟡）**
  - **主題：** `GeneticsEngine`（純品種模式）＋ 領養盲盒可視化頁
  - **技術設計書：** `S1-03-genetics-engine-design.md`（將於 Issue #9 合併時納入本目錄）
  - **驗收與成果：** 通過 **`TC-01`**（Golden Fixture 確定性）與 **`TC-02`**（1,000 種子全組合統計）；開瀏覽器親手選爸媽品種抽盲盒與看 1,000 隻分布圖。

- **`SHINUAN-S1-04`（Issue #12 — 設計定案、派工包完成 📋）**
  - **主題：** 真實貓咪毛色／毛長／眼色／鼻頭肉球遺傳、爸爸%/媽媽% 配對預覽、一胎 3～5 隻與皮克敏式 2D 換色選父母
  - **技術設計書：** [S1-04-preset-parents-litter-design.md](S1-04-preset-parents-litter-design.md)
  - **驗收與成果：** 通過 **`TC-10`** 且 `TC-01`/`TC-02` 零破壞回歸；開瀏覽器點色球即時換色挑爸媽，看「像爸爸色 % / 像媽媽色 %」，一胎生 3～5 隻挑寶貝領養。

---

[↑ 回到頂部](#top) ｜ [← 上一個：SPEC-00](../SPEC-00-foundation/SPEC.md) ｜ [下一個：SPEC-02 →](../SPEC-02-time-engine-health/SPEC.md)
