# TEAM-001：BRIDGE-003 AI 團隊實際執行能力驗證

- 狀態：BLOCKED
- 執行角色：Architect / Developer / QA / Reviewer
- 前置依賴：無其他任務依賴。治理前置關卡 G0、Q1-1、Q1-2、Q1-3、G0-Q、T0、G1 均已由 PO 核准（2026-11-21）。
- 相關任務：無（Bridge ID：BRIDGE-003）

## 目標

驗證 AI 團隊在正式任務流程中的跨角色實際執行能力：

1. Architect 依任務撰寫規格，定義介面、輸入、輸出、預期結果及驗收標準。
2. Developer 依核准的規格及修改範圍實作，並提供開發驗證紀錄。
3. QA 依規格及驗收條件獨立撰寫及執行測試，依實際結果判定 PASS／FAIL／INCOMPLETE，並記錄缺陷。
4. 發現缺陷時，Developer 依正式缺陷紀錄修正，QA 依程序重新測試。
5. Reviewer 審查實際程式差異、測試結果及證據，提出審查結論。

本任務屬於 TEAM prefix 範圍（AI 團隊流程、角色能力驗證及相關治理任務），**不實作 PRD 產品功能，也不修改 Game Core 或任何產品程式碼**。

本任務依 PO 核准的 BRIDGE-003 治理文件執行；各角色可閱讀的資料範圍，以 Manager 派工指示為準。

## 相關 PRD 章節

本任務不實作 PRD 功能。流程依據（PRD v2.1.28 原文章節標題，已核對）：

- **5.4.2 角色與職責**：PO、AI Manager、Architect、Developer、QA、Reviewer 的職責；QA 依核准的驗收條件獨立執行測試，不得只引用 Developer 的測試結果。
- **5.4.3 標準 AI 工作流程**：PO 提出需求 → AI Manager 拆解任務 → Architect 技術分析 → Developer 修改 → QA 獨立測試 → Reviewer 審查 → AI Manager 整合 → PO 最終驗收；QA 與 Reviewer 不得因 Developer 宣稱完成而省略驗收。
- **5.4.4 任務管理規範**：正式任務的必要資訊及五種狀態；任務不得只因程式碼已修改就標記為 Completed。
- **5.4.5 變更治理及權限邊界**：PRD 保護、任務範圍保護、Git 操作保護、檔案保護、測試獨立性。

## 修改範圍

建立時只列出 Architect 的規格檔路徑；Developer 路徑在 G2a 核准後由 Manager 填入，G2b 確認後才生效。

| 角色 | 允許寫入的完整路徑 | 生效條件 |
|---|---|---|
| Architect | `docs/architecture/team-validation-smoke-test-spec.md`（D-2 = A1'） | T2 派遣後 |
| Developer（D-1） | `.ai-team-smoke-test/add.mjs` | **G2b 確認後才生效，生效前 Developer 不得寫入** |
| Developer（D-2） | `.ai-team-smoke-test/add.dev.test.mjs` | **G2b 確認後才生效，生效前 Developer 不得寫入** |
| Developer（D-3） | `.ai-team-smoke-test/snapshots/add.v1.mjs` | **G2b 確認後才生效，生效前 Developer 不得寫入** |
| QA | 只限 QA-W-1 所列路徑及條件（見「QA 的權限與命令」）；QA 不得寫入正式 `test-results/TEAM-001/qa-report.md` | QA-W-1 的生效條件全部符合，並由 Manager 依本任務派遣 QA 後 |

**核准關卡：**

- **G2a**（T2 完成後）：PO 核准 Architect 規格檔的內容，以及 Developer 會新增或修改的每一個檔案的完整路徑清單（逐列核准，不用萬用字元）。Manager 隨後把核准清單填入本文件的「修改範圍」。
- **G2b**（Manager 更新本文件後）：PO 確認本文件的「修改範圍」和 G2a 核准清單逐字一致。確認後才派遣 Developer。
- Architect 規格、Manager 的派工訊息、Subagent 自己的判斷，都不能取代本文件和 G2a、G2b 的授權。授權後如果需要變更路徑，Developer 必須停下來回報，由 Manager 更新本文件並重新取得 PO 核准。

**QA 上層目錄（Manager 責任）：** 以下六個目錄都由 Manager 負責建立及確認：

1. `tests/`
2. `tests/team-validation-smoke/`
3. `test-results/`
4. `test-results/TEAM-001/`
5. `test-results/_tmp/`
6. `test-results/_tmp/TEAM-001/`

- Manager 必須在派遣 QA 前完成必要處理，並在派遣時向 QA 提供六個目錄的確認證據。
- 建立這些目錄的精確命令、參數、執行路徑，以及確認目錄存在的唯讀檢查命令，都**已取得 PO 授權並完成**。命令尚未取得授權時，Manager 必須停止，不得自行選擇替代命令，也不得派遣 QA。
- 目標已存在、父目錄不存在、檢查結果不明或命令執行錯誤時，依 PO 之後核准的操作規則處理；不得自行覆寫、刪除、移動、重新命名或改用其他路徑。
- QA 不得自行建立這六個目錄。

## 禁止修改範圍

- 七份治理文件（`AGENTS.md`、`CLAUDE.md`、`.claude/agents/*.md`、`.github/copilot-instructions.md`）及 `.gitignore`
- `docs/PRD/` 內的所有文件
- `packages/` 及任何產品程式碼
- `docs/PO-step-by-step/`（Protected PO Notes；不得以任何方式存取）
- 「修改範圍」及 QA-W-1 以外的任何路徑
- 任何 Git 寫入操作

## QA 的權限與命令

### QA-W-1：QA 寫入路徑及條件（G2b-R1f 修訂，已於 2026-11-22 經 PO 正式核准）

| 路徑 | 允許用途 | 限制 |
|---|---|---|
| `tests/team-validation-smoke/` | 建立本任務所需的 QA 測試程式 | 只能建立新檔案；不得修改、修正或重構既有測試程式（需要時必須先取得 PO 針對該次修改的書面授權）；發現測試程式本身有問題（TEST DEFECT）時，必須停止並回報 Manager；不得刪除、移動或重新命名既有檔案 |
| `tests/team-validation-smoke/` 下的 fixture／測試資料 | 僅限經 PO 個案核准的項目 | QA 不得自行新增、修改或刪除 fixture／測試資料。需要時必須停止相關測試，並向 Manager 提出需求，說明必要性、內容、用途、影響範圍及預計寫入位置；每一項變更都必須取得 PO 個案核准，未核准前不得建立或修改。不得以「測試需要」或「避免 TEST DEFECT」作為自行修改的理由 |
| `test-results/_tmp/TEAM-001/round-N/` | 保存每一輪的原始測試輸出 | 每一輪使用獨立的 `round-N`；不得覆寫或刪除歷史輸出；不得當作正式報告目錄 |

**正式 QA 報告（`test-results/TEAM-001/qa-report.md`）的責任分工（G2b-R1f 修訂，已於 2026-11-22 經 PO 正式核准）：**

1. QA 負責執行獲授權的測試、整理測試結果，並產生完整、可供追加的該輪報告段落。
2. QA 將完整報告段落交付 Manager。
3. **QA 不得直接建立、追加、覆寫或修改正式 `qa-report.md`。**
4. Manager 負責檢查 QA 交付的報告段落。
5. Manager 只有在取得 PO 對**確切追加命令、目標檔案及內容**的明確授權後，才能以 EOF append 方式追加；此授權只適用於該次追加，不構成無條件或永久的檔案寫入權限。
6. Manager 必須保存追加前後的證據及執行紀錄；追加的驗證方式依另案的變更範圍檢查規則（尚待 PO 核准）。前綴雜湊比對只能證明原有內容未變，不能單獨證明追加內容與核准段落一致。
7. 選定 Scheme 1（EOF append）不代表追加命令已獲授權。
8. 不得覆寫或刪除報告中已建立的內容；不得建立其他報告路徑。

QA-W-1 不授權修改治理文件、`.gitignore`、產品程式碼或既有 QA 測試程式，不授權寫入正式 `qa-report.md`，也不授權寫入上表以外的任何位置。QA-W-1 是指定路徑的寫入授權，不是任意 Shell 命令授權。

**目錄責任的區分：**

| 角色 | 責任 |
|---|---|
| Manager | 建立及確認六個上層目錄（`tests/`、`tests/team-validation-smoke/`、`test-results/`、`test-results/TEAM-001/`、`test-results/_tmp/`、`test-results/_tmp/TEAM-001/`），並在派遣 QA 前提供確認證據（命令已取得 PO 授權並完成） |
| QA | 在 `tests/team-validation-smoke/` 內建立本任務所需的新測試程式；fixture／測試資料只在取得 PO 個案核准後建立；產生完整的該輪報告段落並交付 Manager（不寫入正式 `qa-report.md`）；依 QA-W-2a 建立每一輪最末層的 `round-N` 目錄；依 QA-W-2b 執行測試並保存原始輸出 |
| Manager（正式 QA 報告） | 檢查 QA 交付的報告段落；取得 PO 對確切追加命令、目標檔案及內容的授權後，以 EOF append 追加到 `test-results/TEAM-001/qa-report.md`，並保存追加前後的證據及執行紀錄 |

QA 不得自行建立上述六個上層目錄。

### 每輪測試輸出的命令（QA-W-2、QA-W-3）

**以下四個命令只適用於每一輪測試輸出目錄的存在性檢查、建立及測試執行。** QA 的其他工作（閱讀規格、建立測試程式、經 PO 個案核准的 fixture／測試資料、產生報告段落並交付 Manager、整理證據）仍依 QA-W-1 的路徑、條件及權限進行；QA 不寫入正式 `qa-report.md`；本節**沒有**擴大 QA 的任何權限。

每一輪必須依下列順序執行，前一步確認通過才能進行下一步（`N` 是 Manager 指定的輪次）：

| 步驟 | 命令 | 結果判讀 |
|---|---|---|
| 1 | QA-W-3a：`test -e "test-results/_tmp/TEAM-001/round-N"; echo $?` | 依印出的數字判讀：`0`：目標存在 → **立即停止**，不得覆寫、清空、刪除或重新使用；`1`：目標不存在 → 符合繼續條件；其他數值、命令錯誤或輸出無法確認 → **停止並回報 BLOCKED** |
| 2 | QA-W-3b：`test -e "test-results/_tmp/TEAM-001/round-N/node-test-output.txt"; echo $?` | 同上 |
| 3 | QA-W-2a：`mkdir "test-results/_tmp/TEAM-001/round-N"` | 只能建立指定的最末層 `round-N`；建立失敗（包括上層目錄不存在，或目標已存在）→ **停止並回報 BLOCKED**；不得使用 `mkdir -p`、`mktemp` 或其他替代命令，不得更換路徑繞過已存在的目標 |
| 4 | QA-W-2b：`node --test tests/team-validation-smoke/add.qa.test.mjs > test-results/_tmp/TEAM-001/round-N/node-test-output.txt 2>&1` | 執行目錄為 repo 根目錄；每輪使用不同的 `round-N`（第 2 輪為 `round-2`）。只能使用這一個命令執行測試並保存原始輸出；不得單獨執行 `node --test` 或其他任何形式，不得使用目錄參數、glob 或其他未核准的測試檔路徑；不得覆寫既有輪次的輸出；任何前置條件不符合，或輸出無法正常保存 → **停止**。本命令只執行 `add.qa.test.mjs`；新增或拆分測試檔案必須重新取得 PO 命令核准。判讀依據是輸出中所有預期案例 ID 是否實際出現且通過，不以結束碼單獨判定 |

其他限制：

- QA 不自行確認、也不建立六個上層目錄；上層目錄由 Manager 在派遣時提供確認證據。
- 步驟 1、2 的 `echo $?` 印出的是前一個 `test -e` 的結束碼，不是 `echo` 自己的結束碼；必須以印出的數字判讀，不得以整行命令的結束碼判讀。`; echo $?` 只核准用在這兩個命令和指定路徑。
- 不得使用其他輸出重導、`test` 命令或命令組合。
- 以上順序可以降低覆寫風險，但不能絕對防止覆寫；PO 已接受這項殘餘風險，QA 仍須依上述規則停止。
- QA 結論只能是 PASS／FAIL／INCOMPLETE。
- QA-W-2b 修訂紀錄（候選 G2b-R1a，尚待 PO 最終核准；本修訂紀錄原屬候選 G2b-R1）：
  - 第 1 輪（T4-R1，round-1）依原核准命令 `node --test tests/team-validation-smoke/ > test-results/_tmp/TEAM-001/round-1/node-test-output.txt 2>&1` 執行，結論仍為 INCOMPLETE（F-R1-01，TEST ENVIRONMENT ISSUE：Node.js v24.15.0 把目錄參數當成模組入口載入，出現 `MODULE_NOT_FOUND`，沒有執行任何案例）。
  - PO 2026-11-22 第二階段 A 決策：上表命令改為明確指定 `add.qa.test.mjs`；同時核准 RV-05 一次性例外，明確承認規格 AC-09 命令文字的修改屬於 RV-05 涵蓋的規格變更，例外只限本次 AC-09 命令文字，不構成通案豁免。
  - 新命令自新基準（G2a-R1a、G2b-R1a）經 PO 核准後的第 2 輪起適用。
  - 命令可行性探針 V-1～V-7、V-9 已於 2026-11-22 在 repo 外執行並符合預期（V-8 未執行）；探針只證明命令可行性，不是 QA 證據。
  - 第 1 輪 QA 報告及原始輸出不得修改。

### 第 1 輪測試的變更範圍確認（PO 專屬裁定 D-PO-20261121-01）

- **只限第 1 輪測試（T4-R1）第 4 點**「確認變更範圍」；不適用於其他任何輪次。
- 精確命令：`git status --short -uall`
- 必須在 QA 報告中保存該命令的**完整輸出**，作為這一點的證據。
- 這是 PO 對 TEAM-001 的專屬書面裁定，**不是一般 Git 命令許可**：不得使用其他 `git status` 參數或組合，不代表可以執行 `git diff` 或任何其他 Git 命令，也不得執行任何 Git 寫入操作。
- 上方四個命令的限制適用於測試執行和測試輸出保存；這項變更範圍確認是 PO 裁定的唯一例外，沒有擴大 QA 的其他任何權限。

### QA 第 2 輪的狀態及流程順序（G2b-R1h 候選建立、G2b-R1i、G2b-R1j 候選修訂，尚待 ChatGPT 獨立審查及 PO 核准）

PO 於 2026-11-22 決定：QA 第 2 輪（T4-R2）執行期間，TEAM-001 狀態必須為 IN PROGRESS；解除阻塞及派工順序固定為「狀態轉換 → Manager 執行 T0 → PO 獨立授權 QA R2 → QA 執行 R2 → QA 完成 → Manager 執行 T1 → 若 QA PASS 且 T1 PASS，向 PO 申請確切追加授權 → PO 獨立授權追加 → Manager 執行 TA → TA PASS → Reviewer 審查 → PO 決定後續狀態」（G2b-R1i 補入 T1 之後的追加授權及 TA；G2b-R1j 依 PO 決策統一 QA FAIL／INCOMPLETE 的處理）。本節是文件規則，不代表任何一步已獲執行授權；文件修訂不構成任何命令、repo 或 Agent 的執行授權。

1. **狀態轉換前：** 「未解決問題」第 3 項的解除條件第 1～6 項全部滿足。
2. **PO 授權狀態轉換：** Manager 確認解除條件後提出狀態轉換計畫，由 PO 明確授權。
3. **BLOCKED → IN PROGRESS：** Manager 依 PO 授權把本文件由 `tasks/blocked/` 搬到 `tasks/in-progress/`，更新狀態欄位及狀態紀錄，並依變更範圍檢查規則保存轉換前後證據。
4. **Manager 執行 T0：** 在派遣 QA 前，依 PO 核准的變更範圍檢查規則及 PO 授權的命令取得 T0 基準。
5. **T0 通過後等待 PO 授權 QA R2：** T0 未通過、無法判定或任一命令失敗時，不得派遣 QA R2，停止並回報 PO。T0 通過後 Manager 停止並回報，等待 PO 另行明確授權 QA R2；T0 通過不等於 QA R2 已獲授權。
6. **QA R2 在 IN PROGRESS 狀態下執行：** 依 QA-W-1、QA-W-2、QA-W-3 及 PO 核准的 QA 派工文件執行；QA 不修改產品程式碼或既有 QA 測試程式。
7. **QA 完成並提交結果後，Manager 執行 T1：** 依 PO 核准的變更範圍檢查規則完成 T0～T1 比對。
   - **T1 通過條件：** 指定路徑範圍內 T1 新增的路徑全部屬於該規則允許的變更（第 2 輪原始輸出目錄及檔案，以及經 PO 個案核准的 fixture／測試資料）、沒有路徑消失；受檢查檔案的 SHA-256 與 T0 完全相同；正式 QA 報告 `test-results/TEAM-001/qa-report.md` 的 bytes 及 SHA-256 與 T0 完全相同；寫入凍結前提已確認成立；所有 T1 命令正常完成且結果可確認。
   - **T1 停止條件：** 上列任一項不成立（FAIL）、寫入凍結無法確認或任一命令結果無法確認（無法判定）時，停止並回報 PO；不得申請追加，不得進入 TA，不得交 Reviewer。
   - **QA 結論 FAIL 或 INCOMPLETE 時（G2b-R1j，依 PO 決策）：** 不論 QA 結論為何，Manager 均執行 T1，以保存 QA 執行期間的變更範圍證據；T1 完成後立即停止並回報 PO；不得提出該輪報告追加授權申請；不得進入 TA；不得交 Reviewer；該輪 QA 報告段落是否及如何追加，由 PO 另行決定；不得因 T1 PASS 就覆蓋 QA 的 FAIL／INCOMPLETE 結論。若 T1 本身 FAIL 或無法判定，仍依上一點 T1 停止條件處理。後續依 `CLAUDE.md` §5.1、§5.2 及本文件既有規則處理（包括缺陷紀錄、INCOMPLETE 原因判斷及退回）。
8. **T1 通過後，PO 獨立授權追加：** 只有 T1 通過且 QA 結論 PASS 時，Manager 才可依 QA-W-1 的責任分工檢查 QA 交付的第 2 輪段落，向 PO 提出確切追加內容、命令及目標檔案；PO 對該次追加獨立授權後才可進入 TA。
9. **Manager 執行 TA：** 依變更範圍檢查規則，依序執行追加前準備、以 Scheme 1 在正式 QA 報告 EOF 追加、追加後驗證。
   - **TA 通過條件：** 追加命令正常完成；追加後報告的 bytes 等於 T1 的 bytes 加上 PO 核准追加內容的 bytes；追加後報告前 T1 bytes 的 SHA-256 與 T1 的 SHA-256 完全相同（原有內容未變）；實際新增的位元組與 PO 核准的追加內容逐位元組相同；所有 TA 命令正常完成且結果可確認。其中前綴雜湊比對的正式命令須先完成獨立技術驗證並經 PO 核准。
   - **TA 停止條件：** 上列任一項不成立（FAIL）或結果無法確認（無法判定）時，停止並回報 PO；不得重試、修補、回復或改用其他方式，不得交 Reviewer。
10. **TA 通過後交 Reviewer 審查：** QA 結論 PASS、T1 通過、TA 通過全部成立，才可交 Reviewer；Reviewer 派遣須符合 PO 授權及 `CLAUDE.md` §5 的既有規則。
11. **PO 決定後續狀態：** QA 完成後、T1、TA 及 Reviewer 審查期間，任務維持 IN PROGRESS；Manager 不得自行轉為 REVIEW 或其他狀態。後續狀態由 PO 依 Reviewer 審查結果決定。
12. **任一階段結果無法確認：** 視為未通過，停止並回報 PO；不得自行跳過關卡。

其他規則：

- 本節的「T0」「T1」是變更範圍檢查規則中 Manager 取得的檢查時間點，與「前置依賴」所列 2026-11-21 的治理前置關卡 T0 不同。
- 每一步需要的 PO 授權互相獨立；取得其中一步的授權不代表取得其他步驟的授權。本節不構成任何命令、狀態轉換或派遣的授權。
- 第 1 輪的變更範圍確認裁定 D-PO-20261121-01 只限第 1 輪，**不適用於 QA 第 2 輪**；QA 第 2 輪的變更範圍檢查由 Manager 依變更範圍檢查規則執行，QA 不執行任何 `git` 命令。
- 退回次數（S17）的計數規則（P78）不因本節變更；S17 由 Manager 依既有規則記錄。S17 目前計數為 1（見狀態紀錄 2026-11-22 REVIEW → BLOCKED），本節及 G2b-R1h～R1j 的修訂都沒有變更該計數。

## 驗收條件

具體的功能驗收標準由 Architect 在規格檔中定義，並經 PO 在 G2a 核准。任務整體的驗收依據：

1. Architect 規格檔包含完整、明確、可驗證的驗收標準；規格檔內容和 Developer 完整路徑清單經 PO 在 G2a 核准；本文件「修改範圍」和 G2a 清單的一致性經 PO 在 G2b 確認。
2. Developer 只在 G2b 生效的路徑內修改，提供修改檔案清單、實作摘要及開發驗證結果。
3. QA 每一輪都依規格獨立撰寫及執行測試，提交可追溯的報告（含實際指令、原始輸出及缺陷清單）；結論依實際測試結果判定。
4. QA 發現的每一項缺陷都有正式缺陷紀錄；每一次修正都對應到正式缺陷紀錄及任務授權範圍。
5. 各輪 QA 報告及原始輸出都完整保存；如有後續輪次，只在報告末尾追加，不改動先前輪次的內容。
6. 任務完成前，最新一輪 QA 結論為 PASS。
7. Reviewer 獨立審查實際變更範圍、測試結果及證據，確認每一項修改都有對應的缺陷紀錄或任務授權，沒有超出核准範圍；審查結論為 APPROVED。
8. ChatGPT 外部審查 PASS（G3），以及 PO 最終核准（G4）。

## 測試要求

- QA：依「QA 的權限與命令」執行。
- Developer：開發測試的指令由 Architect 規格提出，只用 Node.js 內建模組，不安裝套件（D-5）；Developer 的開發驗證不能取代 QA 驗收。
- 退回次數（S17）由 Manager 依 PO 核准的計數規則（P78）逐筆記錄；不屬於 QA 判定的範圍。

## 交付紀錄

- Developer：（待填）
- QA：報告路徑 `test-results/TEAM-001/qa-report.md`、原始輸出 `test-results/_tmp/TEAM-001/round-N/`；結論（待填）
- Reviewer：（待填）
- 階段紀錄（Manager 於 2026-11-22 追加）：
  - G2a：PO 已正式核准 Architect 規格 `docs/architecture/team-validation-smoke-test-spec.md`（正式基準 SHA-256 `804bec248529056708ef00c1724ea06da332d5652035b38a5fa16b86eec3ad94`）及 Developer 完整路徑清單。規格檔第 6 行的狀態文字依 PO 決定不修改，核准事實以本紀錄為準。
  - G2b：PO 已正式核准本文件「修改範圍」與 G2a 核准清單一致，Developer 的 D-1～D-3 路徑生效。
  - OPEN-02：已完成，Manager 依 PO 授權建立 `.ai-team-smoke-test/`、`.ai-team-smoke-test/snapshots/` 兩個目錄。
  - T3a：已完成，Developer 交付以下三個檔案：
    - D-1：`.ai-team-smoke-test/add.mjs`
    - D-2：`.ai-team-smoke-test/add.dev.test.mjs`
    - D-3：`.ai-team-smoke-test/snapshots/add.v1.mjs`
  - D-1 與 D-3 的 SHA-256 一致：`223870be162ff645ee5271f4ffe095a0b00874739e92e83c565b3d6e40ecc210`。
  - Developer 已提交開發驗證，結果由 Manager 另行保存，不列於本文件。
  - G2a-R1：PO 已正式核准修正版規格 `G2a-R1-spec-candidate-revised.md`，正式 SHA-256 為 `940f7b466422c5ce0f5b00334c5f19cb8e1e7926d18d475538ff612a10071511`。本版本取代原 G2a 基準，作為 G2b-R1 後續審查依據。G2b-R1 任務文件仍為候選版本，尚待 PO 最終核准。
- 修訂紀錄（Manager 於 2026-11-22 追加；G2a-R1 已由 PO 正式核准修正版，見下方及階段紀錄；G2b-R1 仍為候選，尚待 PO 最終核准）：
  - 依 PO 2026-11-22 第二階段 A 決策，Architect 修訂規格 `docs/architecture/team-validation-smoke-test-spec.md`（§8.1 AC-09 命令文字、§9.2 QA 列、§9.3、§10.3、§15.1 RISK-01、§15.2 第 1 點，新增 §16）；Manager 修訂本文件 QA-W-2b 及相關修訂紀錄。
  - 規格：修訂前 27405 位元組、414 行，SHA-256 `804bec248529056708ef00c1724ea06da332d5652035b38a5fa16b86eec3ad94`（G2a 基準）；修訂後 34121 位元組、441 行，SHA-256 `a2c8a2e7d25adfb9dcefad4ba1b69bc7ed27b790a18df04754f079c87d6ac6f8`（候選 G2a-R1）。
  - 本文件：修訂前 15679 位元組、185 行，SHA-256 `b62271c91f2097e679ba83e49e300e1ed47a0d92c8e3d18b869d51754dcb58cf`；修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。
  - 修訂前基準備份保存在 repo 外 `D:\temp_claude\shinuan-bridge-003\G2a-G2b-R1-baseline\`（兩份備份與修訂前原檔逐位元組相同）。
  - 命令可行性探針（2026-11-22，repo 外，Node.js v24.15.0）：目錄參數對照組重現 `MODULE_NOT_FOUND`；明確檔案路徑只執行指定的測試檔；指定不存在的檔案時只輸出 `Could not find …`，沒有摘要行。探針只證明命令可行性，不是 QA 證據，不是 QA PASS。
  - 任務狀態沒有變更，仍為 BLOCKED。
  - G2a-R1 核准版本追溯：上列 `a2c8a2e7…` 為 Architect 修訂後的原候選版本；PO 核准一次性修正 §9.2 QA 列狀態文字及 §9.3 第 7 點後，修正版 `G2a-R1-spec-candidate-revised.md`（34116 位元組、441 行，SHA-256 `940f7b466422c5ce0f5b00334c5f19cb8e1e7926d18d475538ff612a10071511`）經 PO 正式核准，為目前 G2a-R1 正式基準；原候選 `a2c8a2e7…` 保留為歷史版本。
  - G2b-R1：本文件仍為候選版本，尚待 PO 最終核准。
- 修訂紀錄 G2b-R1a（Manager 於 2026-11-22 追加；G2b-R1a 為候選版本，尚待 PO 最終核准）：
  - 本候選以 G2b-R1 候選 `G2b-R1-task-candidate-revised.md`（19369 位元組、201 行，SHA-256 `86a494b06b5ca1ef59af1f6d8f8340a00606ca8b54bf8d95988272467771884b`）為基礎，只更新 G2a 正式基準變更所需的版本追溯及現行狀態；QA-W-2b 實際命令及其他 QA 命令、參數、路徑、限制均未變更。G2b-R1a 修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。
  - G2a-R1a 正式核准：PO 已正式核准狀態修訂版規格 `G2a-R1a-spec-status-candidate.md`（35486 位元組、449 行，SHA-256 `96996f8b78825a038740f5e6e83b570467cd0f87e1eaafe155493478eaf84ba9`），為目前 G2a 正式規格基準。PO 核准日期未在執行紀錄中提供，本文件不記載。
  - G2a 版本關係：
    - 現行正式基準：G2a-R1a，SHA-256 `96996f8b78825a038740f5e6e83b570467cd0f87e1eaafe155493478eaf84ba9`。
    - 歷史版本：G2a-R1，SHA-256 `940f7b466422c5ce0f5b00334c5f19cb8e1e7926d18d475538ff612a10071511`。
    - 歷史版本：G2a 原候選（Architect 修訂後），SHA-256 `a2c8a2e7d25adfb9dcefad4ba1b69bc7ed27b790a18df04754f079c87d6ac6f8`。
    - 歷史版本：G2a 原始基準，SHA-256 `804bec248529056708ef00c1724ea06da332d5652035b38a5fa16b86eec3ad94`。
    - 上方階段紀錄「G2a-R1 … 作為 G2b-R1 後續審查依據」，以及上方修訂紀錄中「為目前 G2a-R1 正式基準」「G2b-R1：本文件仍為候選版本」等敘述，只代表各該紀錄當時的狀態，原文保留為歷史紀錄，不再作為現行依據；現行依據以本筆紀錄為準。
    - G2a-R1a 規格內 §9.2 QA 列及 §16 R1a 列、R1a 說明中「候選版，尚待 PO 最終核准」的文字，是核准前製作候選版時的狀態，不影響 PO 已正式核准 G2a-R1a 的事實；已核准檔案不再修改。
  - repo 規格同步紀錄（2026-11-22 執行）：
    - repo 規格路徑：`docs/architecture/team-validation-smoke-test-spec.md`。
    - 同步前 SHA-256：`a2c8a2e7d25adfb9dcefad4ba1b69bc7ed27b790a18df04754f079c87d6ac6f8`（34121 位元組、441 行）。
    - 同步後 SHA-256：`96996f8b78825a038740f5e6e83b570467cd0f87e1eaafe155493478eaf84ba9`（35486 位元組、449 行）。
    - 同步前備份：`D:\temp_claude\shinuan-bridge-003\G2a-R1a-sync-backup\team-validation-smoke-test-spec.a2c8a2e7.before-sync.md`（與同步前 repo 原檔 cmp 為 0）。
    - 同步差異：`G2a-R1a-repo-sync-diff.patch`（6485 位元組、39 行，SHA-256 `ef9c7e0c5560476622e0e5e7e3c57eda706a6c7110b9afbccd9fd427ba3779ea`）。
    - 同步結果：同步後 repo 規格與本機 G2a-R1a 來源、Dropbox G2a-R1a 副本 cmp 均為 0；無須回復。
  - Reviewer 與 QA 基準：
    - Reviewer 審查所依據的規格為 G2a-R1a（SHA-256 `96996f8b78825a038740f5e6e83b570467cd0f87e1eaafe155493478eaf84ba9`）。
    - Reviewer 審查 RV-05 時，以 G2a-R1a 完整 SHA-256 作為正式基準；PO 2026-11-22 第二階段 A 決策核准的 RV-05 一次性例外範圍不變（只限 AC-09 命令文字）。
    - QA 交付內容仍依規格 §14 指定的章節範圍（§2～8.1、§9、§11、§12），摘錄來源為 G2a-R1a；派工文件須註明所依據規格的完整 SHA-256。
    - §13.2 補充交接（G2b-R1b 追加；G2b-R1b 已於 2026-11-22 經 PO 正式核准，正式核准 SHA-256 `85c5e25448017b918b2f18c5a61ea85ccb4f9e986f314c351f522937c8f0fa4a`，本項補充交接內容已納入正式核准基準；QA 第 2 輪仍未授權）：規格 §14 所列的 QA 交付範圍維持不變，§14 本身不包含 §13.2。第 1 輪 QA 派工曾依 PO 核准另附規格 §13.2 原文；QA 第 2 輪派工時，Manager 另須提供 G2a-R1a（SHA-256 `96996f8b78825a038740f5e6e83b570467cd0f87e1eaafe155493478eaf84ba9`）§13.2「QA」一節的原文，作為 TEST DEFECT 判別及停止處理的補充規則。補充範圍只限 §13.2，不擴大到整個 §13（不含 §13.1、§13.3）；§13.2 內容以 G2a-R1a 原文為準，不另行改寫。QA 第 2 輪尚未授權，本項只記錄未來派工要求，不構成派工。
  - 任務狀態沒有變更，仍為 BLOCKED；QA 第 1 輪結論仍為 INCOMPLETE；S17 計數仍為 1；QA 第 2 輪尚未授權；Developer、Reviewer 尚未重新派遣。
- G2b-R1b 正式核准及 repo 同步紀錄（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1c，尚待 PO 最終核准）：
  - PO 正式核准：G2b-R1b 已於 2026-11-22 經 PO 正式核准，正式核准版本 `G2b-R1b-task-candidate.md`（24329 位元組、226 行，SHA-256 `85c5e25448017b918b2f18c5a61ea85ccb4f9e986f314c351f522937c8f0fa4a`）。
  - repo 同步紀錄：
    - repo 路徑：`tasks/blocked/TEAM-001-ai-team-capability-validation.md`。
    - 同步前 SHA-256：`129e6f6357b24f53db1b368c7d01f6886895f47497bc732624e68dc00e83dc86`（18504 位元組、198 行）。
    - 同步後 SHA-256：`85c5e25448017b918b2f18c5a61ea85ccb4f9e986f314c351f522937c8f0fa4a`，與正式核准版一致。
    - 同步前備份：`D:\temp_claude\shinuan-bridge-003\G2b-R1b-sync-backup\TEAM-001-ai-team-capability-validation.129e6f63.before-sync.md`（與同步前 repo 原檔 cmp 為 0）。
    - 同步差異：`G2b-R1b-repo-sync-diff.patch`（9859 位元組、65 行，SHA-256 `20558f7b5c03938f51d68ca01ccc0addc735f8da0c104ba8c5a821bc263f2ea3`）。
    - 同步結果：同步後 repo 文件與本機 G2b-R1b 來源、Dropbox G2b-R1b 正式來源 cmp 均為 0；沒有觸發回復。
    - 同步後任務文件仍位於 `tasks/blocked/`，TEAM-001 仍為 BLOCKED。
  - 版本關係：上方 G2b-R1、G2b-R1a 的「候選，尚待 PO 最終核准」文字，以及解除條件第 3 項進度中「G2b-R1b 追加；候選，尚待 PO 最終核准」的標示，都是各該版本核准前的歷史狀態，原文保留；G2b-R1b 的正式核准事實以本筆紀錄為準。
  - G2b-R1c（本次修訂，只更新核准狀態及解除條件進度）尚未核准；QA-W 命令、規格、狀態紀錄及 S17 計數均未變更。
- G2b-R1c 正式核准及 repo 同步紀錄（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1d，尚待 PO 最終核准）：
  - 歷史狀態：上一筆「G2b-R1b 正式核准及 repo 同步紀錄」的標題「本筆屬候選 G2b-R1c，尚待 PO 最終核准」及其末項「G2b-R1c … 尚未核准」，以及解除條件第 4 項進度中「G2b-R1c 本身尚未核准」的標示，是 G2b-R1c 候選版製作當時的狀態，原文保留。
  - PO 正式核准：G2b-R1c 已於 2026-11-22 經 PO 正式核准，正式核准版本 `G2b-R1c-task-candidate.md`（26992 位元組、240 行，SHA-256 `5d860126e9c73d5410fd22df8475994d0e7a8e3716efb8a1b74aba489790a3b7`）。
  - repo 同步紀錄（2026-11-22 執行）：
    - repo 路徑：`tasks/blocked/TEAM-001-ai-team-capability-validation.md`。
    - 同步前 SHA-256：`85c5e25448017b918b2f18c5a61ea85ccb4f9e986f314c351f522937c8f0fa4a`（24329 位元組、226 行）。
    - 同步後 SHA-256：`5d860126e9c73d5410fd22df8475994d0e7a8e3716efb8a1b74aba489790a3b7`，與正式核准版一致。
    - 同步前備份：`D:\temp_claude\shinuan-bridge-003\G2b-R1c-sync-backup\TEAM-001-ai-team-capability-validation.85c5e254.before-sync.md`（與同步前 repo 原檔 cmp 為 0）。
    - 同步差異：`G2b-R1c-repo-sync-diff.patch`（6231 位元組、33 行，SHA-256 `071f8774818264c48905f27075b88ca5bfc2c7155b6d2b3c3cd4b269021bf2f8`）。
    - 同步結果：同步後 repo 文件與本機 G2b-R1c 來源、Dropbox G2b-R1c 正式來源 cmp 均為 0；沒有觸發回復；任務文件仍位於 `tasks/blocked/`，TEAM-001 仍為 BLOCKED。
  - G2b-R1d（本次修訂，只追加 G2b-R1c 正式核准狀態及同步紀錄）尚未核准；修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。QA-W 命令、規格、狀態紀錄、解除條件實質內容及 S17 計數均未變更。
- G2b-R1d 正式核准及 repo 同步紀錄（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1e，尚待 PO 最終核准）：
  - 歷史狀態：上一筆「G2b-R1c 正式核准及 repo 同步紀錄」的標題「本筆屬候選 G2b-R1d，尚待 PO 最終核准」及其末項「G2b-R1d … 尚未核准」，以及解除條件第 4 項「核准狀態更新（G2b-R1d 追加；候選，尚待 PO 最終核准）」的標示，是 G2b-R1d 候選版製作當時的狀態，原文保留。
  - PO 正式核准：G2b-R1d 已於 2026-11-22 經 PO 正式核准，正式核准版本 `G2b-R1d-task-candidate.md`（29541 位元組、252 行，SHA-256 `5fceb7d530fd0d7ab94eaf374ea2d5ef5a680eae31c2758d9b6f673daf350fbf`）。
  - repo 同步紀錄（2026-11-22 執行）：
    - repo 路徑：`tasks/blocked/TEAM-001-ai-team-capability-validation.md`。
    - 同步前 SHA-256：`5d860126e9c73d5410fd22df8475994d0e7a8e3716efb8a1b74aba489790a3b7`（26992 位元組、240 行）。
    - 同步後 SHA-256：`5fceb7d530fd0d7ab94eaf374ea2d5ef5a680eae31c2758d9b6f673daf350fbf`，與正式核准版一致。
    - 同步前備份：`D:\temp_claude\shinuan-bridge-003\G2b-R1d-sync-backup\TEAM-001-ai-team-capability-validation.5d860126.before-sync.md`（與同步前 repo 原檔 cmp 為 0）。
    - 同步差異：`G2b-R1d-repo-sync-diff.patch`（4624 位元組、28 行，SHA-256 `4d3c9894bbd35c7c1938e44aed035f1c8fcda5c5caf0f1f9e590e95605476283`）；去除兩行檔頭後與已核准的候選 diff `G2b-R1d-task-full-diff.patch` 內容一致。
    - 同步結果：同步後 repo 文件與本機 G2b-R1d 來源、Dropbox G2b-R1d 正式來源 cmp 均為 0；沒有觸發回復；任務文件仍位於 `tasks/blocked/`，TEAM-001 仍為 BLOCKED。
  - G2b-R1e（本次修訂，只追加 G2b-R1d 正式核准狀態及同步紀錄）尚未核准；修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。QA-W 命令、規格、狀態紀錄、解除條件實質內容及 S17 計數均未變更。
- 修訂紀錄 G2b-R1f（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1f，尚待 PO 最終核准）：
  - 來源：G2b-R1e（PO 正式核准版本，SHA-256 `bc94fb1d7c9c0c5f61ec2fba8e5f23c96d79bdf0646f866ccd61f161ec91365a`，32233 位元組、264 行）。
  - 修訂範圍：只統一 QA 與 Manager 的權限——「修改範圍」QA 列、QA-W-1（正式 QA 報告改由 QA 交付段落、Manager 經 PO 對確切命令、目標檔案及內容授權後 EOF 追加；fixture／測試資料改為 PO 個案核准）、「目錄責任的區分」、QA-W-2／QA-W-3 節首段的 QA 其他工作描述。
  - QA-W-2a、QA-W-2b、QA-W-3a、QA-W-3b 的命令、參數及路徑，規格、狀態紀錄、解除條件實質內容及 S17 計數均未變更。
  - 本候選未經 PO 核准前不生效；Manager 的追加責任不構成任何命令的執行授權。G2b-R1f 修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。
- 修訂紀錄 G2b-R1g（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1g，尚待 ChatGPT 獨立審查及 PO 核准）：
  - G2b-R1f 已於 2026-11-22 經 PO 正式核准，正式核准版本 `TEAM-001-ai-team-capability-validation-G2b-R1f-candidate.md`（35023 位元組、281 行，SHA-256 `3313824a3e6fc491d21d95eb474258882febdd62b5bab0a50f414606dfa1a59a`）。
  - G2b-R1f 已於 2026-11-22 同步至 repo 任務文件 `tasks/blocked/TEAM-001-ai-team-capability-validation.md`；同步前 SHA-256 `bc94fb1d7c9c0c5f61ec2fba8e5f23c96d79bdf0646f866ccd61f161ec91365a`（G2b-R1e），同步後 SHA-256 與 G2b-R1f 核准版本一致；同步差異 `G2b-R1f-repo-sync-diff.patch`（8409 位元組、70 行，SHA-256 `7e915af8ccdf25bea0d15d6f414d71531db825e7b2f0997f67931c8dc638fdcf`）。
  - 上一筆「修訂紀錄 G2b-R1f」標題的「本筆屬候選 G2b-R1f，尚待 PO 最終核准」及其末項「本候選未經 PO 核准前不生效」，是 G2b-R1f 候選版製作當時的狀態，原文保留。
  - G2b-R1g 本次只修正 QA-W-1 標題及正式 QA 報告責任分工標題的核准狀態標示，並新增本筆版本追溯紀錄；QA-W-1 的權限及責任、QA-W-2a、QA-W-2b、QA-W-3a、QA-W-3b 的命令、參數及執行限制、fixture／測試資料逐項核准、QA 不得寫入正式 QA 報告、Manager 追加須單次 PO 授權、TEST DEFECT 規則、任務狀態及 S17 均未變更。
  - G2b-R1g 本身仍是候選版本，尚待 ChatGPT 獨立審查及 PO 核准；修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。
- 修訂紀錄 G2b-R1h（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1h，尚待 ChatGPT 獨立審查及 PO 核准）：
  - 來源：G2b-R1g 已於 2026-11-22 經 PO 正式核准，正式核准版本 `TEAM-001-ai-team-capability-validation-G2b-R1g-candidate.md`（36666 位元組、287 行，SHA-256 `7a14c2f1106ca43e353c2f4649ba52cd8c12581228ca3b64ec51e2aa092e25d1`），並已同步至 repo `tasks/blocked/TEAM-001-ai-team-capability-validation.md`：同步前 SHA-256 `3313824a3e6fc491d21d95eb474258882febdd62b5bab0a50f414606dfa1a59a`（G2b-R1f），同步後與 G2b-R1g 核准版本一致；同步差異 `G2b-R1g-repo-sync-diff.patch`（4025 位元組、33 行，SHA-256 `594057f864bd22a5ac98f10ee2162f48307dd805ef1eeea35a076e3cb605bc51`）。上一筆「修訂紀錄 G2b-R1g」標題及末項的候選字樣，是 G2b-R1g 候選版製作當時的狀態，原文保留。
  - 修訂依據：PO 2026-11-22 決策——QA 第 2 輪執行期間任務狀態為 IN PROGRESS；順序固定為狀態轉換 → Manager 執行 T0 → PO 獨立授權 QA R2 → QA 執行 R2 → Manager 執行 T1 → Reviewer 審查。
  - 修訂範圍：
    - 「QA 的權限與命令」新增「QA 第 2 輪的狀態及流程順序」一節。
    - 「未解決問題」第 3 項解除條件第 5、6 項及其後的狀態轉換說明。修訂前原文如下（保留供追溯）：第 5 項「QA 第 2 輪執行所需的前置條件全部具備。」；第 6 項「PO 另行明確授權 QA 第 2 輪執行。」；狀態轉換說明「六項全部滿足後，由 Manager 確認並提出狀態轉換計畫，經 PO 授權才依 `CLAUDE.md` §6.1 由 BLOCKED 轉回 IN PROGRESS（之後如需進入第 2 輪 QA，再依 PO 授權轉為 REVIEW）；Manager 不得自行轉換狀態。」修訂原因：原文要求在狀態轉換（及 T0）之前取得 QA 第 2 輪授權，並預設第 2 輪 QA 轉為 REVIEW，與 PO 決策的順序及狀態不一致。
    - 解除條件第 4 項各筆進度中「第 5 項尚待獨立盤點，第 6 項 PO 尚未授權 QA 第 2 輪」等敘述，是各該版本製作當時依修訂前第 5、6 項內容所做的紀錄，原文保留；現行第 5、6 項以本次修訂後內容為準。
  - 未變更：QA-W-1、QA-W-2a、QA-W-2b、QA-W-3a、QA-W-3b 的權限、命令、參數及限制；第 1 輪裁定 D-PO-20261121-01 只限第 1 輪（不套用到第 2 輪）；fixture／測試資料逐項核准；QA 不得寫入正式 QA 報告；Manager 追加須單次 PO 授權；TEST DEFECT 規則；QA 與 Developer 的職責隔離；測試證據要求；驗收條件；S17 計數規則（P78）及目前計數；任務狀態（仍為 BLOCKED，本修訂不轉換狀態）；解除條件第 1～4 項的內容及進度。
  - G2b-R1h 本身仍是候選版本，未經 PO 核准前不生效，不構成任何命令、狀態轉換或派遣的授權；修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。
- 修訂紀錄 G2b-R1i（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1i，尚待 ChatGPT 獨立審查及 PO 核准）：
  - 版本關係：現行正式基準仍為 G2b-R1g（SHA-256 `7a14c2f1106ca43e353c2f4649ba52cd8c12581228ca3b64ec51e2aa092e25d1`，已核准並同步至 repo）。G2b-R1h 是未經核准的候選版本（`TEAM-001-ai-team-capability-validation-G2b-R1h-candidate.md`，43059 位元組、317 行，SHA-256 `c81bc04df3677f4777d95ab9022ce5710b73e99350f89ba81cbcf55335c3eeeb`），本候選以 G2b-R1h 為基礎，保留其有效修訂並依 PO「第二輪流程文件修訂任務」調整。上一筆「修訂紀錄 G2b-R1h」是 G2b-R1h 候選版製作當時的紀錄，原文保留；其中「修訂前原文」指 G2b-R1g 的原文。
  - 修訂範圍：
    - 「QA 第 2 輪的狀態及流程順序」：補入「T1 → PO 獨立授權追加 → TA → Reviewer」；明確定義 T1、TA 的通過條件及停止條件；QA 結論 FAIL 或 INCOMPLETE 時在 T1 後停止，不得因 T1 通過就自動交 Reviewer；任一階段結果無法確認時視為未通過。
    - 「未解決問題」第 3 項解除條件第 5 項：改為 A、B、G2b 三份流程文件均取得 PO 正式核准；G2b 核准版本完成 repo 同步；repo 任務文件 SHA-256 與核准版本一致；狀態轉換前確認正式基準。G2b-R1h 版第 5 項原文為「狀態轉換及 T0 所需的流程文件取得 PO 核准：變更範圍檢查規則、QA 第 2 輪派工文件，以及本任務文件中 QA 第 2 輪狀態及流程順序的修訂。」（保留供追溯）
    - 解除條件後的狀態轉換說明：補入追加授權及 TA。
  - 未變更：解除條件第 1～4、6 項；QA-W-1、QA-W-2a、QA-W-2b、QA-W-3a、QA-W-3b 的權限、命令、參數及限制；第 1 輪裁定 D-PO-20261121-01 只限第 1 輪（不套用到第 2 輪）；fixture／測試資料逐項核准；QA 不得寫入正式 QA 報告；Manager 追加須單次 PO 授權；TEST DEFECT 規則；QA 與 Developer 的職責隔離；測試證據要求；驗收條件；S17 計數規則（P78）及目前計數；任務狀態（仍為 BLOCKED，本修訂不轉換狀態）。
  - G2b-R1i 本身仍是候選版本，未經 PO 核准前不生效，不構成任何命令、狀態轉換、追加或派遣的授權；修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。
- 修訂紀錄 G2b-R1j（Manager 於 2026-11-22 追加；本筆屬候選 G2b-R1j，尚待 ChatGPT 獨立審查及 PO 核准）：
  - 版本關係：現行正式基準仍為 G2b-R1g（SHA-256 `7a14c2f1106ca43e353c2f4649ba52cd8c12581228ca3b64ec51e2aa092e25d1`，已核准並同步至 repo）。G2b-R1h、G2b-R1i 均為未經核准的候選版本；本候選以 G2b-R1i（`TEAM-001-ai-team-capability-validation-G2b-R1i-candidate.md`，48271 位元組、337 行，SHA-256 `27367424cccc2baac11a0180068591c04bb14f4b0cb2e1e19e8623379eaca73c`）為基礎。上兩筆「修訂紀錄 G2b-R1h」「修訂紀錄 G2b-R1i」是各該候選版製作當時的紀錄，原文保留。
  - 修訂依據：PO「TEAM-001 r11 候選文件最終修訂與交付」指令中的決策 3（QA FAIL／INCOMPLETE 的處理）。
  - 修訂範圍：
    - 「QA 第 2 輪的狀態及流程順序」首段：流程文字統一為「QA 完成 → Manager 執行 T1 → 若 QA PASS 且 T1 PASS，向 PO 申請確切追加授權 → PO 獨立授權追加 → Manager 執行 TA → TA PASS → Reviewer 審查 → PO 決定後續狀態」。
    - 第 7 步「QA 結論 FAIL 或 INCOMPLETE 時」：依 PO 決策統一為八點流程（T1 照常執行、T1 後立即停止回報、不得申請追加、不得 TA、不得交 Reviewer、段落是否追加由 PO 另行決定、T1 PASS 不覆蓋 QA 結論、T1 本身未通過時依停止條件處理）。
    - 「其他規則」S17 一點：補記目前計數為 1，計數規則不變。
  - 未變更：正式基準 G2b-R1g；狀態欄位 BLOCKED；S17 計數規則（P78）及目前計數 1；QA R2 須在 IN PROGRESS 下執行；前段順序（狀態轉換 → T0 → PO 獨立授權 QA R2 → QA R2）；T1、TA 的通過及停止條件；解除條件第 1～6 項（含第 5 項要求 A、B、G2b 三份文件均取得 PO 正式核准、G2b 核准版本完成 repo 同步、repo SHA-256 與核准版本一致、狀態轉換前確認正式基準）；QA-W-1、QA-W-2a、QA-W-2b、QA-W-3a、QA-W-3b；第 1 輪裁定 D-PO-20261121-01 只限第 1 輪；TEST DEFECT 規則；QA 與 Developer 的職責隔離；測試證據要求；驗收條件。
  - G2b-R1j 本身仍是候選版本，未經 PO 核准前不生效，不構成任何命令、狀態轉換、追加或派遣的授權；修訂後的大小、行數和 SHA-256 無法寫入本文件本身，由 Manager 另行記錄。

## 未解決問題

1. Manager 建立六個上層目錄的精確 Shell 命令、參數及操作路徑：待 PO 另行授權。
   - **目前狀態：已完成**（2026-11-22（記錄日）更新）。PO 已正式授權建立命令 `mkdir "<目標路徑>"`，Manager 已在 repo 根目錄依序建立 `tests/`、`tests/team-validation-smoke/`、`test-results/`、`test-results/TEAM-001/`、`test-results/_tmp/`、`test-results/_tmp/TEAM-001/` 六個目錄，沒有使用 `mkdir -p` 或其他替代方式。
2. Manager 確認六個上層目錄存在的唯讀檢查命令及使用方式：待 PO 另行授權。
   - **目前狀態：已完成**（2026-11-22（記錄日）更新）。PO 已正式授權檢查命令：建立前執行 `test -e <目標路徑>; echo $?`，六個目錄都印出 `1`；建立後執行 `test -d <目標路徑>; echo $?`，六個目錄都印出 `0`。
3. 任務 BLOCKED（2026-11-22 起）：T4-R1 第 1 輪 QA 結論 INCOMPLETE（F-R1-01，TEST ENVIRONMENT ISSUE）。核准的 QA-W-2b 命令 `node --test tests/team-validation-smoke/` 在 Windows／Node.js v24.15.0 下把目錄當成模組入口載入（`MODULE_NOT_FOUND`），沒有執行任何案例。
   - 負責解除：PO（核准修訂後的 QA 測試命令，以及規格、任務文件的修訂和新基準）。
   - 解除條件（以下六項必須全部滿足；任何一項單獨成立都不足以解除 BLOCKED）：
     1. Architect 完成 QA 命令修訂方案，並取得 PO 核准。
     2. 新命令完成 repo 外可行性驗證，且結果及證據可供獨立審查。
     3. 修訂後的規格文件取得新的 PO 核准基準。
        - **進度：已完成**（G2b-R1b 追加；候選，尚待 PO 最終核准）。完成依據：G2a-R1a 已由 PO 正式核准，正式規格 SHA-256 `96996f8b78825a038740f5e6e83b570467cd0f87e1eaafe155493478eaf84ba9`；repo 規格 `docs/architecture/team-validation-smoke-test-spec.md` 已同步，同步後 SHA-256 與正式核准版一致；同步差異 `G2a-R1a-repo-sync-diff.patch`（SHA-256 `ef9c7e0c5560476622e0e5e7e3c57eda706a6c7110b9afbccd9fd427ba3779ea`）。詳見交付紀錄「修訂紀錄 G2b-R1a」。
        - 本進度只代表解除條件第 3 項完成；第 1、2、4、5、6 項的狀態不在本次更新範圍，未解決問題第 3 項（任務 BLOCKED）整體仍未解決，TEAM-001 仍為 BLOCKED。
     4. 修訂後的本任務文件取得新的 PO 核准基準。
        - **進度：已完成**（G2b-R1c 追加；G2b-R1c 本身尚未核准）。完成依據：G2b-R1b 已於 2026-11-22 經 PO 正式核准，正式核准 SHA-256 `85c5e25448017b918b2f18c5a61ea85ccb4f9e986f314c351f522937c8f0fa4a`，並已同步至 repo `tasks/blocked/TEAM-001-ai-team-capability-validation.md`（同步差異 `G2b-R1b-repo-sync-diff.patch`，SHA-256 `20558f7b5c03938f51d68ca01ccc0addc735f8da0c104ba8c5a821bc263f2ea3`）。詳見交付紀錄「G2b-R1b 正式核准及 repo 同步紀錄」。
        - 本進度只代表解除條件第 4 項完成；第 5 項尚待獨立盤點，第 6 項 PO 尚未授權 QA 第 2 輪；未解決問題第 3 項（任務 BLOCKED）整體仍未解決，TEAM-001 仍為 BLOCKED。
        - 核准狀態更新（G2b-R1d 追加；候選，尚待 PO 最終核准）：上方「G2b-R1c 本身尚未核准」為 G2b-R1c 候選版製作當時的狀態；G2b-R1c 已於 2026-11-22 經 PO 正式核准，正式核准 SHA-256 `5d860126e9c73d5410fd22df8475994d0e7a8e3716efb8a1b74aba489790a3b7`。第 4 項已完成的依據仍為 G2b-R1b 正式核准（SHA-256 `85c5e25448017b918b2f18c5a61ea85ccb4f9e986f314c351f522937c8f0fa4a`）及其 repo 同步；G2b-R1c 的核准不代表其他解除條件完成。第 5 項仍待獨立盤點，第 6 項仍未取得 PO 授權；未解決問題第 3 項整體仍未解決，TEAM-001 仍為 BLOCKED。
        - 核准狀態更新（G2b-R1e 追加；候選，尚待 PO 最終核准）：上方「核准狀態更新（G2b-R1d 追加；候選，尚待 PO 最終核准）」的候選標示為 G2b-R1d 製作當時的狀態，原文保留；G2b-R1d 已於 2026-11-22 經 PO 正式核准，正式核准 SHA-256 `5fceb7d530fd0d7ab94eaf374ea2d5ef5a680eae31c2758d9b6f673daf350fbf`。第 4 項已完成的依據仍為 G2b-R1b 正式核准及其 repo 同步；G2b-R1c、G2b-R1d 後續的核准及同步不代表其他解除條件完成。第 5 項仍待獨立盤點，第 6 項仍未取得 PO 授權；未解決問題第 3 項整體仍未解決，TEAM-001 仍為 BLOCKED。
     5. （G2b-R1h 候選建立、G2b-R1i 候選修訂）流程文件正式核准及正式基準確認，以下全部成立：
        1. 變更範圍檢查規則（B）、QA 第 2 輪派工文件（A）及本任務文件（G2b）中 QA 第 2 輪狀態及流程順序的修訂版本，三份均取得 PO 正式核准。
        2. 本任務文件的 PO 核准版本已完成 repo 同步（保留同步前備份及同步差異）。
        3. repo 內任務文件的 SHA-256 與 PO 核准版本的 SHA-256 完全一致。
        4. 狀態轉換前，Manager 已確認並記錄當時的正式基準（規格、任務文件、變更範圍檢查規則及 QA 派工文件的核准版本與 SHA-256），且 repo 任務文件仍與核准版本一致；不一致時停止並回報 PO。
     6. （G2b-R1h 候選修訂）狀態轉換前後證據保存，以及 T0 所需的命令、目錄、檔案及 Manager 報告，分別取得 PO 授權（各項授權互相獨立）。
   - 六項全部滿足後，由 Manager 確認並提出狀態轉換計畫，經 PO 授權才依 `CLAUDE.md` §6.1 由 BLOCKED 轉回 IN PROGRESS；Manager 不得自行轉換狀態。（G2b-R1h 候選建立、G2b-R1i 候選修訂）QA 第 2 輪在 IN PROGRESS 狀態下執行，不轉為 REVIEW；狀態轉換後的 T0、QA 第 2 輪授權、T1、追加授權、TA、Reviewer 審查及後續狀態，依「QA 的權限與命令」中「QA 第 2 輪的狀態及流程順序」辦理。QA 第 2 輪的授權不再是解除 BLOCKED 的前提，而是在 T0 通過後由 PO 另行授權。

## 狀態紀錄

| 日期 | 從 | 到 | 原因 |
|---|---|---|---|
| 2026-11-21 | — | BACKLOG | Q1-4：G1 APPROVED 後由 Manager 建立 |
| 2026-11-21 | BACKLOG | IN PROGRESS | T2 開始（PO 2026-11-21 正式授權狀態轉換；依 revised-019 §8.1） |
| 2026-11-22（記錄日） | IN PROGRESS | IN PROGRESS（無狀態變更） | G2a：PO 核准規格及 Developer 修改範圍 |
| 2026-11-22（記錄日） | IN PROGRESS | IN PROGRESS（無狀態變更） | G2b：PO 核准正式任務文件及 Developer 修改範圍 |
| 2026-11-22（記錄日） | IN PROGRESS | IN PROGRESS（無狀態變更） | OPEN-02：完成兩個 Developer 工作目錄建立 |
| 2026-11-22（記錄日） | IN PROGRESS | IN PROGRESS（無狀態變更） | T3a：Developer 已完成 D-1～D-3 交付 |
| 2026-11-22 | IN PROGRESS | REVIEW | T3a 完成，進入 QA（T4-R1）；PO 2026-11-22 正式授權狀態轉換；依 revised-019 §4 |
| 2026-11-22 | REVIEW | BLOCKED | T4-R1 第 1 輪 QA 結論 INCOMPLETE（核准的 QA-W-2b 命令未執行任何案例）；S17 計數 0 → 1；PO 2026-11-22 正式授權狀態轉換；依 CLAUDE.md §5.2、§6.1 |

