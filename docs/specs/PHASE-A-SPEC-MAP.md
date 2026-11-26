# 拾暖伴伴（SHINUAN）Phase A 規格拆解地圖（SPEC-00 ～ SPEC-04）

**文件性質：** Phase A 大／中／小規格拆解與漸進可視化驗收藍圖（PO 已核准，2026-11-26 同步 `v2.1.30` 更新）
**對應基準：** `Master PRD v2.1.30`（候選稿：`Master-PRD-v2.1.30-candidate.md`）  
**治理模式：** 導入拾戰 AI Studio 已生效制度（`P-08 v0.3`、`GOV-003 v0.1`、`MOS v0.3`）  
**追蹤原則：** 每張小單對應 **1 個 GitHub Issue ＋ 1 條任務分支 ＋ 1 個 PR**；僅於確定開工時開立對應 Issue。

---

## 一、總覽：5 大規格 × 12 張小派工單

| 大規格（Epic） | 小單 ID | 主題 | 核心交付 | 自動化驗收門檻 | PO 眼睛看得到的成果 |
|---|---|---|---|---|---|
| **`SPEC-00`** 底座與拾戰治理導入 | `SHINUAN-S0-01` | 治理導入、安全補洞與 Monorepo 空白骨架 | `.gitignore`、導入拾戰規則、刪舊 PDF／清 `TEAM-001`、更新 PRD v2.1.29、裝 `pre-push` hook、pnpm Monorepo + Vitest + 純淨度檢核腳本 + 空白看板 | `pnpm test`、`pnpm typecheck`、`node scripts/check-shinuan-integrity.mjs` 全綠 | 本機開啟 `local-sandbox` 看到專案健康狀態頁 |
| **`SPEC-01`** 契約、設定與基因引擎 | `SHINUAN-S1-01` | `packages/contracts` 全部型別與介面契約 | `PetState`（含 `id`、`microchipId`）、`GameState`、`PetGenetics`（含 `fatherPetId`/`motherPetId`）、`ColorParams`、`Clock`（含時區）、`RandomGenerator`、`PetViewModel`、`GameCommand`、`GameEvent`、`FoodCatalogItem`（三區塊 Schema） | `pnpm typecheck` 零錯＋契約單元測試 | 型別鎖死，後續模組不互相打架 |
| | `SHINUAN-S1-02` | `content/` 靜態 JSON ＋ `config-loader` ＋ 批次匯入驗證 | `breeds.v1.json`、`traits.v1.json`、`appearance-compatibility.v1.json`、`food-catalog.v1.json`（三區塊＋級距檢查）＋ CSV/JSON 批次匯入驗證器 | 級距白名單驗證測試、損毀設定 Fallback 測試 | 可用 CSV/JSON 批次驗證商品目錄 |
| | `SHINUAN-S1-03` | `GeneticsEngine`（純品種模式）＋ 領養盲盒可視化頁 | FNV-1a 32-bit → `mulberry32-v1`、90/10 同種、60/40 加菲、30/50/20 米克斯、規則 1→4 相容修正、`colorParams`、4 款小怪癖抽取 | **TC-01**（鎖定 Golden Fixture）、**TC-02**（1,000 種子全組合統計） | **開瀏覽器親手選爸媽品種「抽盲盒生貓」＋看色塊與 1,000 隻分布圖** |
| | `SHINUAN-S1-04` | 真實 7 基因座毛色遺傳、一胎 3～5 隻與皮克敏式 2D 換色選父母 | 資料驅動 `preset-parents.v1.json`（通用不變量驗證）、7 基因座孟德爾毛色遺傳＋E1 公三花 XXY 2% 彩蛋、一胎 3～5 隻（30/40/30）、預覽怪癖遮罩、R1 每日 3 胎上限與帳號總免費上限 | **TC-10**（真實毛色統計、彩蛋、預覽遮罩與 R1 防盲抽）＋ `TC-01`/`TC-02` 零破壞回歸 | **開瀏覽器以皮克敏式 2D 貓咪點色球挑爸媽 → 一胎生 3～5 隻小貓挑寶貝領養** |
| **`SPEC-02`** 時間引擎與健康救援 | `SHINUAN-S2-01` | `TimeEngine` 基礎推進與需求衰退 | 0.25h 步長、注入時區本地 07:00/23:00 邊界切割、防時鐘回撥、Hunger/Hydration/Mood 衰退 | **TC-03**（跨夜、跨日、分段一致性 `< 1e-9`、時鐘回撥） | 看板可按「快轉 +1h / +6h / +24h」看三需求血條變化 |
| | `SHINUAN-S2-02` | 精確交點切割、`MoodHealthPenalty` 與 `RecoveryState` | Signed Rate Threshold Crossing、`VALUE_EPSILON`/`TIME_EPSILON_MS`、40 安全地板、10 下限、2h Boost、分級 Natural Recovery、Care Pause | **TC-04**、**TC-MH-01～10**、**TC-MH-12**、Property-based 不變量測試 | **看板實時演練「3 天沒理貓 → 進入 CRITICAL → 2 小時 Boost 救援 → 滿血復活」與 Care Pause 凍結** |
| **`SPEC-03`** 經濟、背包與防損存檔 | `SHINUAN-S3-01` | `EconomyEngine` 與商品探索／背包 | 200 初始積分、20h+本地日期雙重防重簽到、商店探索上限 30、互動上限 25（超額續給 `mood +3`）、高健康日結、免費品免扣庫存、軟下架商品背包可用 | **TC-07**（探索防重、跨午夜重置、購買與背包） | **看板「模擬商店頁」：看營養成分停留 3 秒領分、買罐頭進背包並餵食** |
| | `SHINUAN-S3-02` | 防損 JSON 存檔與 `v1→v2` 遷移 | `save.tmp` → 結構驗證 → `save.bak` → 原子替換；`v1 → v2` 遷移腳本；不重置外觀與性格 | **TC-MH-11**（`lowMoodDuration` 跨存檔續算）＋ 損毀回退測試 | **看板「存檔／重整網頁／還原」驗證進度零遺失** |
| **`SPEC-04`** 行為仲裁、CLI 與長時模擬 | `SHINUAN-S4-01` | 30 日人格記憶、`QuirkModifiers` 與 `BehaviorEngine` | 4 維度 30 日滾動視窗公式、傲嬌 45% 撇頭、Priority 100>90>80>60>40>10、POKE 10s 滑窗、15s 冷卻、輸出 `PetViewModel` | **TC-05**、**TC-06** | **看板「連戳貓咪 4 下觸發背對生氣＋15 秒冷卻倒數」與人格數值面板** |
| | `SHINUAN-S4-02` | `apps/local-cli` 互動指令列 ＋ `GameEngine` 總組裝 | Windows 終端機互動養貓 CLI（領養、餵食、喝水、摸頭、玩耍、快轉、Care Pause、商店、存檔） | 端對端整合測試（CLI 指令流） | 終端機與網頁雙介面完整驅動同一套 `GameEngine` |
| | `SHINUAN-S4-03` | 長時間模擬驗收套件與 Phase A 結案報告 | 365 天隨機玩家長時模擬 ＋ 60 日照護負擔（情境 A / B-1 / B-2 / B-3 / C 逐段對帳）＋ 看板趨勢曲線 | **TC-08**、**TC-09**（全子情境零誤差對帳） | **一鍵跑出 60 天／365 天四大數值趨勢曲線圖 → Phase A 正式封版！** |

*(註：合計 12 張精簡小單，平均每張聚焦 1 個單一可測模組，避免單次派工上下文過大。)*

---

## 二、每張小單的標準運作節奏（拾戰三模型省額度閉環）

1. **派工前（Gemini 主對話）**：只摘錄該小單需要的 PRD 章節與契約，寫成精簡派工包放進 `D:\Dropbox\ai-bridge\shinuan\tasks\<TASK-ID>\`（不讓 Claude 重讀 100KB 全文）。
2. **開發（Claude Code，乾淨短視窗）**：自 `master` 切分支實作＋自測＋建立 PR，對話框只回 3 行短回報。
3. **獨立 QA（GitHub Copilot Free 主視窗 Agent 模式；滿額時 Fallback Claude `qa` 子代理）**：於獨立 `git worktree` 針對 PR head commit 獨立執行 Vitest、純淨度檢核與邊界測試，輸出報告至 Dropbox 任務目錄。
4. **獨立審查（Gemini 獨立 Reviewer 子代理，全新 `conversationId`）**：核對 PR diff、PRD 條文、禁區保護與 QA 證據，出具 `APPROVED` / `CHANGES REQUESTED`。
5. **PO 驗收與合併（R3-A）**：PO 在本機開啟可視化看板／檢視摘要後核准 Merge，關閉 Issue。

---

## 三、可視化驗收看板（`apps/local-sandbox/`）設計原則

1. **嚴格單向依賴**：只能呼叫 `GameEngine.dispatch(command)` 與讀取 `GameEngine.getViewModel()`，**禁止在看板內寫任何遊戲規則或數值計算**。
2. **極簡零負擔**：採純輕量 Vite + TypeScript（或單頁原生 HTML/TS 模組），不引進厚重 UI 框架，避免拖慢 Phase A 主線。
3. **漸進長出 4 個分頁**：
   - Tab 1（`S1-03` / `S1-04`）：**領養盲盒與基因統計**（`S1-03` 選父母品種 → 7 層特徵卡、色塊、小怪癖與 1,000 隻分布長條圖；`S1-04` 升級皮克敏式 2D 即時換色挑爸媽 → 生一胎 3～5 隻小貓、隱藏怪癖提示、公三花彩蛋祝賀與 R1 防盲抽體驗）。
   - Tab 2（`S2-01` / `S2-02`）：**即時照護與時間模擬器**（四大血條、日夜背景切換、Care Pause 開關、快轉 `+15m/+1h/+6h/+24h/+72h`、`RecoveryState` 狀態燈號）。
   - Tab 3（`S3-01` / `S3-02`）：**原生廣告商店與存檔測試**（分類篩選、品牌合作／測試商品標籤、停留 3 秒領探索分、購買入包、存檔與重載）。
   - Tab 4（`S4-01` / `S4-03`）：**行為互動與長時模擬曲線**（戳貓 4 下觸發背對生氣＋15 秒冷卻條、60 天／365 天數值曲線圖）。

---

## 四、商業化商品批次匯入工具規劃（配合 `S1-02` 與 Phase D）

- **資料契約（Phase A `S1-02` 就釘死）**：`food-catalog.v1.json` 採三區塊結構（`externalSource`、`vendorInfo`、`gameBalance`）＋軟下架狀態 `status`。
- **內部批次建檔（Phase A/C）**：提供一支輕量 CLI 轉檔檢核工具（`scripts/import-catalog.mjs`），支援讀取內部填寫的 CSV／JSON 商品清冊，自動校驗§8.C.2 定價級距天花板、必填成分欄位與 `itemId` 唯一性，輸出合法 `food-catalog.v1.json`。
- **未來品牌商第三方 API 匯入（Phase D）**：同套驗證核心直接作為中台匯入管線，接收品牌商 API Feed → 更新 `vendorInfo`（不可覆寫 `gameBalance`）→ 新品標記 `pending_review` 經核准後發布至靜態 CDN（如 Cloudflare R2）供 App 免更新下載。
