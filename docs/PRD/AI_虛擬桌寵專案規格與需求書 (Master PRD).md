# 拾暖伴伴 (shinuan) AI 虛擬桌寵專案規格與需求書 (Master PRD v2.1.30)

**【版本資訊】** Master PRD v2.1.30（2026-11-26 規格修訂候選稿，承接 v2.1.29）
**【本次修訂重點（v2.1.29 → v2.1.30，PO 2026-11-26 決議）】**

1. **個體父母繁育與真實貓咪 7 基因座毛色＋眼色遺傳模型（§3.1、§8.A.5）：**
   - 新增系統內定父母貓設定契約（`content/genetics/preset-parents.v1.json`），採**資料驅動原則**（父母名字、隻數、花色與基因型由外部 JSON 動態維護，不寫死於規格；通用驗證確保 6 品種皆含公／母候選且內定公貓不含三花／玳瑁）。
   - 個體父母模式採用真實貓咪毛色 7 基因座孟德爾遺傳（`O/o` X 性聯橘色、`B/b` 黑／巧克力、`D/d` 濃色／稀釋、`A/a` 虎斑／純色、`C/cs` 全色／重點色、`S/s` 白斑、`W/w` 顯性純白，另附 `I/i` 銀金漸層抑制）與**真實貓咪眼色遺傳模型**（`cs/cs` 重點色 100% 藍眼、`W/-` 純白 35% 藍眼／15% 藍金異色瞳、`S/-` 白斑 5% 藍眼／5% 異色瞳、一般無白貓採多基因虹膜黑色素光譜 `emerald ↔ amber ↔ copper`），同時 100% 保留既有純品種遺傳模式（`TC-01`、`TC-02` 零破壞）。
2. **一胎 3～5 隻小貓、子代性別與罕見公三花彩蛋（§8.A.5）：**
   - 每次配對生出一胎 **3～5 隻**同胎小貓（3 隻 `30%`／4 隻 `40%`／5 隻 `30%`），每隻獨立採 **`50%` 公／`50%` 母**。
   - 採 **E1 彩蛋規則**：三花／玳瑁母貓（`O/o`）生出之正常公貓自然拆色為 50% 橘系／50% 非橘系；具雙色基因條件之公貓以 **`2%`** 機率觸發罕見 XXY 招財公三花／公玳瑁彩蛋，觸發時於 UI 明確祝賀玩家抽到幸運彩蛋。
3. **小怪癖領養神秘感（§3.2、§8.A.1、§8.A.5）：**
   - 領養預覽階段僅提示「有／無隱藏小怪癖（`hasHiddenQuirks`）」，**不提示數量、不揭露名稱與效果**，新增 `discoveredQuirks` 供玩家於日後陪伴互動逐步發現。
4. **R1 防短時間盲抽與帳號總免費擁有上限（§8.A.5、§8.D）：**
   - 採 **R1 方案**：每個本地日曆日最多免費繁育 **3 胎**（受既有本地日期與防時鐘回撥規則保護）；放棄本胎換下一胎或領養剩餘兄弟姊妹前提示「**此胎貓咪將由其他玩家領養**」以喚醒珍視感；用完第 3 胎時保留第 3 胎供玩家完成領養不卡死新手。
   - 領養名額改以**帳號總擁有免費貓咪數**控管（`AdoptionSlotPolicy.maxFreeOwnedPets`，MVP 預設 `1`，架構支援設定為 `n` 並預留 `purchasedExtraPetSlots` 供未來付費多領養）。
5. **皮克敏式 2D 圖層即時換色選父母與公益／聯名來源預留（§8.A.5、§8.D）：**
   - 父母挑選介面直接複用全專案唯一 7 層 2D 貓咪渲染器與 `colorParams` 動態著色（選品種＋點色球即時換裝），無須繪製獨立父母寫真立繪；暫緩商業貓舍合作，父母資料來源預留零爭議 `sourceType: "system" | "influencer_ip" | "rescue_shelter"`（網紅貓 IP 與動保中途待領養真貓免費公益合作）。
6. **新增 `TC-10` 驗收劇本與 Phase A 增量規格 `SHINUAN-S1-04`（§8.E.2、§11.2）。**

**【核心規則保留聲明】** 本次修訂**完全未更動**既有純品種遺傳規則、TimeEngine 步進與精確交點公式、MoodHealthPenalty 公式、Recovery 速率與狀態機、Health 40 / 10 保護規則、商品定價級距上限表與 `TC-01`～`TC-09`、`TC-MH-01`～`TC-MH-12` 預期驗收結果。

---

# 0. 核心術語表 (Glossary)

為確保產品、美術與雙平台工程實作命名完全一致，全專案統一採用以下標準術語：

- **Pet / PetState：** 玩家目前養成的單一寵物實體及其所有持續性資料（外觀、需求、性格、記憶、背包、積分）。
- **GameState：** 整個遊戲的完整存檔狀態封裝（含 `schemaVersion`、`pet` 與 `dailyLimits`）。
- **Genetics (PetGenetics)：** 寵物誕生時永久鎖定的遺傳資料（含 `seed`、PRNG 版本、規則版本與最終 `Appearance`）。
- **Appearance (PetAppearance)：** 經相容性驗證後的最終七大外觀圖層組合與色彩參數（`colorParams`），為畫面渲染的唯一依據。
- **BasePersonality：** 寵物長期基礎人格數值（親人、慵懶、傲嬌、好奇，範圍 `0~100`），由品種天性與帶時間衰減的行為統計構成。
- **Quirk (QuirkModifiers)：** 小怪癖修正因子（每隻貓最多 2 個），以明確的加法或乘法係數微調特定行為機率，不改變 `BasePersonality`、需求、健康或經濟數值。
- **CurrentState：** 寵物當下的生理與情緒即時數值（`hunger`、`hydration`、`mood`、`health`）與作息狀態。
- **BehaviorDecision：** `BehaviorEngine` 輸出的完整行為決策物件（含 `animationId`、`tailState`、`iconIds`、`soundId`、`durationMs`、`interruptible`、`cooldownMs`）。
- **PetViewModel：** Game Core 轉出的跨平台統一呈現資料契約，供本機可視化測試看板、React Native UI、Android 懸浮窗與 iOS Widget 唯讀渲染。
- **Renderer (PlatformRenderer)：** 各平台原生或跨平台呈現層（Local Sandbox / Kotlin Overlay / SwiftUI Widget / React Native），負責播放動畫與處理平台物理限制，不參與遊戲規則計算。
- **Clock：** 外部注入的時間與時區來源介面（`{ now(): number; getTimezoneOffsetMinutes(): number }`），嚴禁在 Game Core 內直接呼叫 `Date.now()` 或依賴執行環境系統時區。
- **RandomGenerator：** 外部注入的確定性偽隨機數產生器介面（`next(): number`，回傳 `[0, 1)`），確保固定 `seed` 可完全重現結果。
- **SimulationStep：** `TimeEngine` 一般模擬的最大基礎分段步長（Max Simulation Step），預設為 0.25 小時（15 分鐘），非唯一結算單位；遇日夜時段邊界、門檻交點、`GameCommand` 與 Care Pause 啟用／解除時執行精確交點切割（Exact Boundary / Threshold Crossing Split）。
- **PeriodFactor：** 日夜時段衰退係數（本地日間 `07:00~23:00` 為 `1.0`，夜間 `23:00~07:00` 為 `0.3`）。
- **RecoveryState：** 健康救援狀態機狀態枚舉（`NORMAL`、`CRITICAL`、`RECOVERY_BOOST`、`NATURAL_RECOVERY`）。
- **RecoveryBoostAccumulatedHours：** 當前救援週期內實際滿足條件並累計的加速恢復時數（上限 `2.0` 小時）。
- **CarePause：** 照護暫停保護模式，開啟期間停止需求衰退與健康扣減，解除時不進行離線補算。
- **MoodHealthPenalty：** 獨立的低心情健康扣減計算器（Mood `20~39` 時，`below40Hours` 精確跨越 `72.0` 小時後〔嚴格 `> 72.0`〕，從該交點之後的時間區段開始套用 `-0.05/hr`；Mood `0~19` 時，`below20Hours` 精確跨越 `48.0` 小時後〔嚴格 `> 48.0`〕，從該交點之後的時間區段開始套用 `-0.1/hr` 取代 `-0.05/hr` 不疊加，若 `below20Hours <= 48.0` 且 `below40Hours > 72.0` 則仍承接維持 `-0.05/hr`，其餘為 `0/hr`；全程受 `Health >= 40` 安全地板保護）。
- **LowMoodDuration：** 記錄寵物連續處於低心情區間的累積小時數物件 `{ below40Hours: number; below20Hours: number }`（`below40Hours` 累計 `Mood < 40` 的連續小時數，`below20Hours` 累計 `Mood < 20` 的連續小時數），隨存檔持久化並在 `Mood >= 40` 時立即歸零。
- **RecoveryMultiplier：** `NATURAL_RECOVERY` 階段依據 Mood 區間套用的分級恢復速度倍率（`Mood >= 70` 為 `+2.5/hr`、`Mood 40~69` 為 `+1.25/hr`、`Mood < 40` 暫停）。
- **TraitPool：** 各基礎品種在七大外觀圖層上的預設候選特徵池與權重配置。
- **CompatibilityRule：** 七大外觀圖層之間的確定性衝突替換與終極回退驗證規則。
- **GeneticsVersion / PRNGAlgorithmVersion：** 遺傳邏輯與偽隨機數演算法版本號，用於確保舊貓外觀永久不變。
- **DailyLimits：** 依裝置本地日期 `YYYY-MM-DD` 記錄的當日領取上限與已探索商品清單。
- **GameCommand / GameEvent：** 外部輸入至 `GameEngine` 的操作指令與引擎輸出的不可變事實事件。
- **Cooldown：** 行為或提醒觸發後的冷卻時間（ms），期間不重複觸發同類事件。
- **Deterministic Test / Statistical Test：** 固定單一 `seed` 的確定性單元測試，以及使用獨立固定 `seed` 序列（1,000 組）驗證機率分布的統計測試。
- **PresetParentCat（系統內定父母貓）：** 定義於外部設定檔 `content/genetics/preset-parents.v1.json` 之具體公／母貓候選個體（含品種、性別、外觀圖層與 7 基因座 `CoatGenotype`），採資料驅動隨時可調整，用於「皮克敏式 2D 換色選父母」繁育流程。
- **CoatGenotype（毛色基因型）：** 依據真實貓咪毛色遺傳學建立之 7 基因座（`O/o`、`B/b`、`D/d`、`A/a`、`C/cs`、`S/s`、`W/w`）加銀金漸層抑制（`I/i`）等位基因組合，於個體父母模式下以孟德爾遺傳計算子代毛色與花紋。
- **Litter（同胎小貓）：** 單次個體父母配對誕生之 3～5 隻獨立子代清單（3 隻 `30%`／4 隻 `40%`／5 隻 `30%`），每隻各自派生獨立 `seed`、性別與隱藏小怪癖。
- **AdoptionSlotPolicy（帳號領養名額政策）：** 以玩家帳號總擁有貓咪數為單位控管免費領養上限（`maxFreeOwnedPets`，MVP 預設 `1`，架構支援設定為 `n`）與未來付費擴充名額（`purchasedExtraPetSlots`）。
- **GeneticsEasterEgg（遺傳彩蛋）：** 個體父母繁育時觸發之極低機率真實生物學彩蛋（如 XXY 招財公三花 `rare_male_calico` 與公玳瑁 `rare_male_tortoiseshell`），觸發時於 UI 明確祝賀提示玩家。

---

# 1. 專案概述：這是一款什麼樣的產品？ (Elevator Pitch)

**【一句話產品介紹】**  
這是一款讓虛擬寵物「活」在你手機螢幕最上層的陪伴型 App。不需要刻意打開遊戲，當你在滑 LINE、看 YouTube 甚至看盤時，一隻專屬於你的虛擬貓咪會直接在螢幕邊緣走動、睡覺、陪伴著你。

**【核心產品承諾（無壓力陪伴底線）】**  
本產品不設寵物死亡機制、不因玩家長期未開啟 App 而永久失去寵物、不設不可逆的健康傷害。健康值設有保護下限（最低降至 `10`），任何低健康狀態皆可透過免費基礎照護或救援模式恢復，並提供無懲罰的「照護暫停模式 (Care Pause)」。

**【寫給首次閱讀本企劃的人：我們解決了什麼問題？】**

- **對一般大眾 (User)：** 解決了「想養寵物但環境不允許」或「渴望日常陪伴」的痛點。這不是一款需要死板打卡的手遊，而是透過連動手機真實的時間與電量等環境資訊（MVP 階段先提供時間與電量情境；計步器與戶外散步列為 Phase E 後續擴充，MVP 階段不申請計步器權限），讓你感覺手機裡真的住著一隻有情緒的貓咪。
- **對贊助廠商 (Brand)：** 解決了「寵物廣告轉換率低、惹人厭」的痛點。我們將真實的貓砂、主食罐置入遊戲商店中，玩家在選購飼料時自然閱讀真實成分與營養介紹，廠商付費取得「被精準受眾看見的機會」，實現零反感的**內容型原生廣告 (Native Advertising)** 與導購平台 (B2B2C)。

**【技術與發展藍圖】**  
採用「平台解耦」與「離線優先」架構，以純 TypeScript 打造跨平台遊戲核心（Game Core），先於 Windows 本機完成核心規則驗證、自動化測試與可視化測試看板驗收，再分別透過原生適配器（Adapter）落地於 Android 全域懸浮窗與 iOS 桌面 Widget / App 內互動。初期依賴 2D 肢體動畫與腳本狀態機以零伺服器成本驗證市場；專案的終極目標，是在商業模式與核心玩法驗證成功後，於未來階段接入 LLM（大型語言模型）賦予貓咪深度對話能力（LLM 僅負責語言與情境表達，絕不直接修改核心數值或跳過 Game Core 規則）。

---

# 2. 商業模式深度解析 (內容型原生廣告與 O2O 導購)

有別於傳統手遊強迫觀看無關廣告或用數值懲罰逼迫課金，本專案的核心是「將商業產品化為遊戲商店的真實內容」，讓選擇權完全回歸玩家。

## 2.1 無反感原生廣告的五大核心原則

1. **商品是選擇，不是強迫（免費照護保障）：** 玩家可自由使用基礎免費食物與飲水，足以持續維持貓咪健康與基本需求，絕不會因為沒買合作品牌商品而導致貓咪生病或受到不可逆懲罰。每日一次登入的標準免費照護量（3 份免費乾糧 + 4 份免費飲水 + 3 次互動），必須足以讓寵物在長期正常照護情境下維持基本健康，不得要求玩家透過付費商品、觀看廣告或提高登入頻率，才能避免寵物健康持續惡化。
2. **廣告與一般商品並存：** 商店內同時提供一般遊戲道具與合作廠商商品，合作商品清楚標示「品牌合作 / 贊助內容」，維持畫面清爽。
3. **商品介紹具備真實知識價值：** 點進飼料可查看真實品牌、原料成分、蛋白質／脂肪／水分營養分析、適用對象、資料來源及資料更新日期；MVP 階段之模擬商品須於 UI 明確標示「測試商品／模擬資料」。
4. **品牌公平與平衡原則：** 品牌合作商品不得因贊助關係取得額外數值加成。所有商品的遊戲回復效果均依固定的遊戲平衡公式配置（例如主食罐補水高、乾糧飽食高、零食心情高），廠商購買的是「品牌曝光與虛擬櫃位」，贊助費不得直接影響商品數值。MVP 階段不採用自動數值公式，而是採「預先定義之品類定價級距上限區間（見 §8.C.2）＋ PO 核准之固定商品效果白名單（`food-catalog.v1.json`）」；同一級距內允許依真實營養特性於合法區間內微調，但價格級距上限為硬性天花板，不得跨級突破，且一般商品與品牌合作商品一律適用同一張級距表，嚴禁以品牌合作身分、贊助金額或曝光合約作為效果參數。
5. **自然探索不干擾：** 僅在玩家主動進入商店挑選商品時才呈現完整品牌介紹，不彈出干擾性蓋版廣告，亦不設計逼迫刷廣告的機制。

## 2.2 商業假設與變現路徑 (商業驗證指標)

1. **核心市場假設 (Hypothesis) 與驗證指標：**
   - 假設 1「無法養貓者需要桌寵陪伴」➔ 驗證指標：Beta 訪談與 7 日／30 日留存率。
   - 假設 2「飼主願意閱讀成分分析且不排斥品牌商品」➔ 驗證指標：商店進入率、詳情頁停留時間與退出率。
2. **使用者 ➔ 產品 ➔ 利潤轉換路徑（列為未驗證商業模型，Phase D 後逐步驗證）：**
   - **路徑 1：品牌櫃位曝光與知識探索 (CPA / 櫃位贊助費)：** 廠商提供經審核的商品圖文與營養成分上架虛擬櫃位（未來支援透過第三方 API／CSV 批次匯入自助維護商品資訊，並經拾暖級距白名單審核後發佈），支付櫃位曝光費或有效探索費（同帳號同商品不重複計費）。
   - **路徑 2：實體導購分潤 (CPS)：** 遊戲內提供專屬折扣碼與電商連結，依實際成交金額抽取 10%～20% 分潤（後續商業驗證階段串接歸因追蹤）。
   - **路徑 3：去識別化統計洞察 (隱私優先)：** 僅在使用者明確同意下收集不可識別個人的匿名問卷統計，以彙總研究報告形式提供合作品牌；嚴禁出售個別使用者行為軌跡、定位紀錄或可識別資訊。

## 2.3 遊戲內可納入的實體產品類別清單

1. **主食與副食品 (核心消耗品)：** 頂級乾糧、無穀主食罐（如陪心、皇家、希爾斯）、凍乾肉餅、機能性副食罐、貓草／貓薄荷。
2. **保健醫療食品 (日常保養對應)：** 腸胃益生菌、排毛粉、泌尿道保健液、關節保養錠、維生素 B 群、體外驅蟲滴劑。
3. **生活用品 (設備升級)：** 豆腐砂／礦砂（對應鏟屎任務）、陶瓷護頸食盆、恆溫貓窩、貓抓板、寵物推車／外出背包。
4. **互動玩具 (耐久度消耗)：** 貓草魚、電動逗貓球、智慧雷射筆。

*（註：MVP Phase D 初期商品目錄僅開放「主食與副食品」及「零食」類別；保健醫療食品、生活用品與互動玩具列為 Phase E 後續擴充，暫不納入 MVP 實作。）*

---

# 3. 遺傳外觀與三層性格模型

## 3.1 品種特徵傳承與外觀生成機制 (Trait Inheritance System)

為了讓每位玩家擁有獨一無二的專屬貓咪，並確保跨平台與版本更新後的外觀穩定性，採用「品種初始特徵池 + 獨立圖層抽選 + 相容性驗證」機制：

1. **父母品種選擇：** 玩家從 6 大基礎品種（米克斯 `domestic`、曼赤肯 `munchkin`、布偶 `ragdoll`、英短 `british_shorthair`、異國短／長毛 `exotic`、緬因 `maine_coon`）中挑選父與母。品種提供初始特徵池（Trait Pool）與基礎性格傾向，而非直接寫死最終外觀。
2. **七大外觀圖層拆解：** 貓咪外觀拆解為「頭型 (`head`)、耳朵形狀 (`ears`)、眼睛形狀 (`eyes`)、瞳孔顏色 (`pupilColor`)、花色斑紋 (`coatPattern`)、尾巴長度 (`tail`)、體型 (`body`)」7 大圖層。
3. **每圖層獨立抽選法則（依配對類型區分權重）：** 每個未由步驟 1 特殊骨架規則鎖定的圖層作為獨立抽選單位：
   - **第一階段來源抽選：**
     - **雙親同種純種品種貓**（`fatherBreed === motherBreed && fatherBreed !== "domestic"`）：**90%** 繼承該品種預設特徵（父系 45% + 母系 45%；若該圖層特徵池有多個候選值，則依池內權重再抽一次）、**10%** 進入變異路徑。
     - **米克斯 ＋ 純種品種貓**（一方為 `domestic`，另一方為非 `domestic`，不論米克斯為父或母）：米克斯佔 **30%**、品種貓佔 **50%**、**20%** 進入變異路徑。
     - **其他配對**（不同純種品種貓跨配，或雙親皆為米克斯 `domestic + domestic`）：**40%** 繼承父方品種預設特徵、**40%** 繼承母方品種預設特徵、**20%** 進入變異路徑。
   - **第二階段變異路徑：**
     - 設有稀有突變之 4 個圖層（`ears`、`pupilColor`、`coatPattern`、`tail`）：變異路徑內 **75%** 從該圖層合法通用特徵白名單等權重隨機重組、**25%** 觸發該圖層之稀有突變（折耳、異色瞳、星空斑紋、麒麟尾）。於 20% 變異路徑下，每層稀有突變機率為 `5%`（單隻貓至少出現一種稀有突變之機率為 `1 - (1 - 0.05)^4 ≈ 18.55%`）；於雙親同種純種品種貓 10% 變異路徑下，每層稀有突變機率為 `2.5%`（至少一種機率 `1 - (1 - 0.025)^4 ≈ 9.63%`）。允許同時出現多種稀有突變。
     - 無稀有突變之 3 個圖層（`head`、`eyes`、`body`）：變異路徑 **100%** 從該圖層合法通用特徵白名單等權重隨機重組。
   - 若父母在某圖層特徵相同，父系與母系抽選結果均視為該特徵，機率不合併至突變池，變異仍依上述該配對類型之獨立機率抽選。
4. **Seed 與版本永久鎖定規範：**
   - `seed` 僅用於生成初始遺傳結果，不作為既有寵物外觀的唯一保存依據。
   - 每隻寵物生成後，必須永久保存完整的最終 `appearance`（含 `colorParams`）、`geneticsVersion`、`prngAlgorithmVersion` 與 `rulesVersion`。
   - **任何後續 Genetics、PRNG、Trait Pool 或 Compatibility Rule 更新，均不得重新生成或覆寫既有寵物的外觀。**
5. **GrowthStage MVP 規範：** MVP 初期不實作實際年齡成長與外觀變化。`ageInDays` 僅作為遊戲累計天數資料預留，不影響外觀、動畫、健康或人格數值；`growthStage` 初期固定為 `"adult"`，保留未來版本擴充。
6. **個體父母選配與一胎 3～5 隻領養模式（v2.1.30 增量，與上述純品種模式雙軌並存）：** 正式領養動線支援玩家由 `preset-parents.v1.json` 挑選具體公貓（爸爸）與母貓（媽媽），採皮克敏式 2D 圖層即時換色預覽並一次誕生 **3～5 隻**同胎小貓；毛色與花紋採用真實貓咪 7 基因座孟德爾遺傳公式（詳見 §8.A.5），同時 100% 保留原有純品種模式以確保 `TC-01`、`TC-02` 零破壞。

## 3.2 三層行為決策模型 (Behavior Decision Model)

為避免「永久人格」與「暫時生理狀態」混淆，性格與行為拆分為三層獨立架構：

- **第一層：基礎人格 (BasePersonality)：** 由品種天性基準 `breedBase`（權重 60%）與長期後天養成記憶（權重 40%）構成，決定 `affection`（親人）、`laziness`（慵懶）、`tsundere`（傲嬌）與 `curiosity`（好奇）（範圍 `0~100`）。
  - **跨品種天性基準 `breedBase` 計算規則：**
    - 同品種雙親：`breedBase = parentBase`。
    - 米克斯（`domestic`）＋純種品種貓（不論米克斯為父或母）：`breedBase = Math.round(domesticBase * 0.3 + purebredBase * 0.7)`。
    - 其他跨品種（兩方皆不同純種品種貓）：`breedBase = Math.round((fatherBase + motherBase) / 2)`。
  - **後天養成記憶計算公式（四維度獨立程式級數學定義）：** 統計視窗固定為「過去 30 日滾動視窗」（`recent7Days` 為最近 7 日，`prior23Days` 為第 8～30 日）。若某維度在過去 30 日滾動視窗內之有效互動次數為 0（無有效歷史資料），則該維度之記憶分數直接設為該品種天性基準 `memoryScore = breedBase`（使 `finalPersonality = round(breedBase * 0.6 + breedBase * 0.4) = breedBase`，精確回歸品種天性基準）；唯有當過去 30 日內存在有效互動紀錄時，才套用以下加權與線性插值公式：
    - **親人度 (`affection`)：** 有效行為為「有效摸頭（目標 21 次／7 日，權重 60%）」與「餵食主食罐（目標 7 次／7 日，權重 40%）」。`r7 = min(1, (pets7d / 21) * 0.6 + (wetFood7d / 7) * 0.4)`，`r23 = min(1, (pets23d / 69) * 0.6 + (wetFood23d / 23) * 0.4)`，`affectionMemoryScore = (r7 * 0.7 + r23 * 0.3) * 100`，`finalAffection = round(breedAffection * 0.6 + affectionMemoryScore * 0.4)`。
    - **好奇心 (`curiosity`)：** 有效行為為「有效玩耍（目標 14 次／7 日）」。`r7 = min(1, plays7d / 14)`，`r23 = min(1, plays23d / 46)`，`curiosityMemoryScore = (r7 * 0.7 + r23 * 0.3) * 100`，`finalCuriosity = round(breedCuriosity * 0.6 + curiosityMemoryScore * 0.4)`。
    - **慵懶度 (`laziness`)：** 依據 7 日總互動次數（摸頭 + 玩耍 + 餵食）線性插值：`interactions7d <= 3` 時 `lazinessMemoryScore = 100`；`interactions7d >= 14` 時 `lazinessMemoryScore = 20`；介於 `3 ~ 14` 之間採線性插值 `100 - ((interactions7d - 3) / 11) * 80`，`finalLaziness = round(breedLaziness * 0.6 + lazinessMemoryScore * 0.4)`。
    - **傲嬌度 (`tsundere`)：** 結合「高級罐頭／零食餵食（目標 7 次／7 日，降低傲嬌）」與「冷落懲罰（7 日總互動 `< 3` 次時升至 90）」：當 `interactions7d < 3` 時 `tsundereMemoryScore = 90`；否則 `treatRatio = min(1, premiumFood7d / 7)`，`tsundereMemoryScore = 60 - treatRatio * 50`（即滿標時降至 10），`finalTsundere = round(breedTsundere * 0.6 + tsundereMemoryScore * 0.4)`。
- **第二層：小怪癖修正 (QuirkModifiers)：** 每隻貓最多擁有 2 個小怪癖，採用明確的修飾型別微調行為觸發機率，絕不改變 `BasePersonality`、需求、健康或經濟數值：
  - `additiveProbabilityModifier`：加法百分點修正（如 `+0.30` 代表機率直接加 30 個百分點）。
  - `multiplicativeWeightModifier`：乘法權重修正（如 `1.3` 代表原始權重乘以 1.3 倍）。
  - 多個 Quirk 同時作用於同一行為時，先套用加法修正再套用乘法修正，最終機率嚴格限制（Clamp）於 `[0.05, 0.95]` 區間。
  - **Phase A MVP 白名單（共 4 款）與誕生抽取順序：** 領養生成時，**排在七大外觀圖層與 `colorParams` 微調全部完成之後**，才使用同一 `RandomGenerator` 獨立抽出小怪癖（確保不影響 `TC-01` 外觀）；數量機率固定為 `50%` 無怪癖（0 個）、`35%` 抽 1 個、`15%` 抽 2 個（不重複，自白名單等權重抽選）。詳細清單見 §8.B.2。
  - **領養預覽神秘感規範（v2.1.30）：** 為保留養貓驚喜感，領養預覽介面**僅提示「有／無隱藏小怪癖（`hasHiddenQuirks: boolean`）」，絕不顯示怪癖數量、名稱或效果**；實際 `quirks` 於領養確認後寫入存檔，並以 `discoveredQuirks`（初始為空陣列 `[]`）隨日後互動逐步揭露。
- **第三層：即時狀態調節 (CurrentStateModifier)：** 飢餓、水分、心情、健康與作息時段作為即時條件輸入 `BehaviorEngine`，影響當下動作選擇，絕不反向永久修改 `BasePersonality`。

---

# 4. 核心功能與互動機制

## 4.1 雙平台差異化呈現與生命週期規範

- **Android 端 (全域懸浮與物理互動)：**
  - 透過 Kotlin 原生 `WindowManager` (`SYSTEM_ALERT_WINDOW`) 建立透明懸浮視窗，支援螢幕漫步、邊界轉向、點擊摸頭、長按拖曳與虛擬重力掉落（拖曳與掉落僅觸發短暫抗議動畫，絕不扣減健康值）。
  - **Android 懸浮窗生命週期規範：**
    - 使用者隱藏桌寵至通知列或完全關閉 Overlay 時，僅停止畫面渲染，Game Core 仍透過時間戳正常運作，App 內主房間仍可正常操作。
    - 若使用者於系統設定撤銷 Overlay 權限，App 自動切換為「App 內模式」並保存進度，不產生閃退；手機重新開機後 MVP 不強制背景自動啟動。
    - 進入省電模式時自動降低動畫影格率（FPS）；懸浮視窗不搶奪系統輸入焦點，使用者正在輸入文字時絕不攔截鍵盤或觸控操作。
- **iOS 端 (App 內完整互動 + 桌面 Widget)：**
  - 明確定義 **iOS Widget 僅為寵物狀態展示與有限快捷操作入口 (App Intents)**，受 iOS 系統排程限制（約 15～60 分鐘更新），不保證即時動畫或背景持續執行 `Game Core`；完整狀態計算與互動於開啟 App 時執行。

## 4.2 時間差模擬與照護暫停保護 (省電核心)

- **時間區段拆分模擬 (Time-based Simulation)：** 捨棄耗電的背景常駐服務。系統記錄最後模擬時間戳 (`lastSimulatedAt`)，重新開啟時由 `TimeEngine` 將離線期間精準切分為 `0.25` 小時（15 分鐘）刻度（並於邊界／門檻處精確交點切割），依「日間清醒（`07:00~23:00`）」與「夜間休眠（`23:00~07:00`）」區段循序計算需求與健康變化，確保分段模擬與單次長離線模擬結果完全一致。
- **照護暫停保護模式 (Care Pause)：** 玩家忙碌或出差時可手動開啟 Care Pause（MVP 不限制暫停時長）。開啟期間停止 `hunger`、`hydration`、`mood` 衰退與 `health` 連鎖扣減，不進行離線補算；玩家仍可開啟 App 查看寵物與互動，解除暫停後重新以解除當下之時間戳作為模擬起點。
- **環境情境動畫（不影響核心數值）：** 偵測到手機電量低於 20% 呈現打瞌睡、插線充電時呈現開心進食／充電特效，此類系統事件僅作為環境互動動畫，**不直接增減飽食度、水分或健康值**，避免玩家產生數值困惑。

## 4.3 肢體語言與圖示回饋 (MVP 無文字對話)

- **肢體優先：** 初期完全捨棄文字對話氣泡，依賴 2D 肢體動畫（8 種尾巴情緒指標、母雞蹲、貴妃躺、背對生氣等）與動態圖示（🐟、💧、❤️、💢、🏥）搭配貓叫音效表達情緒。

## 4.4 照護與商店探索系統

- **日常照護：** 每日免費提供基礎乾糧與過濾飲用水（0 積分、不設付費門檻，無限使用且不扣背包庫存，支援正常早晚多次登入與緊急救援補給食水）；以「每日一次登入之標準免費照護方案（3 份免費乾糧 + 4 份免費飲水 + 3 次摸頭與玩耍互動）」作為最低照護負擔基準，即足以長期維持貓咪基本健康，不得將免費照護設計成付費門檻，亦不得因未購買品牌商品而受到不可逆懲罰。
- **原生廣告商店：** 玩家累積積分後可選購一般罐頭／零食或品牌合作商品，點擊商品詳情可查看真實成分與營養分析；購買後的商品進入背包，由玩家自主選擇使用時機。

---

# 5. 技術架構與工程原則 (Monorepo + Platform Decoupling)

## 5.1 嚴格平台解耦與開發階段規範

1. **嚴格平台解耦 (Platform Decoupling)：** Game Core 必須為純 TypeScript 跨平台模組，所有時間、時區、隨機數、存檔、外部設定與平台資訊均透過依賴注入（Dependency Injection）或外部輸入提供，必須能在 Windows Node.js 環境獨立執行與測試。
2. **【Phase A 必須實作】：**
   - 純 TypeScript Game Core（`packages/game-core`）。
   - 跨模組型別契約（`packages/contracts`）。
   - 本機 Config Loader（讀取 `content/` 目錄及其子目錄中的版本化 JSON 設定檔，負責檔案讀取、完整性檢查與 Schema 驗證；Game Core 只接受已通過驗證的設定物件）。
   - `Clock`（含 `now()` 與 `getTimezoneOffsetMinutes()`）／`RandomGenerator` 依賴注入。
   - 防損 JSON 存檔（`.tmp` → 驗證 → `.bak` → 原子替換）。
   - Vitest 單元、整合及長時間模擬驗收測試。
   - 本機操作與可視化驗收介面（`apps/local-cli` 與 `apps/local-sandbox` 本機網頁測試看板，唯讀消費 `PetViewModel` 與發送 `GameCommand`）。
3. **【Phase A 預留介面】：**
   - `GameRepository` 介面。
   - `PetViewModel` 契約。
   - `GameEvent` 結構。
   - 商業化廠商商品匯入相容之 `food-catalog` 三區塊 Schema（見 §8.C.2）。
4. **【Phase A 不實作 / 後續階段】：**
   - 遠端設定檔下載及更新機制（Phase D 導入）。
   - Android WindowManager 原生模組。
   - iOS WidgetKit。
   - SQLite。
   - Google Drive 備份。
   - Firebase 串門子與社交信箱。
   - LLM API。
   - **明確禁止在 Game Core 內使用：** `window` / `document`（Browser 專屬）、`fs` / `path` / `process`（Node.js 專屬）、`Date.now()`（導致時間不可控）、依賴主機系統時區之 `new Date().getHours()` / `getTimezoneOffset()`、`Math.random()`（破壞固定 Seed 重現性）、React / React Native、Kotlin / Swift API 以及直接發起網路請求。
5. **設定檔外部載入與驗證 (Config Loader) 及商業化發佈架構：**
   - **Phase A（Windows 本機驗證）：** 僅實作本機 JSON 載入及 Schema 驗證（`config-loader` 直接讀取專案內 `content/` 目錄及其子目錄 `genetics/`、`traits/`、`behavior-rules/`、`products/` 之版本化靜態 JSON，執行 Schema 驗證後注入 Game Core），不實作遠端設定下載。Game Core 不負責讀取檔案或解析外部資料來源。
   - **Phase B ～ C：** 不要求實作 Remote Config Provider。
   - **Phase D（配合商店與品牌商品目錄導入）：** 實作 Remote Config Provider，必須支援遠端版本檢查（`manifest.json`）、設定檔下載、本機快取、Schema 驗證及載入失敗時的 Fallback 機制；遠端服務平台不預先指定（商業上線建議採靜態物件儲存＋CDN，例如 Cloudflare R2，且支援內部批次 CSV 與未來品牌商第三方 API 經審核管線匯入）：
     1. **玩家手機 App 嚴禁直接呼叫各品牌廠商之第三方 API**；廠商 API 或 CSV 須經拾暖匯入與平衡白名單驗證管線合併為簽核版靜態 JSON 發佈至 CDN。
     2. 遠端設定來源不得與 Game Core 耦合；Game Core 只接受已通過 Schema 驗證的設定物件。
     3. Remote Config Provider 負責處理遠端資料來源、版本檢查、下載及快取。
     4. 更換遠端 Provider 不得要求修改 Game Core 的遊戲規則或計算邏輯。
6. **離線優先 (Offline-first) 與免防作弊設計：** 個人陪伴養成無 PvP 與排行榜，不建置伺服器結算；僅保留存檔版本遷移（Migration）、格式防損驗證與本機每日領取防重機制。
7. **呈現與存檔分離：** 存檔僅保存基因、數值、記憶與時間戳，不儲存動畫影格；統一由 `BehaviorEngine` 輸出單一標準結構 `BehaviorDecision`，再由 `GameEngine` 轉換為跨平台唯讀契約 `PetViewModel` 交由各平台 Renderer 呈現。

## 5.2 技術選型與跨平台呈現契約 (PetViewModel)

| 架構層級 | 技術選型 | 開發階段與責任 |
| :---- | :---- | :---- |
| 遊戲核心 (100% 共用) | 純 TypeScript (`packages/game-core`) | **Phase A 必須實作。** 負責品種傳承、性格、需求與健康平衡、`TimeEngine`、`BehaviorEngine` 與經濟規則，零平台依賴。 |
| 設定載入與契約層 | TypeScript (`config-loader` / `contracts`) | **Phase A** 實作本機 JSON 載入、Schema 驗證與跨模組資料契約。遠端 Provider 配合商店與品牌商品目錄於 **Phase D** 導入（Phase B ～ C 不要求實作）。 |
| 本機驗證介面 | Node CLI (`apps/local-cli`) ＋ 本機 Web 測試看板 (`apps/local-sandbox`) | **Phase A** 隨各規格同步漸進實作，供 PO 直接開瀏覽器或終端機操作抽盲盒、快轉時間、逛商店與檢視長時模擬曲線，並提前驗證 `PetViewModel` 契約。 |
| 跨平台 UI 層 | React Native + TypeScript | **Phase B** 建立跨平台 UI 骨架，包含 App 主房間、領養、設定介面，以及商店與商品成分頁之靜態 UI Prototype（僅使用固定 Mock Data 驗證版面與動線，不含實際購買、積分與經濟結算）；正式商店功能（商品目錄、積分、購買、背包、商品探索任務與 Remote Config）統一於 **Phase D** 實作。 |
| Android 原生適配器 | Kotlin (`WindowManager`) | **Phase B** 驗證 Android 透明懸浮窗、生命週期管理、觸控拖曳、重力物理與系統電量事件回傳。 |
| iOS 原生適配器 | Swift / SwiftUI (`WidgetKit`) | **Phase B** 驗證桌面 Widget 狀態展示、App Intents 快捷操作佇列與 App Group 資料共享。 |
| 本機與雲端資料流 | JSON (Phase A) / SQLite (Mobile) | **Phase A** 使用防損 JSON 存檔；Mobile 階段導入 SQLite；後續才評估 Google Drive 個人備份與 Firebase 社交信箱。 |

**跨平台統一呈現契約 (`PetViewModel` Schema)：**  
平台端嚴禁自行計算需求或決定行為，一律唯讀消費 `PetViewModel` 完整欄位契約：

- `petId` (`string`)、`name` (`string`)、`microchipId` (`string | null`)、`appearance` (`PetAppearance`)
- `needs` (`{ hunger, hydration, mood, health }`)
- `behavior` (`{ animationId: AnimationId, tailState: TailState, iconIds: IconId[], soundId: SoundId | null, durationMs: number }`)（註：`interruptible` 與 `cooldownMs` 僅供 Game Core 內部狀態機仲裁，不拋出給 ViewModel）
- `display` (`{ isSleeping: boolean, isHealthCritical: boolean, recoveryState: RecoveryState, isCarePaused: boolean }`)（其中 `isSleeping = (behavior.animationId === "sleep")`；`isHealthCritical = (pet.health < 40)`；`recoveryState = pet.recoveryState`；`isCarePaused = pet.isCarePaused`）
- `updatedAt` (`number`，Unix timestamp ms)

## 5.3 Monorepo 專案目錄結構

本專案正式 Repository 名稱為 `shinuan`，本機專案根目錄及 GitHub Repository 均以 `shinuan/` 為根目錄。以下為專案完整目標目錄結構，各目錄依照 Phase A、Phase B 及 Future Phase 逐步建立，不要求初期一次建立所有目錄或實作所有功能：

- **`shinuan/`（根目錄）**
  - `.gitignore`、`AGENTS.md`、`CLAUDE.md`、`ROADMAP.md`、`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`tsconfig.base.json`、`vitest.config.ts`
  - **`.claude/agents/`：** `architect.md`、`developer.md`、`qa.md`、`reviewer.md`
  - **`.github/`：** `copilot-instructions.md`
  - **`docs/`：** `PRD/`、`specs/`、`architecture/`、`decisions/`、`acceptance/`（另含本機未版控保護區 `PO-step-by-step/`）
  - **`scripts/`：** Repo 完整性、PRD 保護與 Game Core 純淨度自動檢核腳本
  - **`packages/`：**
    - `game-core/`：純 TypeScript 遊戲核心（`domain/`、`engine/`、`ports/`）
    - `contracts/`：跨模組資料契約（Command、Event、ViewModel、Save Schema、Config Schema）
    - `config-loader/`：設定檔載入與 Schema 驗證模組
  - **`apps/`：**
    - `local-cli/`：Phase A Windows 本機 CLI 測試介面
    - `local-sandbox/`：Phase A 本機網頁可視化驗收看板（消費 `PetViewModel`）
    - `mobile/`：React Native 手機端專案（Phase B 建立：`android/`、`ios/`、`src/`）
  - **`content/`：** 版本化靜態設定檔（`genetics/`、`traits/`、`behavior-rules/`、`products/`）
  - **`assets/`：** 貓咪圖層素材、動畫、圖示與音效（依 Phase B 需求逐步建立）
  - **`tests/`：** `unit/`、`integration/`、`simulation/`、`fixtures/`
  - **`test-results/`：** 測試執行結果與模擬輸出摘要（過程暫存另置於外部 Dropbox 任務目錄，不汙染主 Repo）

### 目錄用途及開發階段說明

1. **根目錄工程設定：** `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`tsconfig.base.json`、`vitest.config.ts`、`.gitignore`（強制包含 `/docs/PO-step-by-step/`）、`AGENTS.md`、`CLAUDE.md`、`ROADMAP.md`。
2. **AI Agent 設定：** `.claude/agents/`（SHIZHAN 公司基準＋拾暖產品附加規則）、`.github/copilot-instructions.md`。
3. **文件管理：** `docs/PRD/`（唯一正式產品需求文件 `.md`，納入 Git 版控）、`docs/specs/`（大／中／小規格拆解地圖）、`docs/architecture/`、`docs/decisions/`（ADR）、`docs/acceptance/`。
4. **核心套件 (`packages/`)：** `game-core/`、`contracts/`、`config-loader/`。
5. **應用程式 (`apps/`)：** Phase A 建立 `local-cli/` 與 `local-sandbox/`；Phase B 建立 `mobile/`。
6. **設定與素材 (`content/` 與 `assets/`)：** `content/` 放置版本化靜態設定檔（Config Loader 載入範圍須涵蓋 `genetics/`、`traits/`、`behavior-rules/`、`products/` 等子目錄，不得僅掃描根目錄）；`assets/` 依 Phase B 需求建立。
7. **測試管理（測試程式與測試結果分離）：** 統一於根目錄 `tests/` 保存可執行 Vitest 測試程式碼（`unit/`、`integration/`、`simulation/`、`fixtures/`）；過程性 QA 報告與交接包依拾戰 MOS v0.3 保存於外部 Dropbox 任務目錄，不塞入主 Repo。
8. **Phase A 初期目錄建立範圍：** 優先建立根目錄工程設定、`packages/`、`apps/local-cli/`、`apps/local-sandbox/`、`content/`、`tests/`、`scripts/`、`docs/` 及 AI 規範。`apps/mobile/` 與 `assets/` 依 Phase B 階段建立，不得提前擴大 Phase A 範圍。

## 5.4 AI 協作與工程管理規範（銜接拾戰 AI Studio 公司治理制度）

### 5.4.1 公司治理銜接原則

本專案屬 **拾戰 AI Studio（SHIZHAN）** 旗下產品，正式導入拾戰已核准生效之公司級治理制度（`P-08 v0.3`、`GOV-003 v0.1`、`MOS v0.3`），同時**完整保留拾暖產品專屬加嚴保護規則**：

- **任務管理與交付流：** 採 GitHub Issues ＋ Branch ＋ PR 工作流（取代早期手動搬移 `tasks/` 檔案之舊制）；本機安裝 `.git/hooks/pre-push` 防止直推 `master`；Merge 維持 PO 親自核准（R3-A）。
- **三模型分工閉環：** Claude Code（核心 Developer ＋ Fallback 深度 QA）→ GitHub Copilot Free 主視窗（獨立 `git worktree` QA）→ Gemini（規格拆解／規劃協調／獨立 Reviewer 子代理），採 Dropbox 共用目錄檔案交接與對話 3 行短回報控管 Token 成本。
- **能力誠實標示：** 所有驗證與隔離狀態嚴格區分 `VERIFIED` / `PARTIALLY VERIFIED` / `UNVERIFIED` / `UNAVAILABLE`。

### 5.4.2 角色與職責

1. **PO (Product Owner)：** 負責產品需求、功能優先順序、範圍決策與 PR 最終合併核准；核准核心數值、規則及重大架構變更；負責最終驗收。
2. **規劃／協調顧問（Gemini 主對話）與 AI Manager（Claude）：** 依任務拆解大／中／小規格、撰寫自足派工包、追蹤 Issue／PR 與交付證據；嚴禁子代理間上下文汙染。
3. **Architect (架構師)：** 負責跨模組邊界、資料契約與重大技術方案分析；重大決策以 Proposed 提交 PO 核准。
4. **Developer (工程師)：** 依核准之小規格與派工包於任務分支實作程式碼、設定與測試，建立 PR（不自行 Merge），並聲明開發自測不等於 QA 獨立驗收。
5. **QA (獨立品質驗證)：** 於獨立 `git worktree` 針對 PR head commit 獨立執行 Vitest 與邊界測試，輸出可追溯報告並判定 `PASS` / `FAIL` / `INCOMPLETE`；不得修改正式 Game Core 程式碼或調整 PRD 預期值。
6. **Reviewer (獨立審查者)：** 以乾淨獨立上下文審查 PR diff、PRD 符合性、禁區保護與 QA 證據，判定 `APPROVED` / `CHANGES REQUESTED`。

### 5.4.3 拾暖產品專屬變更保護紅線（不可放寬）

1. **Protected PO Notes 絕對禁區：** `docs/PO-step-by-step/` 為 PO 個人筆記保護區，未經 PO 逐次明確授權嚴禁任何讀取、列舉、搜尋、雜湊或 Git 操作；`.gitignore` 必須永久保留 `/docs/PO-step-by-step/`。
2. **PRD 數值保護：** AI Agent 不得自行修改已核准的核心遊戲數值、公式、基因機率、健康保護規則與驗收預期值；規格不明確或衝突時立即停止並提交 PO 判定。
3. **Game Core 平台純淨度保護：** `packages/game-core` 嚴禁引入平台 API、檔案系統、系統時鐘／時區與非注入亂數。
4. **依賴套件保護：** 安裝、移除或更新依賴套件前須經任務授權。
5. **測試獨立性：** Developer 自測不能取代獨立 QA 驗收；QA `PASS` 且 Reviewer `APPROVED` 後方得提交 PO 合併。

---

# 6. 長期留存與防流失機制 (User Retention)

1. **破壞第四面牆的情境彩蛋：** 偵測深夜使用手機時，寵物做出催促睡覺的肢體反應（打哈欠、指著時鐘圖示），且不阻止玩家主動互動。
2. **動態偏好與挑食機制：** 寵物偶爾對單一食物失去新鮮感，引導玩家探索商店內其他商品與成分。
3. **照護暫停保護機制 (Care Pause)：** 針對忙碌或出差玩家提供無懲罰的暫停衰退保護，維持零壓力陪伴定位。
4. **微型月卡與送養重置機制（商業驗證後導入）：** 月卡定位為純裝飾與便利（如專屬房間背景、特殊動畫、照護歷史紀錄），絕不將「避免寵物受苦」作為付費門檻；送養重置須經二次確認，重置目前寵物養成狀態但保留全域設定與已解鎖圖鑑。

---

# 7. 開發與實作路線圖 (Windows 核心驗證 ➔ 雙平台 MVP)

- **Phase A：Windows Local Core Prototype（第一優先，0 手機環境依賴）**
  - 建立 Monorepo、`packages/game-core`、`contracts`、`config-loader`（Local 模式）、`apps/local-cli` 與 `apps/local-sandbox` 本機網頁可視化驗收看板。
  - 實作基因生成、三層行為決策、0.25 小時步進之精確交點時間模擬、健康救援狀態機、經濟與防損 JSON 存檔（`.tmp` 寫入驗證與 `.bak` 備份），並通過 Vitest 單元、整合與 365 天長時模擬測試。
- **Phase B：Renderer Proof of Concept（渲染與跨平台骨架驗證）**
  - 建立單隻「測試貓」與最少必要動畫（`idle`、`walk`、`sit`、`sleep`、`eat`、`pet`）（對應 §8.B.3 之 P0-B；`cat_loaf` 與 `play` 延至 Phase C），驗證 7 大圖層換裝相容性。
  - 同步驗證 React Native 畫面、Android Kotlin 懸浮窗與 iOS SwiftUI Widget 讀取同一份 `PetViewModel` 的一致性後，再正式選定動畫引擎（Spine 2D / Rive / Sprite Sheet）。（商店與商品成分頁於本階段僅以固定 Mock Data 製作靜態 UI Prototype，不含購買與經濟結算，正式商店功能留待 Phase D）。
- **Phase C：Pet MVP（雙平台單貓陪伴上線）**
  - 開放領養（MVP 限制單一帳號飼養一隻貓，確保模擬與懸浮窗體驗穩定）、7 層外觀生成、基礎性格與互動、完整需求與健康循環、SQLite 存檔與版本遷移（Migration）。
- **Phase D：商店與內容型原生廣告驗證**
  - 上線積分系統、商品背包、商店與「成分與營養分析」詳情頁，導入 Remote Config（CDN 靜態發佈）與商品批次／品牌商第三方 API 匯入審核管線，放入 5～10 款模擬與合作品牌商品，驗證玩家探索意願與留存數據。
- **Phase E：長期陪伴、社交與終極 LLM 願景**
  - 依序擴充 Google Drive 個人雲端備份、Firebase 好友串門子、計步與戶外散步、回憶相簿；待留存與商業模式成熟後，於最後階段接入 LLM API（僅讀取性格與記憶進行語言表達，搭配 BYOK 或對話券控管成本）。

---

# 8. 系統細部規格展開 (PM & RD 開發基準)

## 8.A 貓咪基因與圖鑑設定表 (Trait Inheritance Spec)

### 8.A.1 完整寵物與基因資料模型 (PetState & PetGenetics Schema)

1. **`PetGenetics`（生成後永久鎖定，隨版本升級不得重算）：**
   - `seed` (`string`)：生成該貓咪時使用的隨機種子（轉換為 `mulberry32-v1` 32-bit 無號整數時，全專案統一使用 **FNV-1a 32-bit** 雜湊演算法）。
   - `prngAlgorithmVersion` (`string`)：偽隨機數演算法識別碼（如 `"mulberry32-v1"`）。
   - `geneticsVersion` (`string`)：遺傳邏輯版本號（如 `"1.0.0"`）。
   - `rulesVersion` (`string`)：品種與相容性設定檔版本號（如 `"v1"`）。
   - `fatherBreed` / `motherBreed` (`BreedId`)：父母品種識別碼。
   - `fatherPetId` / `motherPetId` (`string | null`)：父母貓咪之系統識別編號（對應父母的 `PetState.id` 或 `PresetParentCat.parentId`，生成後永久鎖定供未來族譜追溯；純品種池模式領養誕生時預設為 `null`）。
   - `gender` (`"male" | "female"`，v2.1.30 選填增量，個體父母模式必填)：貓咪性別。
   - `coatGenotype` (`CoatGenotype`，v2.1.30 選填增量，個體父母模式必填)：7 基因座＋銀金漸層抑制之真實毛色基因型。
   - `easterEggs` (`readonly GeneticsEasterEggId[]`，v2.1.30 選填增量)：誕生時觸發之遺傳彩蛋識別陣列（如 `rare_male_calico`、`rare_male_tortoiseshell`）。
   - `appearance` (`PetAppearance`)：最終確定的 7 大圖層 ID 與 `colorParams`（唯一渲染依據），其中 `colorParams` 結構固定為：
     ```ts
     interface ColorParams {
       primaryHex: string;         // 調整後主毛色 HEX（如 "#E89246"）
       secondaryHex: string | null; // 調整後重點色／輔色 HEX（無輔色時為 null）
       lightnessDelta: number;     // HSL 明度微調係數，範圍 [-0.08, +0.08]
       saturationDelta: number;    // HSL 飽和度微調係數，範圍 [-0.08, +0.08]
     }
     ```
2. **`PetState`（主存檔核心實體）：**
   - `id` (`string`)：每隻貓咪出生時即核發之系統唯一識別編號 (UUID，永久不變)。
   - `name` (`string`)：貓咪名稱（1～12 字元）。
   - `microchipId` (`string | null`)：寵物晶片號碼（對應現實寵物晶片，採 ISO 11784 15 碼格式預留；領養誕生時預設為 `null`，保留日後「帶去獸醫院打晶片」或「飼主手動登錄自家真貓晶片號」之儀式感；寫入後永久鎖定，不隨改名或版本升級遺失）。
   - `ageInDays` (`number`)：遊戲累計天數（預設 `0`）。
   - `growthStage` (`"kitten" | "young" | "adult" | "senior"`)：外觀成長階段（MVP 固定為 `"adult"`）。
   - `genetics` (`PetGenetics`)：不可變遺傳與外觀資料。
   - `basePersonality` (`object`)：基礎人格數值（`0~100`）：`affection`（親人）、`laziness`（慵懶）、`tsundere`（傲嬌）、`curiosity`（好奇）。
   - `quirks` (`QuirkId[]`)：小怪癖 ID 陣列（最多 2 個）。
   - `discoveredQuirks` (`QuirkId[]`，v2.1.30 選填增量，預設 `[]`)：玩家已於陪伴互動中發現並解鎖顯示的小怪癖子集（領養預覽與剛領養時為空，不提前暴雷）。
   - `memories` (`object`)：行為統計記憶（`totalPets`、`totalPlays`、`foodCategoryCounts`、`dailyBuckets: Record<string, { pets: number; plays: number; wetFoods: number; premiumFoods: number; totalInteractions: number }>`，保留最近 30 個本地日期 `YYYY-MM-DD` 鍵值，超過 30 日自動滾動清理）。計算時機：每次執行有效互動指令（`FeedPet`、`DrinkWater`、`PetCat`、`PlayWithPet`）後立即重算 `basePersonality`；每次開啟 App 跨日結算時亦重算一次。
   - `needs` (`object`)：即時需求數值（嚴格限制 `0~100`）：`hunger`（飽食）、`hydration`（水分）、`mood`（心情）。
   - `health` (`number`)：健康值（嚴格限制 `10~100`，設 `10` 為保護下限）。
   - `recoveryState` (`"NORMAL" | "CRITICAL" | "RECOVERY_BOOST" | "NATURAL_RECOVERY"`)：健康狀態機階段。
   - `recoveryBoostAccumulatedHours` (`number`)：當前救援週期已累積之有效加速恢復時數（上限 `2.0` 小時）。
   - `lowMoodDuration` (`{ below40Hours: number; below20Hours: number }`)：連續低心情持續時間（小時），隨存檔持久化以防重啟重置。
   - `isCarePaused` (`boolean`)：照護暫停保護開關（預設 `false`）。
   - `coins` (`number`)：持有積分（開局預設 `200`，不得為負數）。
   - `inventory` (`Record<ItemId, number>`)：背包物品數量表（免費品不列入庫存扣減）。
   - `lastSimulatedAt` (`number`)：最後模擬結算 Unix 時間戳 (ms)（時間單一權威來源）。

### 8.A.2 初期收錄 6 大基礎品種初始特徵池 (`breeds.v1.json`) 與變異分布

1. **權重池配置與稀有突變分布 (`traits.v1.json`)：**
   - 各品種在七大圖層上的預設候選池規則如下：`coatPattern`（花色圖層）具 70% 主花色 / 30% 次花色雙候選池（米克斯 `tabby_mackerel` 70% / `calico` 30%、曼赤肯 `bicolor_tuxedo` 70% / `calico` 30%、布偶 `colorpoint` 70% / `bicolor_tuxedo` 30%、英短 `solid` 70% / `tabby_mackerel` 30%、異國 `tabby_mackerel` 70% / `colorpoint` 30%、緬因 `tabby_mackerel` 70% / `tortoiseshell` 30%）；其餘 6 大圖層（`head`、`ears`、`eyes`、`pupilColor`、`tail`、`body`）各品種預設為 100% 品種代表特徵（如下表完整定義）。
   - 第二階段變異路徑：設有稀有突變之 4 個圖層（`ears: "folded_tip"`、`pupilColor: "heterochromia_blue_gold"`、`coatPattern: "starry_rare"`、`tail: "kinked_kirin"`），在進入變異路徑時，**75%** 從該圖層合法通用特徵白名單等權重隨機抽取、**25%** 觸發該圖層之稀有突變；未設有稀有突變之 3 個圖層（`head`、`eyes`、`body`），變異路徑 **100%** 從該圖層合法通用特徵白名單等權重隨機抽取。

| 品種 ID (`BreedId`) | 顯示名稱 | 初始預設特徵池 (Trait Pool - 七層完整定義) | 基礎性格傾向 (0~100) | 合法毛色 HEX 色碼區間 (Shader 基準) |
| :---- | :---- | :---- | :---- | :---- |
| `domestic` | 米克斯 | `head: standard_round`, `ears: pointed_medium`, `eyes: almond`, `pupilColor: amber`, `coatPattern: tabby_mackerel`, `tail: long_straight`, `body: normal` | 親人 60 / 慵懶 50 / 傲嬌 50 / 好奇 80 | 橘 `#E68A3E~#F5C284`、虎斑 `#6E5D4F~#A89888`、黑 `#2B2B2B`、白 `#F8F8F8` |
| `munchkin` | 曼赤肯 | `head: standard_round`, `ears: small_round`, `eyes: big_round`, `pupilColor: copper`, `coatPattern: bicolor_tuxedo`, `tail: long_straight`, `body: short_legs` | 親人 75 / 慵懶 45 / 傲嬌 40 / 好奇 85 | 乳白 `#F5E6D3`、三花混色 `#D98245` + `#333333`、藍灰 `#7A8591` |
| `ragdoll` | 布偶貓 | `head: standard_round`, `ears: pointed_medium`, `eyes: big_round`, `pupilColor: sapphire`, `coatPattern: colorpoint`, `tail: fluffy_plume`, `body: large_fluffy` | 親人 90 / 慵懶 75 / 傲嬌 20 / 好奇 50 | 奶油白底 `#FAF5EE` 搭配海豹重點色 `#4A3728` 或藍重點色 `#6B7A8F` |
| `british_shorthair` | 英國短毛貓 | `head: chubby_round`, `ears: small_round`, `eyes: big_round`, `pupilColor: copper`, `coatPattern: solid`, `tail: short_bobtail`, `body: chubby` | 親人 55 / 慵懶 85 / 傲嬌 65 / 好奇 40 | 經典藍灰 `#6C7680~#8C96A0`、銀漸層 `#D8DEE3`、金漸層 `#D9A760` |
| `exotic` | 異國短/長毛 (加菲/喜馬拉雅) | `head: flat_face`, `ears: small_round`, `eyes: big_round`, `pupilColor: copper`, `coatPattern: tabby_mackerel`, `tail: short_bobtail`, `body: chubby` | 親人 70 / 慵懶 80 / 傲嬌 55 / 好奇 45 | 橘紅 `#D97236`、奶油重點色 `#F2E4D5` + 巧克力重點 `#5C4033` |
| `maine_coon` | 緬因貓 | `head: square_muzzle`, `ears: tufted_large`, `eyes: almond`, `pupilColor: emerald`, `coatPattern: tabby_mackerel`, `tail: fluffy_plume`, `body: giant_fluffy` | 親人 80 / 慵懶 50 / 傲嬌 35 / 好奇 75 | 棕虎斑 `#594636~#8C735B`、煙燻黑 `#3A3D40`、紅虎斑 `#C86D3B` |

### 8.A.3 七大外觀圖層枚舉與確定性相容修正規則 (`appearance-compatibility.v1.json`)

1. **七大圖層枚舉：**
   - `head`：`standard_round`、`chubby_round`、`flat_face`、`square_muzzle`
   - `ears`：`pointed_medium`、`small_round`、`tufted_large`、`folded_tip`（稀有突變）
   - `eyes`：`almond`、`big_round`、`droopy_cute`
   - `pupilColor`：`amber`、`emerald`、`sapphire`、`copper`、`heterochromia_blue_gold`（稀有突變）
   - `coatPattern`：`solid`、`tabby_mackerel`、`bicolor_tuxedo`、`colorpoint`、`calico`、`tortoiseshell`、`starry_rare`（稀有突變）
   - `tail`：`long_straight`、`fluffy_plume`、`short_bobtail`、`kinked_kirin`（稀有突變）
   - `body`：`normal`、`chubby`、`short_legs`、`large_fluffy`、`giant_fluffy`
2. **確定性相容修正規則 (`appearance-compatibility.v1.json`)：**
   - **執行順序與單次循序套用規範：** 固定依序執行 **規則 1 ➔ 規則 2 ➔ 規則 3**（單次循序執行，不反覆迴圈重跑）。前一條規則修正後的外觀狀態直接作為下一條規則的判斷輸入（例如同時出現 `head === "flat_face"`、`body === "giant_fluffy"`、`ears === "folded_tip"` 時，先由規則 1 將 `body` 修正為 `"chubby"`，後續檢查規則 3 時因 `body` 已非 `"giant_fluffy"` 而不再觸發）；若多條規則依序檢查時均符合條件，則全部依序執行。規則 1 ➔ 2 ➔ 3 執行完畢後進行最終合法性檢查（確認七大圖層皆為合法枚舉且不再違反規則 1～3），若仍不合法才觸發規則 4 回退 `SAFE_DEFAULT_APPEARANCE`。
   - **規則 1（跨圖層：扁臉與大型骨架比例衝突）：** 若 `head === "flat_face"` 且 `body === "giant_fluffy"`，為避免扁臉搭配巨型緬因骨架比例失真，強制將 `body` 修正為 `"chubby"`。
   - **規則 2（跨圖層：重點色與花色遮罩衝突）：** 若 `coatPattern === "colorpoint"` 且 `pupilColor === "amber"`，強制將 `pupilColor` 修正為 `"sapphire"`。
   - **規則 3（跨圖層：稀有折耳與緬因大耳羽衝突）：** 若 `ears === "folded_tip"` 且 `body === "giant_fluffy"`，強制將 `ears` 修正為 `"tufted_large"`。
   - **規則 4（終極安全回退 `SAFE_DEFAULT_APPEARANCE`）：** 若經過單次規則替換後最終驗證仍不合法，直接退回完整七層安全預設組合 `SAFE_DEFAULT_APPEARANCE`：`{ head: "standard_round", ears: "pointed_medium", eyes: "almond", pupilColor: "amber", coatPattern: "solid", tail: "long_straight", body: "normal" }`。
   - *註：未來若開放其他遺傳組合產生 `flat_face + giant_fluffy`，維持 `body` 修正為 `"chubby"` 以確保比例協調。*

### 8.A.4 遺傳生成執行優先級 (Genetics Priority)

為避免特殊骨架規則與一般圖層抽選衝突，強制規定執行順序（全程依固定順序消費同一個 `RandomGenerator` 實例）：

1. **步驟 1（特殊顯性骨架規則優先，僅作用於指定圖層；`body` 與 `head` 均為單一合法枚舉值）：**
   - **曼赤肯 (`munchkin`) `body` 規則：**
     - 若父母雙方皆為 `munchkin`（雙親同種純種品種貓）：子代 `body` 為 **90%** `short_legs` / **10%** `normal`。
     - 若僅一方為 `munchkin`（跨品種配對）：子代 `body` 為 **50%** `short_legs` / **25%** 另一方品種之 `body`（若另一方為 `maine_coon` 則為 `giant_fluffy`，三項互斥合計 100%） / **25%** `normal`。
   - **異國短／長毛 (`exotic`) `head` 規則：**
     - 若父母雙方皆為 `exotic`（雙親同種純種品種貓）：子代 `head` 為 **90%** `flat_face` / **10%** `standard_round`。
     - 若僅一方為 `exotic`（跨品種配對，含與 `domestic` 或其他品種配對）：子代 `head` 為 **60%** `flat_face` / **40%** 另一方品種之 `head`。
2. **步驟 2（一般圖層獨立抽選）：** 其餘未鎖定圖層依固定順序（`head` ➔ `ears` ➔ `eyes` ➔ `pupilColor` ➔ `coatPattern` ➔ `tail` ➔ `body`）逐一獨立抽選：
   - **雙親同種純種品種貓**（`fatherBreed === motherBreed && fatherBreed !== "domestic"`）：**90%** 繼承該品種預設特徵、**10%** 變異路徑。
   - **米克斯 ＋ 純種品種貓**（一方為 `domestic`，另一方為非 `domestic`，不論父／母順序）：**30%** 米克斯預設特徵、**50%** 品種貓預設特徵、**20%** 變異路徑。
   - **其他配對**（不同純種品種貓跨配，或雙親皆為 `domestic`）：**40%** 父系預設特徵、**40%** 母系預設特徵、**20%** 變異路徑。
   - 進入變異路徑時：設有稀有突變之 `ears`、`pupilColor`、`coatPattern`、`tail` 四層為 75% 該圖層通用白名單等權重重組、25% 觸發該圖層稀有突變；無稀有突變之 `head`、`eyes`、`body` 三層為 100% 該圖層通用白名單等權重重組。
3. **步驟 3（確定性相容性修正）：** 依 §8.A.3 固定順序（規則 1 ➔ 規則 2 ➔ 規則 3）執行單次循序衝突替換與最終合法性驗證（未通過則依規則 4 回退 `SAFE_DEFAULT_APPEARANCE`）。
4. **步驟 4（動態毛色微調 `colorParams`）：**
   - 先決定採用的品種色盤：同品種採該品種色盤（100%）；米克斯 ＋ 純種品種貓為 **30%** 米克斯色盤 / **70%** 品種貓色盤；其他跨品種為 **50%** 父方色盤 / **50%** 母方色盤。
   - 從選定品種之合法毛色色盤清單等權重抽出一組色碼（若為區間色則於區間內線性插值取基準色），再於 HSL 空間對明度與飽和度各自進行確定性 `±8%` 微調，寫入 `colorParams`。
5. **步驟 5（小怪癖獨立抽選）：** 於步驟 1～4 全部完成後，才以同一 `RandomGenerator` 依 §3.2 規則抽出 `quirks`（50% 0 個 / 35% 1 個 / 15% 2 個），確保不改變既有外觀結果。

### 8.A.5 個體父母貓、真實 7 基因座毛色遺傳與一胎 3～5 隻領養規範 (`preset-parents.v1.json`，v2.1.30 新增)

本節定義正式領養體驗之「具體父母選配＋一胎 3～5 隻」增量規則，與 §8.A.4 純品種模式雙軌並存，**不修改既定純品種 API 與 `TC-01`/`TC-02` 驗收基準**：

1. **資料驅動父母池（`content/genetics/preset-parents.v1.json`）：**
   - 父母候選貓之名字、隻數、外觀圖層與 `CoatGenotype` 一律由外部設定檔驅動，**不寫死於本 PRD 或程式碼**，隨時可自由增刪調整並由 `config-loader` 執行通用不變量驗證：
     - `parentId` 全表唯一且非空；`breedId` 為合法 6 品種之一；6 品種各自至少包含 1 隻公貓（`male`）與 1 隻母貓（`female`）。
     - 內定公貓（`gender === "male"`）禁止配置 `coatPattern === "calico"` 或 `"tortoiseshell"`（對齊真實貓咪 X 染色體遺傳）。
     - 每隻父母之 7 層外觀不含 4 項稀有突變，且不得違反 §8.A.3 相容規則 1～3。
   - **呈現與來源契約：** 系統父母預設 `portraitAssetId: null`，由平台端複用 7 層 2D 貓咪渲染器＋`colorParams` 即時換色繪製（皮克敏式選色球，零額外父母立繪美術成本）；每筆資料預留 `sourceType: "system" | "influencer_ip" | "rescue_shelter"` 與選填 `sourceMeta`（Phase A 全為 `"system"`，暫緩商業繁殖貓舍合作，保留未來網紅貓 IP 與動保中途待領養真貓免費公益合作介面）。
2. **一胎 3～5 隻數量分布與獨立 Seed 派生：**
   - 輸入已驗證之爸爸（`male`）、媽媽（`female`）與 `litterSeed`：以 `litterRng` 抽 1 次決定每胎隻數 — **3 隻 `30%`（`< 0.30`）、4 隻 `40%`（`< 0.70`）、5 隻 `30%`（`>= 0.70`）**。
   - 同胎第 `i` 隻小貓固定派生獨立種子 `kittenSeed = "${litterSeed}#kitten-${i}"`，各自獨立初始化 `mulberry32-v1` PRNG 執行遺傳生成，並永久寫入 `fatherPetId = fatherParent.parentId`、`motherPetId = motherParent.parentId`。
3. **真實貓咪毛色 7 基因座孟德爾遺傳與公三花 XXY 彩蛋（E1）：**
   - **子代性別：** 每隻小貓獨立 `50%` 公（`male`）／`50%` 母（`female`）。
   - **X 染色體橘色基因（`O / o`）與 E1 彩蛋：**
     - 母貓（`XX`）固定以 `50/50` 隨機傳遞 1 條 X（`momO`）。
     - **母寶（`female`）：** 自爸爸取其唯一 X 與 `momO` 組成 `[dad.O, momO]`（一 `O` 一 `o` 即表現三花／玳瑁）。
     - **公寶（`male`）：** 當雙親具備雙色基因來源（母為 `O/o`，或爸媽 X 色系互補）時，以 **`2%`** 機率觸發罕見 **XXY 彩蛋**（`orange = ['O', 'o']`，依白斑表現為 `rare_male_calico` 或 `rare_male_tortoiseshell`，UI 須明確向玩家彈出幸運彩蛋祝賀）；其餘 **`98%`** 為正常 XY 公寶（`orange = [momO]`，因此三花／玳瑁母貓生出之公寶自然拆色為 **50% 橘系／50% 非橘系**）。
   - **常染色體 7 基因座（`B/b` 黑／巧克力、`D/d` 濃色／稀釋、`A/a` 虎斑／純色、`C/cs` 全色／重點色、`S/s` 白斑、`W/w` 顯性純白、`I/i` 銀金漸層抑制）：** 每座各自以標準孟德爾 `50/50` 自父、母各取 1 個等位基因組合；並依生物學上位效應（`W` 顯性純白遮罩 > `cs/cs` 重點色〔`S/-` 確定性對應 `bicolor_tuxedo` 雙色重點、`s/s` 對應 `colorpoint` 經典重點〕 > `O/o` 三花／玳瑁 > `O` 橘色上位虎斑 > `o` 黑巧藍丁香搭配 `I/i` 漸層）確定性映射為最終 `coatPattern` 與標準基準 HEX，再套用 §8.A.4 步驟 4 之 HSL `±8%` 微調（含無彩色保護）。
   - **真實貓咪眼色遺傳規則（`pupilColor`，依毛色阻斷基因優先序＋多基因虹膜黑色素光譜）：**
     1. **重點色 `cs/cs`（無 `W` 遮罩）：** 虹膜色素受溫度敏感白化抑制，**100% 表現藍眼（`sapphire`）**。
     2. **顯性純白 `W/-`：** 黑色素細胞遷移隨機受阻，自然分布為 **`35%` 雙眼藍眼（`sapphire`）、`15%` 藍金異色瞳（`heterochromia_blue_gold`）、`50%` 底層多基因虹膜色**。
     3. **帶白斑 `S/-`（非 `W/-` 且非 `cs/cs`）：** 白斑偶爾延伸至虹膜，自然分布為 **`5%` 藍眼（`sapphire`）、`5%` 藍金異色瞳（`heterochromia_blue_gold`）、`90%` 底層多基因虹膜色**。
     4. **一般無白貓（`w/w`、`C/-`、`s/s`）：** **100% 走底層多基因虹膜黑色素光譜**（不無端出現藍眼或異色瞳）。
     5. **底層多基因虹膜黑色素光譜（`irisPigment: 0 | 1 | 2` 對應 `emerald=0` 淺綠、`amber=1` 琥珀黃、`copper=2` 深古銅）：** 取雙親底層色素平均 `avg = (dadIris + momIris) / 2`，加上多基因自然浮動（`25%` 偏淺 `-0.5`、`50%` 維持 `0`、`25%` 偏深 `+0.5`），四捨五入並 Clamp 於 `{0, 1, 2}` 映射為 `emerald`／`amber`／`copper`（同源父母可於 JSON 各自配置真實眼色，例如銀／金漸層為 `0` 祖母綠、米克斯為 `1` 琥珀、藍灰英短與加菲為 `2` 古銅）。
   - **骨架與稀有奇幻突變沿用：** 步驟 1 特殊骨架（曼赤肯、加菲）、步驟 2 非毛色與非眼色形狀圖層（`head`、`ears`、`eyes`、`tail`、`body`）來源權重（90/10、30/50/20、40/40/20；繼承父母時直接取該父母具體圖層特徵）、3 項形狀／奇幻稀有突變（`folded_tip`、`kinked_kirin` 與 `starry_rare` 星空斑紋覆寫花紋但保留真實遺傳底色；`heterochromia_blue_gold` 改由上述 `W/-` 與 `S/-` 真實眼色規則產生）、步驟 3 相容規則 1～4、步驟 5 小怪癖抽取與 §3.2 初始 `breedBase` 公式全部沿用。
4. **領養預覽怪癖遮罩契約：**
   - 領養預覽物件（`AdoptionKittenPreview`）僅提供 `hasHiddenQuirks: boolean`（`quirks.length > 0`），嚴禁向預覽 UI 曝露 `quirks` 陣列內容與數量。
5. **R1 每日免費繁育上限與帳號總免費擁有上限：**
   - **R1 防短時間盲抽：** 每個本地日曆日最多免費繁育 **`3` 胎**（記錄於 `DailyLimits.littersGeneratedToday` 與 `lastLitterGeneratedAt`，受既有本地日期與防時鐘回撥保護）。當玩家放棄本胎換下一胎前，須明確提示 **「此胎貓咪將由其他玩家領養」** 以喚醒珍視感；用完第 3 胎時鎖定換下一胎，但保留當日最後一胎（3～5 隻）供玩家直接領養，不卡死新手。
   - **帳號總免費擁有上限（`AdoptionSlotPolicy`）：** 改以玩家帳號**總擁有貓咪數**控管（`totalAllowedPets = maxFreeOwnedPets + purchasedExtraPetSlots`；MVP 預設 `maxFreeOwnedPets = 1`、`purchasedExtraPetSlots = 0`，架構支援設為 `n` 並於未來階段提供付費解鎖額外領養名額）；確認領養且本胎仍有未選中小貓時，提示 **「若此次放棄多領養，其餘兄弟姊妹將被其他玩家領養」**。

---

## 8.B 動畫與行為決策仲裁規格 (BehaviorEngine & FSM Spec)

### 8.B.1 行為決策引擎優先級、同級仲裁與中斷規則

`BehaviorEngine` 輸出單一標準結構 `BehaviorDecision`（`animationId`、`tailState`、`iconIds: string[]`、`soundId`、`durationMs`、`interruptible`、`cooldownMs`）。

**Phase A 完整 `GameCommand` 指令聯集：** `FeedPet`、`DrinkWater`、`PetCat`、`PlayWithPet`、`PokePet`、`TriggerLanding`、`ToggleCarePause`、`ClaimDailyCheckIn`、`OpenShop`、`InspectProduct`、`BuyItem`。其中 `DrinkWater` 預設使用 `free_fresh_water`，與 `FeedPet`（使用乾糧／主食罐／零食）清楚分工並對齊 §8.E.2 `TC-09`。

| 優先級 | 狀態類別 | 觸發條件（嚴格運算符） | 行為輸出（主動畫 / 尾巴 / 圖示陣列） | 同級仲裁、持續與中斷規範 |
| :---- | :---- | :---- | :---- | :---- |
| **100** | 緊急生理求救 (`CRITICAL_NEEDS`) | `health < 30` 或 `hunger < 15` 或 `hydration < 15` | 匍匐警戒 (`crouch_alert`) 或虛弱打瞌睡，夾尾／垂尾，彈出 🏥 / 🐟 / 💧 | **同級仲裁**：`iconIds` 可同時顯示所有達標圖示；主動畫依明確清單順序 **1. `health < 30` ➔ 2. `hydration < 15` ➔ 3. `hunger < 15`** 決定。可中斷任何低優先級行為（包含 Priority 90 與 Priority 40 `eat`），持續播放至 `health >= 30 && hunger >= 15 && hydration >= 15`。 |
| **90** | 負面防禦反應 (`NEGATIVE_REACTION`) | 10 秒內 `[now - 10000, now]` `PokePet > 3` 次（第 4 次觸發），或高空掉落 `TriggerLanding`（定義為 Android 懸浮窗拖曳放開時，垂直落下距離超過螢幕高度 25% 觸發，短距離輕放不觸發） | 背對生氣 (`turn_back_angry`) 或炸毛，快速鞭打尾，彈出 💢 並哈氣 | 若同時發生，主動畫優先序為 **`LANDING > POKE`**。優先級高於 Priority 80，可暫時喚醒睡眠中的貓咪執行 `4,000 ms` 動畫。結束後進入 `15,000 ms` 互動無效冷卻期（同時限制 `PetCat` 摸頭與 `PlayWithPet` 玩耍）。撫摸／玩耍冷卻（`15,000 ms`）與 Priority 60 提醒冷卻（`60,000 ms`）各自獨立計時。冷卻期間摸頭與玩耍仍可播放互動動畫，但不給心情與積分獎勵，餵食／補水仍完全有效；冷卻期間再次 Poke 不延長冷卻時間。 |
| **80** | 生理作息睡眠 (`SLEEP_MODE`) | 本地時間 `23:00 ~ 07:00` 且無玩家主動互動 | 靠邊熟睡 (`sleep`) 或母雞蹲 (`cat_loaf`)，休眠捲曲尾，彈出 💤 | **夜間可喚醒規則**：僅能被有效的玩家數值互動指令（`FeedPet`、`DrinkWater`、`PetCat`、`PlayWithPet`）暫時喚醒並執行 Priority 40，互動結束後重新入睡；低電量、插線充電等系統事件不喚醒睡眠。 |
| **60** | 一般需求提醒 (`MODERATE_NEEDS`) | `hunger < 40` 或 `hydration < 40` 或 `mood < 45` | 坐下 (`sit`) 盯著玩家，尾巴慢速左右掃動，彈出 🐟 / 💧 / 🎾 | **同級仲裁**：若同時符合多個條件，`iconIds` 合併顯示所有達標提醒圖示，但主動畫只選擇最高優先項目，優先順序為：1. `hydration < 40` ➔ 2. `hunger < 40` ➔ 3. `mood < 45`。每次提醒持續 `5,000 ms`，共用冷卻 `60,000 ms`（從提醒動畫首次開始播放的時間戳 `startedAt` 起算）。 |
| **40** | 玩家主動互動 (`PLAYER_INTERACTION`) | 收到有效數值互動指令 `FeedPet`、`DrinkWater`、`PetCat` 或 `PlayWithPet` | `FeedPet` / `DrinkWater` ➔ 進食 (`eat`) 舉問號尾微顫；`PetCat` ➔ 摸頭呼嚕 (`pet`) 彈出 ❤️；`PlayWithPet` ➔ 玩耍撲抓 (`play`) 彈出 🎾 | 1. **數值與動畫解耦**：互動皆先執行 `GameCommand` 數值與積分結算，動畫中斷絕不回滾已生效之數值。2. **持續與中斷**：`eat`、`pet`、`play` 均持續 `3,000 ms`（不可被待機或 `23:00` 跨夜中斷，但可隨時被 Priority 100 緊急生理求救或 Priority 90 負面防禦中斷）。3. **夜間回歸**：若於 `23:00~07:00` 喚醒執行，動畫結束後自動返回 Priority 80 (`SLEEP_MODE`)。4. **冷卻與併發**：受 Priority 90 負面冷卻（`15,000 ms`）限制（冷卻期間摸頭／玩耍不給心情與積分）；同一 Tick 多筆指令依佇列順序執行（`FeedPet > DrinkWater > PlayWithPet > PetCat`）。 |
| **10** | 性格待機巡邏 (`IDLE_AND_PATROL`) | 無上述高優先級事件時執行 | 漫步 (`walk` + 問號尾)、母雞蹲 (`cat_loaf`)、貴妃躺 (`side_sleep`，需 `mood >= 80`) 輪替 | 每次動作持續 `4,000 ~ 8,000 ms`，可隨時被高優先級事件中斷。 |

### 8.B.2 性格與小怪癖干預公式（含 Phase A MVP 小怪癖白名單）

1. **傲嬌先拒後吃 (`basePersonality.tsundere >= 70`)：** 使用免費基礎乾糧 (`free_basic_kibble`) 時，有 45% 機率先播放撇頭嫌棄 (`sniff_and_turn_away` + 💦 圖示，持續 `2,000 ms`)，隨後自動接續 `eat` 進食；使用主食罐或零食則直接進食。
2. **慵懶臥息比例 (`basePersonality.laziness`)：** 待機狀態下選擇「母雞蹲或貴妃躺」的基礎機率為 `30% + (laziness * 0.5)%`。
3. **Phase A MVP 小怪癖白名單（`QuirkId`，共 4 款，嚴格只影響行為機率並 Clamp 於 `[0.05, 0.95]`）：**

| QuirkId | 名稱 | 修飾型別 | 數值 | 影響行為 |
| :---- | :---- | :---- | :---- | :---- |
| `cursor_hunter` | 追游標獵手 | `additiveProbabilityModifier` | `+0.30` | 偵測畫面點擊靠近之基礎機率（20%）加 30 個百分點，變為 50% |
| `sun_bather` | 曬太陽愛好者 | `multiplicativeWeightModifier` | `1.3` | 日間（`07:00~23:00`）待機選擇母雞蹲／貴妃躺之權重乘以 1.3 倍 |
| `treat_lover` | 零食小老饕 | `multiplicativeWeightModifier` | `1.25` | 餵食零食或主食罐後，後續待機呈現親近互動動作之權重乘以 1.25 倍（不改變任何回復數值） |
| `shy_observer` | 害羞觀察家 | `additiveProbabilityModifier` | `-0.15` | 待機主動漫步靠近螢幕中央之機率減少 15 個百分點 |

### 8.B.3 動畫資產矩陣分級 (Animation Asset Matrix)

1. **【唯一 AnimationId 規範】** `BehaviorEngine`、`PetViewModel` 與本動畫資產矩陣全專案強制使用同一組正式 `AnimationId`，不另設別名。
2. **Phase B 必備核心動畫 (P0-B，共 6 支，對應第 7 章 Phase B 最少必要動畫)：** `idle`（待機）、`walk`（漫步）、`sit`（坐下）、`sleep`（熟睡）、`eat`（進食）、`pet`（被摸呼嚕）。
3. **Phase C 必備核心動畫 (P0-C，共 2 支，Phase B 不要求實作)：** `cat_loaf`（母雞蹲／趴臥；Phase B 尚未實作前於待機與夜間模式回退播放 `sit` 或 `idle`）、`play`（玩耍；Phase B 尚未實作前於互動回饋回退播放 `pet` 或 `idle`）。
4. **Phase C 進階體驗動畫 (P1，共 7 支)：** `drag`（Android 拎起）、`drop`（掉落）、`landing`（落地）、`turn_back_angry`（生氣）、`sniff_and_turn_away`（挑食撇頭）、`crouch_alert`（虛弱匍匐）、`side_sleep`（貴妃躺，`mood >= 80` 待機動作；尚未實作前於待機輪替回退播放 `cat_loaf` 或 `idle`）。

---

## 8.C 經濟系統與數值平衡表 (Economy & TimeEngine Spec)

### 8.C.1 時間步進計算順序與日夜區段公式 (TimeEngine Math)

**【指令與時間模擬執行順序 (P1-4)】**  
所有具有遊戲數值效果的 `GameCommand`（如 `FeedPet`、`DrinkWater`、`PetCat`、`PlayWithPet` 等）在執行前，必須先呼叫 `TimeEngine.advanceTo(commandTimestamp)` 將遊戲狀態推進至該指令的有效時間點，再執行指令並套用數值變化。每次會改變 `Hunger`、`Hydration`、`Mood` 或 `Health` 的 `GameCommand` 完成數值結算後，必須立即於該 `GameCommand` 的時間戳 (`commandTimestamp`) 重新評估相關狀態機條件（包含 `NORMAL ➔ CRITICAL`、`CRITICAL ➔ RECOVERY_BOOST` 啟動、`RECOVERY_BOOST` 中斷與恢復、`NATURAL_RECOVERY` 恢復條件判斷，以及 `Health >= 100` 時的 `NORMAL` 重置與 `recoveryBoostAccumulatedHours` 歸零）；若符合轉換條件，轉換時間即為該 `commandTimestamp`，嚴禁延遲至下一個 `SimulationStep`。

**【本地時間計算基準】**  
`TimeEngine` 計算本地時段（`07:00` / `23:00`）與本地日期（`YYYY-MM-DD`）時，一律以注入 `Clock.getTimezoneOffsetMinutes()` 換算（`localMs = utcMs + timezoneOffsetMinutes * 60_000`，以 UTC 日曆欄位讀取），嚴禁呼叫執行主機之本機時區 API。

**【連續閾值交點切割與時間區段計算 (Threshold Crossing Split)】**  
為確保「一次補算 24 小時」與「任意時間點插入 `GameCommand` 分段補算」的最終結果一致，數值誤差小於 `1e-9`，`TimeEngine` 每次 `advanceTo(now)` 除按 `0.25` 小時（15 分鐘）基礎步長步進外，在推進時間區間 `[t_start, t_end]` 時，遇到以下任一狀態變化事件，必須建立精確交點切割 (Exact Boundary / Threshold Crossing Split)：

1. 日夜時段邊界（每日本地 `07:00` 與 `23:00`）。
2. 需求與健康狀態機門檻交點：`Hunger = 20`、`Hydration = 20`（扣血／額外懲罰門檻）、`Hunger = 50`、`Hydration = 50`（`RECOVERY_BOOST` 門檻）、`Hunger = 60`、`Hydration = 60`、`Mood = 70`（`NATURAL_RECOVERY` 滿速門檻）、`Mood = 40`（`NATURAL_RECOVERY` 半速／低心情門檻）、`Mood = 20`（嚴重低心情門檻）、`Health = 10`（飢餓／缺水 Health 保護下限）、`Health = 40`（`CRITICAL` / `MoodHealthPenalty` 安全地板門檻）與 `Health = 100`（滿血完成門檻）。當 `Health > 10` 且扣血速率為負時，必須計算 `Health = 10` 之精確交點；抵達 `Health = 10` 後，飢餓／缺水扣血速率立即歸零（`0/hr`），且後續區段不得使 Health 低於 `10`。
   - **Signed Rate Threshold Crossing（帶正負號速率交點算式）：** 交點計算統一使用帶正負號的 `ratePerHour`（數值下降時 `ratePerHour < 0`；數值上升時 `ratePerHour > 0`；`ratePerHour = 0` 時不存在由該區段速率產生的交點），交點時間戳公式為 `t_cross = t_start + ((targetThreshold - currentValue) / ratePerHour) * 3_600_000`。只有當交點時間位於目前模擬區段內，且數值確實朝向該門檻移動時，才建立切割事件；當速率為 0、交點位於區段之外，或數值遠離門檻時，不得建立無效交點。所有交點仍須符合 `TimeEngine` 的精度要求，最終分段模擬結果誤差 `< 1e-9`。
   - **交點有效性與零時間事件過濾：** 數值門檻比較與時間戳去重之容差常數必須集中定義於核心共用常數模組（如 `packages/game-core` 之 `TIME_ENGINE_CONSTANTS`），嚴禁各模組自行設定不同容差：數值門檻比較統一採用 `VALUE_EPSILON = 1e-9`，時間戳事件去重統一採用 `TIME_EPSILON_MS = 1e-3`（1 微秒，大於 IEEE 754 雙精度浮點於 Unix ms 時間戳量級之機器誤差）。建立 Threshold Crossing Event 時，除上述條件外，必須同時符合：(1) `Math.abs(currentValue - targetThreshold) > VALUE_EPSILON`（數值已在 `VALUE_EPSILON` 範圍內等於門檻時不建立交點）；(2) `t_cross` 必須嚴格大於 `t_start + TIME_EPSILON_MS` 且小於或等於 `t_end`（`t_start + TIME_EPSILON_MS < t_cross <= t_end`）；(3) 若計算結果與已處理事件時間差小於或等於 `TIME_EPSILON_MS`（`Math.abs(t_cross - t_existing) <= TIME_EPSILON_MS`），必須合併或忽略重複事件，不得重複建立零時間區段；(4) 交點處理完成後，必須立即更新目前數值與事件狀態，避免下一次迭代再次觸發相同交點。
3. 剩餘 Boost 額度耗盡時間點：`t_boost_end = t_start + (2.0 - recoveryBoostAccumulatedHours) * 3_600_000`。
4. 低心情門檻與持續時間到期交點：`Mood = 40`、`Mood = 20` 穿越交點，以及 `below40Hours` 累計滿 `72.0` 小時、`below20Hours` 累計滿 `48.0` 小時的精確時間交點。
5. 玩家數值 `GameCommand` 發生時間與 Care Pause 啟用／解除時間。

當執行數值 `GameCommand` 時，直接推進至 `commandTimestamp` 並按實際經過小時數 (`actualHours = segmentMs / 3_600_000`) 結算，更新 `lastSimulatedAt`。

**每時間區段計算順序：**

1. **步驟 1（判定區段時段係數）：** 若該區段之起始本地時間落於 `07:00 ~ 23:00`，時段係數 `periodFactor = 1.0`；若落於 `23:00 ~ 07:00`，`periodFactor = 0.3`。
2. **步驟 2（更新 `hunger` 與 `hydration`）：**
   - `hunger` 扣除 `4.0 * periodFactor * actualHours`（最低 `0`）。
   - `hydration` 扣除 `4.0 * periodFactor * actualHours`（最低 `0`；日間 `-4.0/hr`、夜間 `-1.2/hr`，每日 24 小時基礎總衰退 `73.6`，與 `Hunger` 一致，避免每日一次登入因 100 上限截斷而每日固定缺水扣血）。
3. **步驟 3（更新 `mood` 與低需求額外懲罰 - P0-1）：**
   - 基礎心情扣除 **`1.25 * periodFactor * actualHours`**（日間每小時 `-1.25`，夜間每小時 `-0.375`；每日 24 小時基礎心情總衰退為 `23.0`）。
   - 若步驟 2 更新後之 `hunger < 20` 或 `hydration < 20`，額外心情懲罰亦乘以時段係數，扣除 `1.5 * periodFactor * actualHours`（最低 `0`）。
4. **步驟 4（決定飢餓／缺水 Health 扣血速率 `starvationHealthRate` — 保護下限 `10`）：** 本步驟僅判定該時間區段內之飢餓／缺水扣血速率，**不得在步驟 4.5 判定前先行修改 `health`**：若該區段滿足 `hunger < 20` 或 `hydration < 20`（且 `health > 10`），則 `starvationHealthRate = -2.0/hr`（不受夜間係數減免，最低保護下限為 `10`）；當 `health` 精確抵達 `10` 時，`starvationHealthRate` 立即歸零為 `0/hr`，後續區段不得使 `health` 低於 `10`；未滿足條件時亦為 `0/hr`。
5. **步驟 4.5（決定獨立低心情健康懲罰速率 `moodHealthRate` 並與步驟 4 合併結算 — C. 混合模式，保護地板 `40`）：** 短期缺少陪伴僅降低 `Mood`，不影響 `Health`；唯有連續低心情達標才啟動極緩慢扣血，且與步驟 4 視為同一時間區段內之獨立速率合併結算，各自保留保護下限（飢餓／缺水最低 `10`；低心情最低 `40`）。`TimeEngine` 必須於 `below40Hours = 72.0` 與 `below20Hours = 48.0` 精確交點切割時間區段，不得先累加整個 0.25 小時步長再將整段時間套用扣血；僅從精確跨越門檻（嚴格 `> 72.0` 或 `> 48.0`）之後的時間區段起套用對應扣血速率：
   - **`Mood >= 40`：** 健康無影響（`moodHealthRate = 0/hr`），立即重置 `below40Hours = 0` 與 `below20Hours = 0`。
   - **`Mood 20 ~ 39`：** 累加 `below40Hours += actualHours`（同時重置 `below20Hours = 0`）；當 `below40Hours > 72.0` 時，超出 `72.0` 小時的部分 `moodHealthRate = -0.05/hr`（不受夜間係數減免），否則 `moodHealthRate = 0/hr`。
   - **`Mood 0 ~ 19`：** 同時累加 `below40Hours += actualHours` 與 `below20Hours += actualHours`：
     - 若 `below20Hours > 48.0`：`moodHealthRate = -0.1/hr`（取代 `-0.05/hr`，不得疊加，不受夜間係數減免）。
     - 若 `below20Hours <= 48.0` 且 `below40Hours > 72.0`：`moodHealthRate = -0.05/hr`（不受夜間係數減免）。
     - 其他情況（`below20Hours <= 48.0` 且 `below40Hours <= 72.0`）：`moodHealthRate = 0/hr`。
   - **合併速率結算與 `Health = 40` / `Health = 10` 精確交點切割：** 當區段起點 `health > 40` 時，該區段之 Health 總扣血速率為 **`totalHealthPenaltyRate = starvationHealthRate + moodHealthRate`**（例如同時滿足飢餓與 `below20Hours > 48.0` 時為 `-2.0 + (-0.1) = -2.1/hr`）。`TimeEngine` 必須依 Signed Rate Threshold Crossing 以 `totalHealthPenaltyRate` 精確切割 `Health = 40` 交點，確保兩種扣血共同作用直至 `health` 精確抵達 `40.0`。當 `10 < health <= 40` 時，`MoodHealthPenalty` 立即停止（`moodHealthRate` 強制為 `0/hr`，絕不因低心情而將寵物推入 `CRITICAL < 40` 或死亡），僅保留 `starvationHealthRate`（若滿足飢餓／缺水則維持 `-2.0/hr`），並精確切割至保護下限 `Health = 10`；抵達 `Health = 10` 交點後，飢餓／缺水扣血速率立即歸零（`totalHealthPenaltyRate = 0/hr`），後續區段不得使 `health` 低於 `10`（最終 `health = Math.max(10, health + totalHealthPenaltyRate * actualHours)`；若僅有低心情扣血且 `starvationHealthRate === 0`，則 `health` 嚴格受 `40` 地板保護不得低於 `40`）。
6. **步驟 5（執行健康救援狀態機 Recovery State Machine - P0-2, P0-4, P1-6）：**
   1. **`NORMAL ➔ CRITICAL`：** 當 `health < 40` 時觸發一次轉換，僅在此轉換瞬間執行 `recoveryBoostAccumulatedHours = 0`。
   2. **`CRITICAL ➔ RECOVERY_BOOST`：** 處於 `CRITICAL` 狀態下，當滿足 `hunger >= 50 && hydration >= 50` 且 `recoveryBoostAccumulatedHours < 2.0` 時轉入，每小時恢復 `+10.0 health`（按 `actualHours` 計算），並累加 `recoveryBoostAccumulatedHours += actualHours`（上限 `2.0`）。
   3. **`RECOVERY_BOOST` 中斷與額度耗盡轉換：** 若加速期間 `hunger < 50` 或 `hydration < 50`，退回 `CRITICAL` 暫停回血但完整保留 `recoveryBoostAccumulatedHours` 已累計時數；當 `recoveryBoostAccumulatedHours >= 2.0`（2 小時額度用滿）時，立即轉為 `NATURAL_RECOVERY`（即使此時 `health < 40` 或尚未滿足 60/60/70，也不退回 `CRITICAL` 且不重置已累計時數）。
   4. **`NATURAL_RECOVERY` 分級回血與暫停 (`RecoveryMultiplier`)：** 處於 `NATURAL_RECOVERY` 下，當滿足 `hunger >= 60 && hydration >= 60` 時，依據當下 Mood 區間分級回血（按 `actualHours` 計算）：(1) `Mood >= 70`（心情良好）：每小時恢復 `+2.5 health`；(2) `Mood 40 ~ 69`（普通／略低落）：每小時恢復 `+1.25 health`（陪伴不足仍可緩慢康復）；(3) `Mood < 40`（明顯／嚴重低落）：暫停 `NATURAL_RECOVERY` 回血，需先透過撫摸、玩耍或零食安撫情緒。未滿足 `hunger >= 60 && hydration >= 60` 則亦暫停回血（維持 `NATURAL_RECOVERY` 狀態，唯有恢復至 `NORMAL` 後未來再度跌破 `40`，才視為全新救援週期重新獲得 `2.0` 小時 Boost 額度）。
   5. **全域滿血重置規則 (Global Full Health Reset)：** 無論處於 `CRITICAL`、`RECOVERY_BOOST` 或 `NATURAL_RECOVERY` 任一階段，當 `health >= 100` 時，`health` 立即 Clamp 為 `100`，`recoveryState` 轉為 `NORMAL` 且 `recoveryBoostAccumulatedHours = 0`。若同一時間點同時發生 `health < 40` 與 `hunger < 20`，依序先結算需求與 `health` 扣減，再觸發狀態機轉為 `CRITICAL`（僅在由 `NORMAL` 轉入 `CRITICAL` 的瞬間歸零累計時數）。
   6. **Care Pause 啟用前結算與凍結規則：** 啟用 Care Pause 前，必須先呼叫 `TimeEngine.advanceTo(pauseStartTimestamp)` 完成此前所有應有的離線模擬結算，再將 `isCarePaused` 設為 `true` 完全凍結 `TimeEngine` 衰退與 `RecoveryState` 累計時數；解除暫停時不補算暫停期間，直接將 `lastSimulatedAt` 更新為 `resumeTimestamp` 並執行一次狀態機檢查。

### 8.C.2 商品目錄與遊戲效果平衡表 (`food-catalog.v1.json`)

所有商品依「品類基準 + 個性化微調」配置效果，品牌合作商品享有完全相同的平衡公式。

**【三區塊商業化商品 Schema 規範（支援內部批次匯入與未來品牌商第三方 API）】**  
為兼顧品牌商自助維護商品資料與遊戲平衡絕對安全，每筆商品項目必須區分為三大責任區塊，搭配軟下架狀態 `status`：

1. **`externalSource`（外部同步識別，支援冪等更新）：**
   - `partnerId: string | null`（合作品牌商識別碼，一般／免費商品為 `null`）。
   - `externalSkuId: string | null`（廠商端唯一商品貨號，供 API／CSV 重複匯入時比對更新，避免重複建立）。
   - `feedSourceType: "manual" | "partner_api" | "partner_csv"`。
   - `syncedAt: string | null`（ISO-8601 時間戳，最後同步匯入時間）。
2. **`vendorInfo`（廠商透過 API／CSV 可維護之商品資訊，須經格式與內容審核）：**
   - `name: string`、`productType: "regular" | "sponsored" | "free"`、`dataType: "real" | "mock"`（UI 層對 `mock` 商品強制顯示「測試商品／模擬資料」標籤）。
   - `imageUrl: string | null`、`purchaseUrl: string | null`（導購連結）、`promoCode: string | null`（專屬折扣碼）。
   - `nutrition`（粗蛋白、粗脂肪、水分等分析）與 `ingredients: string`。
   - `sourceName: string`（必填：模擬商品標示 `"MVP 模擬測試資料"`；真實商品標示官方來源）。
   - `sourceUrl: string | null`（`mock` 可為 `null`；`real` 必填有效來源 URL）。
   - `dataVerifiedAt: string | null`（官方資料核實日期 `YYYY-MM-DD`；`mock` 為 `null`）。
   - `lastReviewedAt: string | null`（內部審查日期 `YYYY-MM-DD`）。
   - `disclaimer: string | null`（選填免責聲明，如 `"實際成分以原廠包裝標示為準"`）。
3. **`gameBalance`（僅拾暖官方可設定／由級距白名單自動約束，廠商 API 無權覆寫）：**
   - `category: "water" | "kibble" | "wet_food" | "treat"`、`price: number`（免費品為 `0`）、`gameEffect: { hunger: number; hydration: number; mood: number }`。
   - `status: "active" | "pending_review" | "discontinued"`：
     - `active`：商店上架販售且可使用。
     - `pending_review`：外部匯入新品待核對級距與內容，商店不顯示。
     - `discontinued`：軟下架狀態——商店隱藏不再販售，但**玩家背包內既有庫存仍可正常餵食不報錯**。
   - **免費基礎品規則：** `productType === "free"` 時為無限供應，直接透過 `FeedPet`／`DrinkWater` 使用，**不須購買亦不扣減 `inventory` 庫存**。

**【商品定價級距與固定效果白名單驗證準則】**  
MVP 階段不設自動營養換算公式，所有上架商品（含一般商品與品牌合作商品）均須由 PO 核准並登錄於固定商品效果白名單 `food-catalog.v1.json`。同一級距內允許依真實營養特性微調數值，但**定價級距上下限為硬性天花板（定價級距優先於營養微調，嚴禁跨級突破）**，且嚴禁以品牌合作身分、贊助金額或曝光合約作為任何加成參數。QA 驗證時逐筆核對商品之 `category`、`price` 所屬級距及 `gameEffect` 是否完全落於下表合法區間：

| 商品類別 | 定價級距（積分） | 合法飽食區間 | 合法水分區間 | 合法心情區間 |
| :---- | :---- | :---- | :---- | :---- |
| 飲水 (`water`) | 免費基礎 (`0`) | `+0` | `+32` | `+2` |
| 乾糧 (`kibble`) | 免費基礎 (`0`) | `+25` | `-2` | `+2` |
| 乾糧 (`kibble`) | 付費進階 (`80~110`) | `+26~+28` | `-2~-1` | `+5~+6` |
| 主食罐 (`wet_food`) | 入門級 (`50~70`) | `+25` | `+20~+21` | `+5~+6` |
| 主食罐 (`wet_food`) | 標準級 (`71~95`) | `+25~+27` | `+20~+22` | `+7~+8` |
| 主食罐 (`wet_food`) | 頂級 (`96~120`) | `+27~+28` | `+20~+22` | `+8~+9` |
| 零食 (`treat`) | 標準級 (`40~60`) | `+8` | `-1` | `+14` |

**Phase A 預設商品清單（8 項）：**

| 商品 ID (`itemId`) | 商品名稱 | 類別 | 合作類型 (`productType`) | 資料真實性 (`dataType`) | 定價 (積分) | 真實營養與成分標示 (`nutrition` & `ingredients`) | 遊戲效果 (`gameEffect`) |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| `free_basic_kibble` | 基礎日常乾糧 | 乾糧 | `free` (免費基礎) | `mock` | 0 (無限) | 粗蛋白 28% / 粗脂肪 12% / 水分 10%｜穀物、家禽副產品粉、維生素 | 飽食 `+25`、水分 `-2`、心情 `+2` |
| `free_fresh_water` | 過濾飲用水 | 飲水 | `free` (免費基礎) | `mock` | 0 (無限) | 純淨過濾水 100%（建議每日更換維持新鮮） | 飽食 `+0`、水分 `+32`、心情 `+2` |
| `shop_chicken_can` | 鮮燉嫩雞主食罐 | 主食罐 | `regular` (一般商品) | `mock` | 60 | 粗蛋白 12.5% / 粗脂肪 4.5% / 水分 78%｜去骨雞胸肉、雞高湯、牛磺酸 | 飽食 `+25`、水分 `+20`、心情 `+5` |
| `shop_salmon_mousse` | 野生鮭魚慕斯罐 | 主食罐 | `regular` (一般商品) | `mock` | 80 | 粗蛋白 11.8% / 粗脂肪 5.2% / 水分 80%｜野生鮭魚、魚油、洋車前子膳食纖維 | 飽食 `+25`、水分 `+22`、心情 `+8` |
| `brand_nu4pet_kitten` | 【陪心】屁孩罐－葡聚醣雞肉 | 主食罐 | `sponsored` (品牌合作) | `mock` | 90 | 粗蛋白 13.0% / 粗脂肪 5.0% / 水分 79%｜台灣鮮雞肉、β-葡聚醣、魚油、維生素 E | 飽食 `+26`、水分 `+21`、心情 `+8` |
| `brand_ziwi_venison` | 【Ziwi 巔峰】紐西蘭鹿肉主食罐 | 主食罐 | `sponsored` (品牌合作) | `mock` | 110 | 粗蛋白 12.0% / 粗脂肪 6.5% / 水分 78%｜紐西蘭放牧鹿肉、鹿肝、綠唇貝、海帶 | 飽食 `+28`、水分 `+20`、心情 `+9` |
| `brand_rc_hairball` | 【皇家】IH34 化毛配方乾糧 | 乾糧 | `sponsored` (品牌合作) | `mock` | 95 | 粗蛋白 34% / 粗脂肪 15% / 水分 8%｜脫水禽肉蛋白、洋車前子殼、甜菜漿 | 飽食 `+28`、水分 `-1`、心情 `+6` |
| `shop_freeze_dried` | 凍乾原肉丁零食 | 零食 | `regular` (一般商品) | `mock` | 50 | 粗蛋白 82% / 粗脂肪 8% / 水分 5%｜100% 冷凍乾燥雞胸肉丁 | 飽食 `+8`、水分 `-1`、心情 `+14` |

### 8.C.3 日常積分與「商品探索任務」平衡表 (`EconomyEngine`)

開局預設 **200 積分**。`dailyLimits` 隨 `GameState` 一起保存，包含裝置本地日期 `YYYY-MM-DD`、`lastClaimedTimestamp` 與當日已發放獎勵事件 ID 集合（`claimedRewardIds: string[]`）；每日獎勵採「每個裝置本地日曆日最多領取一次 ＋ 20 小時最小實際冷卻間隔」雙重規則，防止短時間內透過調整時區重複領取，同時保留正常早晚作息彈性：玩家領取每日簽到獎勵時，必須同時滿足：(1) `currentLocalDate > lastClaimedLocalDate`（防止時鐘回撥或往西跨時區日期倒退重複領取）；且 (2) `now - lastClaimedTimestamp >= 20 * 3_600_000`。若偵測時鐘回撥 (`now < lastClaimedTimestamp`) 或因跨時區旅行／手動調整致本地日期倒退 (`currentLocalDate < lastClaimedLocalDate`)，拒絕重複發放獎勵。不補發未登入日之簽到或互動積分。

1. **每日首次陪伴簽到 (`ClaimDailyCheckIn`)：** `+40` 積分（每日上限 1 次）。
2. **商品探索任務（不限品牌或一般商品，無廣告式領獎彈窗）：**
   - 每日首次開啟商店瀏覽 (`OpenShop`)：`+5` 積分。
   - 點開任一商品詳情頁並完整檢視營養成分分析 (`InspectProduct`，停留 `>= 3` 秒)：每款不重複商品 `+10` 積分（同商品當日重複開關不給分，每日探索獎勵上限 **30 積分**）。
3. **有效摸頭與玩耍互動 (`PetCat` / `PlayWithPet`)：** 每次有效互動 `+5` 積分與 `mood +3`（每日積分上限 **`25` 積分**，即前 5 次給積分；**超過每日 25 積分上限後，第 6 次起停止發放 `+5` 積分，但 `mood +3` 照常生效**，以確保緊急救援與正常陪伴不受積分上限阻斷）。
4. **跨日結算與高健康度日結獎勵：** 當執行 `advanceTo(now)` 偵測到 `currentLocalDate > lastActiveLocalDate`（本地日曆跨日）時，`ageInDays` 依實際經過的本地日曆天數遞增；高健康度日結獎勵（`+25` 積分）僅於**當次跨日結算完成後當下**判定一次：若 `health >= 90 && mood >= 80` 即發放 `+25` 積分，不補發離線期間錯過的舊日獎勵。

---

## 8.D UI/UX 介面與操作動線 (UI/UX Flow)

1. **開局領養流程（MVP 預設帳號總免費擁有 1 隻，架構預留多養槽位）：**
   - 皮克敏式 2D 換色選父母（分別選擇爸爸／媽媽品種與毛色球，上方 2D 預覽貓即時換裝並顯示隱性基因線索）➔ 誕生一胎 **3～5 隻**同胎小貓（依 R1 每日免費上限 3 胎；放棄本胎重抽前提示「此胎貓咪將由其他玩家領養」；用完 3 胎保留最後一胎可領養）➔ 檢視同胎各貓外觀、性別、遺傳小知識、隱藏小怪癖提示（僅示有／無，不示數量與名稱）與罕見公三花彩蛋祝賀 ➔ 挑選有眼緣之小貓領養命名（1～12 字元；確認前提示其餘未領養兄弟姊妹將被其他玩家領養，確定領養後鎖定外觀、`seed` 與 `fatherPetId`/`motherPetId`）➔ 雙平台權限引導（Android 引導懸浮窗授權；iOS 引導桌面 Widget 教學）。
2. **主房間與控制選項 (`HomeScreen`)：**
   - 頂部顯示四大狀態條與積分；底部為「背包餵食」、「商店」、「圖鑑」與「設定」。
   - **照顧保護與顯示設定：** 支援「暫時隱藏懸浮窗至通知列」、「貓咪顯示尺寸調整（小／中／大）」以及「照護暫停保護模式 (Care Pause)」。
3. **商店與商品詳情頁 (`ShopScreen` & `ProductDetailModal`)：**（階段邊界：Phase B 僅建立固定 Mock Data 之靜態 UI Prototype，不含購買與經濟結算；正式商品目錄、積分購買、背包、探索任務與 Remote Config 統一於 Phase D 上線。）
   - 列表支援分類篩選與「品牌合作／測試商品」清晰標示；詳情頁完整呈現「真實品牌、原料、粗蛋白／脂肪／水分分析、資料來源、免責標示與更新日期」，以及獨立區塊的「遊戲回復數值」與「購買放入背包」按鈕。

---

## 8.E 存檔架構、遷移規範與自動化驗收劇本

### 8.E.1 雙階段存檔與時間戳單一權威規範 (Save Migration)

1. **時間戳單一權威來源：** `PetState.lastSimulatedAt` 為遊戲模擬時間的唯一權威來源；資料庫外層之 `created_at` 與 `updated_at` 僅供維運追蹤，寫入時由 Adapter 注入之 `Clock` 同步填入，不得與 `PetState.lastSimulatedAt` 產生雙頭馬車。
2. **Phase A (Windows 本機)：** 採用防損 JSON 寫檔流程（先寫入 `save.tmp` ➔ 驗證 JSON 結構 ➔ 備份舊檔為 `save.bak` ➔ 原子替換為 `save.json`）。
3. **Phase C (手機端 SQLite)：**
   - `game_saves` 表包含：`id`、`schema_version`（目前為 `2`；此 Schema 版本於 Master PRD v2.1.4 引入，v2.1.5 ～ v2.1.30 維持向後相容，v2.1.30 新增欄位皆為可選或具預設值）、`game_core_version`、`pet_state_json`（完整序列化保存整個 `PetState`，明確包含 `microchipId`、`genetics`、`appearance`、`basePersonality`、`quirks`、`discoveredQuirks`、`memories`、`needs`、`health`、`recoveryState`、`recoveryBoostAccumulatedHours`、`lowMoodDuration`、`isCarePaused`、`coins`、`inventory`、`lastSimulatedAt`）、`daily_limits_json`、`created_at`、`updated_at`。
   - `game_events` 表僅作為行為追蹤與除錯日誌（非主存檔來源），定期清理超過 30 天之舊紀錄。
4. **存檔升級遷移規則 (Migration)：** 每次 App 升級偵測到 `schema_version` 落後時，先自動備份原始存檔再執行漸進式遷移腳本（`v1 -> v2`），當載入 `schema_version = 1` 的舊存檔時，自動補齊 `microchipId: null`、`genetics.fatherPetId: null`、`genetics.motherPetId: null`、`recoveryBoostAccumulatedHours: 0`、`lowMoodDuration: { below40Hours: 0, below20Hours: 0 }` 與 `isCarePaused: false` 等預設值，**嚴禁因版本更新而重置或重新生成既有貓咪的外觀與個性**；若遷移失敗則安全回退至備份檔。

### 8.E.2 核心自動化驗收測試案例 (Vitest Acceptance Criteria)

RD 完成 Phase A 時必須通過以下 10 項核心測試與照護負擔驗證：

1. **TC-01（基因確定性與 Golden Test）：** 固定 `seed: "test-seed-001"`、`prngAlgorithmVersion: "mulberry32-v1"`（FNV-1a 32-bit 雜湊）、`geneticsVersion: "1.0.0"`，連續生成 10 次結果 100% 一致；對於不同 seed（`"test-seed-001"` vs `"test-seed-002"`），驗證 PRNG 抽取序列確實不同並比對正式鎖定之 Golden Fixture（`tests/fixtures/genetics-golden-v1.json`，於 `S1-3` 經 QA 與 Reviewer 逐步驟核對公式無誤後首次鎖定），不要求不同 Seed 必須產出不同外觀；另驗證新增或移除步驟 5 小怪癖抽取不影響步驟 1～4 外觀輸出。
2. **TC-02（特殊骨架雙親與跨品種統計分布）：** 使用獨立固定種子序列 `seed_0001 ~ seed_1000`（每次獨立初始化 PRNG 確保狀態隔離）：
   - `munchkin + maine_coon`：驗證 `body` 為 `short_legs` 佔 `50% ± 5%`、`giant_fluffy` 佔 `25% ± 5%`、`normal` 佔 `25% ± 5%`（互斥單值枚舉）。
   - `munchkin + munchkin`（雙親同種純種）：驗證 `body` 為 `short_legs` 佔 `90% ± 5%`、`normal` 佔 `10% ± 5%`。
   - `exotic + domestic`（單親加菲跨配）：驗證 `head` 為 `flat_face` 佔 `60% ± 5%`、`standard_round` 佔 `40% ± 5%`。
   - `exotic + exotic`（雙親同種純種）：驗證 `head` 為 `flat_face` 佔 `90% ± 5%`、`standard_round` 佔 `10% ± 5%`。
   - `domestic + ragdoll`（米克斯＋純種跨配，正反父母順序均測）：驗證一般未鎖定圖層（如 `eyes`、`body`）米克斯約 `30%`、布偶約 `50%`、變異約 `20%`（誤差 `± 5%`），且初始 `breedBase` 吻合 `round(domestic * 0.3 + ragdoll * 0.7)`。
   - `ragdoll + ragdoll`（雙親同種純種一般圖層）：驗證一般圖層繼承布偶預設特徵約 `90%`、變異路徑約 `10%`（誤差 `± 5%`）。
3. **TC-03（時間步進、日夜邊界切割與分段一致性）：** 測試 `22:50 ~ 23:05` 跨夜邊界自動拆分為 10 分鐘日間 (`1.0`) + 5 分鐘夜間 (`0.3`) 之精確結算驗證；`06:45 ~ 07:15` 跨日、未滿 15 分鐘零頭累計、24 小時一次補算與 4 次 × 6 小時分段補算結果誤差 `< 1e-9`，以及時鐘回撥後恢復正常時間的補算正確性。
4. **TC-04（健康救援狀態機完整邊界）：** 驗證 `health = 40` 不進 `CRITICAL`、`health = 39` 進入 `CRITICAL`（僅轉換時重置累計時數）；餵食補水達 50/50 進入 `RECOVERY_BOOST`（按 `actualHours` 計算）；中途飢餓跌至 49 暫停並保留已累計時數，重新餵食後繼續累計；當 `recoveryBoostAccumulatedHours >= 2.0` 用滿後，即使 `health = 30`（仍 `< 40`）且未達 60/60/70 亦正確轉為 `NATURAL_RECOVERY` 等待照護，絕不卡死或重置累計時數；單步跨越 40 與上限 100 Clamp 驗證。
5. **TC-05（行為仲裁、滑動窗口與冷卻邊界）：** 驗證 Priority `100 > 90 > 80 > 60 > 40 > 10`；同觸發 Priority 100 多項條件時 `iconIds` 合併且主動畫依固定序執行；`PokePet` 10 秒滑動窗口第 4 次觸發 Priority 90，`eat` 跨過 `23:00` 不被睡眠中斷。另須完整驗證 Priority 90 結束後 15 秒互動冷卻（冷卻期間再 Poke 不延長冷卻）：(1) 15 秒內 `PetCat` 可播放動畫但不增加 Mood / 積分；(2) 15 秒內 `PlayWithPet` 可播放動畫但不增加 Mood / 積分；(3) 冷卻結束後 `PetCat` 恢復正常獎勵；(4) 冷卻結束後 `PlayWithPet` 恢復正常獎勵；(5) 冷卻期間 `FeedPet` / `DrinkWater` 不受互動冷卻限制，照常生效。
6. **TC-06（傲嬌干預與記憶計算）：** `tsundere >= 70` 餵免費乾糧依機率觸發撇頭再吃；驗證最近 7 天互動佔 70% 與歷史 30% 的人格計算公式；驗證 MVP 4 款 `QuirkModifiers` 加法與乘法修正及 `[0.05, 0.95]` Clamp。
7. **TC-07（商品探索防重與跨日重置）：** 開局 200 積分，同商品同日重複開啟不給分、跨午夜（`23:59 ➔ 00:01`）正確重置上限、單日探索上限 30 積分、購買與背包使用扣減、免費品無限使用不扣背包、軟下架商品 (`discontinued`) 隱藏商店但背包可用及 100 上限 Clamp。
8. **TC-08（365 天長時穩定性模擬）：** 連續模擬 365 天隨機玩家行為（含 Care Pause 開關、長期未登入、只用免費糧水），驗證無 `NaN`、`Infinity` 或負數積分，且存檔序列化與還原一致。
9. **TC-09（每日照護負擔量化驗收標準 — 固定照護時間與執行順序）：** 測試起點統一設為 Day 1 `08:00`，初始數值 `hunger = 80, hydration = 80, mood = 85, health = 100`，僅使用免費乾糧（`+25 hunger, -2 hydration, +2 mood`）、免費飲水（`+32 hydration, +2 mood`）與每日摸頭／玩耍（`mood +3`）。每次登入照護指令於該時間點一次連續執行（執行順序：`FeedPet ➔ DrinkWater ➔ PetCat/PlayWithPet`），每日以次日 `08:00` 作為完整 24 小時日結點：
   - **情境 A（每日早晚 `08:00` 與 `20:00` 登入 2 次，每次餵 2 糧 + 2 水 + 2 次互動）：** 每日總補充 `Hunger +100`、`Hydration +120`、`Mood +28`，每日 `08:00` 日結時 `Hunger >= 80`、`Hydration >= 85`、`Mood >= 85`，`Health` 維持 `100`（零扣血）。
   - **情境 B（每日僅 `08:00` 登入 1 次，標準免費照護方案 B：3 糧 + 4 水 + 3 次互動 — 驗證低壓力長期陪伴與救援能力）：** 每日 `08:00` 依序執行 3 份免費乾糧（`+75 Hunger, -6 Hydration, +6 Mood`）➔ 4 份免費飲水（`+128 Hydration, +8 Mood`）➔ 3 次撫摸／玩耍互動（`+9 Mood`），每日總補充量為 `Hunger +75`（日衰退 `73.6`，淨變化 `+1.4`）、`Hydration +122`（日衰退 `73.6`，淨變化 `+48.4`）、`Mood +23`（日衰退 `23.0`，淨變化 `0`）（實際狀態須嚴格套用 `0~100` 上下限截斷 Clamp，不得僅以淨變化推算）。
     - **連續 60 日長期模擬驗收基準（須以 Game Core TimeEngine 實際跑完，輸出每日 `08:00` 照護前後完整數值、每日各需求跌破 40/20 時長、每日 Health 扣減／回血總量、`RecoveryState` 轉換時間與第 60 日結算數值）：**
     - **子情境 B-1（正常起始狀態：`Hunger = 80, Hydration = 80, Mood = 85, Health = 100, RecoveryState = "NORMAL"`）：**
       - Day 1 `08:00` 照護後（套用 100 上限 Clamp）：`Hunger = 100.0`、`Hydration = 100.0`、`Mood = 100.0`、`Health = 100.0`。
       - Day 2 ～ Day 60 每日 `08:00` 穩態循環：**照護前** `Hunger = 26.4`、`Hydration = 26.4`、`Mood = 77.0`、`Health = 100.0`、`RecoveryState = "NORMAL"`、`below40Hours = 0`、`below20Hours = 0`；**照護後** `Hunger = 100.0`、`Hydration = 100.0`、`Mood = 100.0`、`Health = 100.0`。
       - 每日風險監控：`Hunger` 與 `Hydration` 跌破 40 持續 `9.0` 小時（`23:00 ~ 次日 08:00`），跌破 20 持續 **0 小時**；`Mood` 跌破 40 持續 **0 小時**；每日 Health 扣減 **0**、回血 **0**。第 60 日結束（Day 61 `08:00` 照護前）維持 `Health = 100.0`、`RecoveryState = "NORMAL"`。
     - **子情境 B-2（低健康起始狀態：`Hunger = 30, Hydration = 30, Mood = 50, Health = 10, RecoveryState = "CRITICAL"` — 驗證每日一次免費照護之長期救援能力）：**
       - **Day 1 `08:00` 照護後：** `Hunger = min(100, 30 + 75) = 100.0`、`Hydration = min(100, 30 - 6 + 128) = 100.0`、`Mood = 50 + 23 = 73.0`、`Health = 10.0`（`RecoveryState = "CRITICAL"`）。
       - **Day 1 分段狀態轉換與回血（當日總回血 `+30.5`）：**
         - `08:00 ~ 10:00`（`2.0h`）：執行 `RECOVERY_BOOST (+10.0/hr)` 回血 `+20.0`，Health 升至 `30.0`；於 `10:00` 耗盡 `2.0h` Boost 額度並精確轉入 `NATURAL_RECOVERY`。
         - `10:00 ~ 10:24`（`0.4h`，此時 Mood 由 `70.5` 降至 `70.0`，滿足 `Mood >= 70`）：以 `+2.5/hr` 回血 `+1.0`，Health 升至 `31.0`。
         - `10:24 ~ 18:00`（`7.6h`，Mood 介於 `40~69` 且 `Hunger/Hydration >= 60`）：以 `+1.25/hr` 回血 `+9.5`，Health 升至 `40.5`。
         - `18:00 ~ 次日 08:00`：`Hunger/Hydration < 60` 暫停回血，且全程維持 `>= 26.4`（`>= 20`）故零扣血。Day 2 `08:00` 照護前 `Health = 10.0 + 30.5 = 40.5`、`RecoveryState = "NATURAL_RECOVERY"`。
       - **Day 2 ～ Day 4 穩態回血（已處於 `NATURAL_RECOVERY`，無 Boost，每日淨回血 `+15.5 Health/日`）：** 每日 `08:00` 照護後 Mood 均回升至 `73.0`，故 `08:00 ~ 10:24`（`2.4h`，`Mood >= 70`）回血 `2.4 × 2.5 = +6.0`，`10:24 ~ 18:00`（`7.6h`，`Mood 40~69`）回血 `7.6 × 1.25 = +9.5`，每日合計 `+15.5` 且零扣血。各日 `08:00` 照護前精確為：Day 3 `08:00` 達 `56.0`、Day 4 `08:00` 達 `71.5`、Day 5 `08:00` 達 `87.0`。
       - **Day 5 滿血重置驗證：** Day 5 `08:00` 起算（`Health = 87.0`），經 `08:00 ~ 10:24`（`2.4h × +2.5/hr = +6.0`）達 `93.0`；接續 `10:24 ~ 16:00`（`5.6h × +1.25/hr = +7.0`），於 Day 5 `16:00` 精確達成 `Health = 93.0 + 7.0 = 100.0` 並自動重置為 `RecoveryState = "NORMAL"`、`recoveryBoostAccumulatedHours = 0`。
       - **Day 6 ～ Day 60：** 全程維持 `Health = 100.0`、`RecoveryState = "NORMAL"`（每日 `08:00` 照護前 `Hunger = 26.4`、`Hydration = 26.4`、`Mood = 50.0`、`below40Hours = 0`、`below20Hours = 0`，每日 Health 扣減 `0`），證明每日一次免費照護具備完整長期救援與維持健康能力。
     - **子情境 B-3（長期僅於 `08:00` 餵食飲水但不陪伴情境驗證 — 隔離飢餓與缺水懲罰，依日間 `1.25/hr`、夜間 `0.375/hr` 實際衰退率與 TimeEngine 交點精確模擬）：** 初始 Fixture 明確指定為 `startTime = Day 1 08:00`、`hunger = 80`、`hydration = 80`、`mood = 85`、`health = 100`、`recoveryState = "NORMAL"`、`lowMoodDuration = { below40Hours: 0, below20Hours: 0 }`。若玩家連續 10 日每日僅於 `08:00` 餵 3 糧 + 3 水但不互動（因 `Hunger` 與 `Hydration` 日衰退均為 `73.6`，3 糧 + 3 水使兩者每日照護後均達 `100.0`、次日照護前均為 `26.4`，全程嚴格維持 `>= 20`，**完全隔離飢餓與缺水對 Health 及 Mood 的干擾**；每日 `08:00` 瞬間增加 `Mood +12`，隨後 24 小時基礎衰退 `Mood -23`，各日 `08:00` 照護後 Mood 依序為 Day 1: 97、Day 2: 86、Day 3: 75、Day 4: 64、Day 5: 53、Day 6: 42、Day 7: 31、Day 8: 20、Day 9: 12、Day 10: 12；須以 Game Core TimeEngine 實際模擬結果為最終驗收依據）：
       1. **階段 1（無扣血期，Day 1 `08:00` ~ Day 9.067）：** Day 5 晚間雖曾短暫跌破 40，但 Day 6 `08:00` 照護後 Mood 拉回 42（重置 `below40Hours = 0`），隨後依日間衰退率 `1.25/hr` 經 `1.6` 小時於 **Day 6.067**（Day 6 `09:36`）再次跌破 40（開始連續累計 `below40Hours`）；雖於 Day 6 末段短暫跌破 20，但 **Day 7 `08:00`** 的餵食飲水脈衝將 Mood 拉回 31，使 `below20Hours` 立即歸零重置（`below40Hours` 則持續累計）；直到 **Day 8 `08:00`** 脈衝後 `Mood = 20`（重置 `below20Hours = 0`）隨即再次跌破 20，才開始連續累計 `below20Hours`。在 `below40Hours` 未滿 `72h` 前全程零扣血。
       2. **階段 2（一般低落扣血期，Day 9.067 ~ Day 10.000）：** 當 **Day 9.067**（Day 9 `09:36`）`below40Hours` 精確跨越 `72.0` 小時後（嚴格 `> 72.0`）且 `below20Hours` 尚未超過 `48.0` 小時（`<= 48.0`）之區間（共 **`22.4` 小時**），從該交點之後的時間區段開始啟動 **`-0.05/hr`** 緩慢扣血（此階段累計扣除 **`1.12`** 點 Health）。
       3. **階段 3（嚴重低落扣血期與 40 安全地板，Day 10.000 起）：** 當 **Day 10.000**（Day 10 `08:00` 結算交點）`below20Hours` 精確跨越 `48.0` 小時後（嚴格 `> 48.0`），從該交點之後的時間區段開始切換為 **`-0.1/hr`**（每日 `-2.4` 點 Health，取代 `-0.05/hr` 不疊加），且受 `Health >= 40` 安全地板保護（絕不會因不陪伴而進入 `CRITICAL` 或死亡），玩家回來陪伴玩耍與使用商品即可輕鬆回滿。
   - **情境 C（連續 3 日未登入後的初始救援，以及後續每日早晚照護恢復驗收 — 方案 A 持續照護劇本）：** 初始救援階段模擬玩家連續 3 日未登入後，於 Day 1 `08:00` 返回並執行一次初始救援照護（登入時貓咪處於 `Hunger = 0, Hydration = 0, Mood = 0, Health = 10, recoveryState = "CRITICAL"`）。玩家於 Day 1 `08:00` 連續執行初始救援照護（3 免費乾糧 + 3 免費飲水 + 2 凍乾原肉丁零食 + 10 次陪伴互動；依 §8.C.3 規則，超過每日 25 積分上限後 `mood +3` 照常生效），照護後立即為 `Hunger = 0 + (3×25) + (2×8) = 91 (>= 60)`、`Hydration = 0 - (3×2) + (3×32) - (2×1) = 88 (>= 60)`、`Mood = 0 + (3×2) + (3×2) + (2×14) + (10×3) = 70 (>= 70)`。
     - **階段 1（初始救援與 2 小時急速脫險）：** 經過 2 小時（Day 1 `08:00 ~ 10:00`）`RECOVERY_BOOST (+10.0/hr)`，`Health` 從 `10` 恢復至 `30.0`（於 `10:00` 耗盡 `2.0h` Boost 額度並精確轉為 `NATURAL_RECOVERY`）。
     - **階段 2（自 Day 1 `20:00` 起之每日早晚持續恢復與自然回血暫停規則）：** 自 Day 1 `20:00` 起，每日固定於 `08:00` 與 `20:00` 各執行 2 份免費乾糧、2 份免費飲水及 2 次互動照護（單次補充 `Hunger +50`、`Hydration +60`、`Mood +14`），直到 `Health` 達到 `100`。
     - **完整 24 小時（含夜間）Recovery 計算要求：**
       1. 每次照護後，`TimeEngine` 必須依照日夜時段切割，逐段計算需求衰退、Mood 變化及 Health Recovery。
       2. `Hunger < 60` 或 `Hydration < 60` 時，暫停 `NATURAL_RECOVERY`；當兩者均恢復至 `60` 以上時，立即依當下 Mood 區間恢復回血。
       3. **夜間 `23:00 ~ 07:00` 不得因為是夜間而自動暫停 Recovery。** 只要 `Hunger`、`Hydration` 符合門檻且 `RecoveryState` 允許回血，就必須依當下 Mood 區間持續恢復。
       4. 每次 `08:00` 與 `20:00` 照護指令必須先完成此前時間區間的模擬，再依序執行 `FeedPet ➔ DrinkWater ➔ PetCat/PlayWithPet`。
       5. `Health` 達到 `100` 時，立即 Clamp 為 `100`，`RecoveryState` 重置為 `NORMAL`，`recoveryBoostAccumulatedHours` 歸零。
       6. 測試輸出必須完整記錄：(a) 每日 `08:00`、`20:00` 照護前後的 `Hunger`、`Hydration`、`Mood`、`Health`；(b) 每個日夜區段的起訖時間、各數值、`RecoveryState`、實際回血時數及回血量；(c) 每日 `Hunger < 60` 或 `Hydration < 60` 的起訖時間及累積暫停時數；(d) `RecoveryState` 每次轉換的精確時間；(e) `Health` 首次達到 `100` 的精確日期與時間。
     - **逐段實際模擬參考時間表（最終驗收以 Game Core TimeEngine 實際執行輸出為準）：**
       - **Day 1 `08:00 ~ 10:00`（`2.0h`，日間）：** `RECOVERY_BOOST (+10.0/hr)` 回血 `+20.0` ➔ `Health = 30.0`（`10:00` 轉入 `NATURAL_RECOVERY`；結束時 `Hunger 83`、`Hydration 80`、`Mood 67.5`）。
       - **Day 1 `10:00 ~ 15:00`（`5.0h`，日間）：** 需求均 `>= 60`、Mood `40~69` (`+1.25/hr`) 回血 `+6.25` ➔ `Health = 36.25`（`15:00` 時 `Hydration` 降至 `60`）。
       - **Day 1 `15:00 ~ 15:45`（`0.75h`，日間）：** `Hydration < 60`（`15:00` `Hydration` 降至 `60`、`Hunger` 為 `63`），**`NATURAL_RECOVERY` 開始暫停**（`15:45` 時 `Hunger` 亦降至 `60.0`、`Hydration` 為 `57.0`、`Mood` 為 `60.3125`、`Health = 36.25`）。
       - **Day 1 `15:45 ~ 20:00`（`4.25h`，日間）：** `Hunger` 與 `Hydration` 均 `< 60`，**`NATURAL_RECOVERY` 持續暫停**（Day 1 累積暫停 `5.0h`：`Hydration < 60` 為 `15:00 ~ 20:00` 共 `5.0h`、`Hunger < 60` 為 `15:45 ~ 20:00` 共 `4.25h`；結束時 `Hunger 43`、`Hydration 40`、`Mood 55.0`、`Health = 36.25`）。
       - **Day 1 `20:00` 照護後：** `Hunger = 93`、`Hydration = 100`、`Mood = 69.0`、`Health = 36.25`。
       - **Day 1 `20:00 ~ 23:00`（`3.0h`，日間）：** 需求均 `>= 60`、Mood `40~69` (`+1.25/hr`) 回血 `+3.75` ➔ `Health = 40.0`（結束時 `Hunger 81`、`Hydration 88`、`Mood 65.25`）。
       - **Day 1 `23:00 ~ Day 2 07:00`（`8.0h`，夜間持續回血）：** 需求均 `>= 60`、Mood `40~69` (`+1.25/hr`) 回血 `+10.0` ➔ `Health = 50.0`（結束時 `Hunger 71.4`、`Hydration 78.4`、`Mood 62.25`）。
       - **Day 2 `07:00 ~ 08:00`（`1.0h`，日間）：** 需求均 `>= 60`、Mood `40~69` (`+1.25/hr`) 回血 `+1.25` ➔ `Health = 51.25`（照護前 `Hunger 67.4`、`Hydration 74.4`、`Mood 61.0`）。
       - **Day 2 `08:00` 照護後：** `Hunger = 100`、`Hydration = 100`、`Mood = 75.0`、`Health = 51.25`。
       - **Day 2 `08:00 ~ 12:00`（`4.0h`，日間）：** 需求均 `>= 60`、`Mood >= 70` (`+2.5/hr`) 回血 `+10.0` ➔ `Health = 61.25`（`12:00` 時 `Mood` 降至 `70.0`）。
       - **Day 2 `12:00 ~ 18:00`（`6.0h`，日間）：** 需求均 `>= 60`、Mood `40~69` (`+1.25/hr`) 回血 `+7.5` ➔ `Health = 68.75`（`18:00` 時 `Hunger/Hydration` 均降至 `60.0`）。
       - **Day 2 `18:00 ~ 20:00`（`2.0h`，日間）：** `Hunger/Hydration < 60`，**`NATURAL_RECOVERY` 暫停 `2.0h`**（結束時 `Hunger 52`、`Hydration 52`、`Mood 60.0`、`Health = 68.75`）。
       - **Day 2 `20:00` 照護後：** `Hunger = 100`、`Hydration = 100`、`Mood = 74.0`、`Health = 68.75`。
       - **Day 2 `20:00 ~ 23:00`（`3.0h`，日間）：** 需求均 `>= 60`、`Mood >= 70` (`+2.5/hr`) 回血 `+7.5` ➔ `Health = 76.25`（結束時 `Hunger 88`、`Hydration 88`、`Mood 70.25`）。
       - **Day 2 `23:00 ~ 23:40`（`2/3 h`，夜間持續回血）：** 需求均 `>= 60`、`Mood >= 70` (`+2.5/hr`) 回血 `+1.6667` ➔ `Health ≈ 77.9167`（`23:40` 時 `Mood` 降至 `70.0`）。
       - **Day 2 `23:40 ~ Day 3 07:00`（`22/3 h`，夜間持續回血）：** 需求均 `>= 60`、Mood `40~69` (`+1.25/hr`) 回血 `+9.1667` ➔ `Health ≈ 87.0833`（結束時 `Hunger 78.4`、`Hydration 78.4`、`Mood 67.25`）。
       - **Day 3 `07:00 ~ 08:00`（`1.0h`，日間）：** 需求均 `>= 60`、Mood `40~69` (`+1.25/hr`) 回血 `+1.25` ➔ `Health ≈ 88.3333`（照護前 `Hunger 74.4`、`Hydration 74.4`、`Mood 66.0`）。
       - **Day 3 `08:00` 照護後：** `Hunger = 100`、`Hydration = 100`、`Mood = 80.0`、`Health ≈ 88.3333`。
       - **Day 3 `08:00 ~ 12:40`（`14/3 h`，日間）：** 需求均 `>= 60`、`Mood >= 70` (`+2.5/hr`) 回血 `+11.6667` ➔ 於 **Day 3 `12:40`** 精確達成 **`Health = 100.0`**（此時 `Hunger ≈ 81.33`、`Hydration ≈ 81.33`、`Mood ≈ 74.17`），立即 Clamp 為 `100` 並重置為 `RecoveryState = "NORMAL"`、`recoveryBoostAccumulatedHours = 0`。
10. **TC-10（個體父母 7 基因座真實毛色遺傳、一胎 3～5 隻、彩蛋與 R1 防盲抽，v2.1.30 新增）：**
    - 驗證 `preset-parents.v1.json` 通用不變量（6 品種皆含公／母、公貓無三花／玳瑁、無相容規則衝突與無稀有突變），且不與特定父母名字或固定隻數寫死耦合。
    - 使用獨立固定種子序列（1,000 組）驗證：每胎隻數吻合 3 隻 `30% ± 5%`、4 隻 `40% ± 5%`、5 隻 `30% ± 5%`；子代性別吻合 `50%` 公／`50%` 母（`± 5%`）。
    - 驗證真實孟德爾毛色與眼色遺傳：三花母貓（`O/o`）生出之正常公貓拆色吻合 `50%` 橘系／`50%` 非橘系（`± 5%`）；雙純合稀釋（`dd × dd`）100% 表現稀釋色；重點色基因 `CC × cscs`（0%）、`Ccs × cscs`（50% ± 5%）、`cscs × cscs`（100%）；E1 具雙色基因條件之公貓 XXY 彩蛋觸發率吻合 `2%` 合理統計區間並輸出對應 `easterEggs` 標記；眼色符合真實生物學（`cs/cs` 非純白 100% `sapphire`、`W/-` 35% `sapphire` / 15% `heterochromia_blue_gold` ± 5%、`S/-` 非白非重點 5% `sapphire` / 5% `heterochromia_blue_gold` ± 3%、一般無白貓 `w/w + C/- + s/s` 0% 藍眼與 0% 異色瞳且吻合多基因虹膜光譜分布）。
    - 驗證領養預覽契約 `AdoptionKittenPreview` 僅輸出 `hasHiddenQuirks: boolean`，不含 `quirks` 陣列或數量；驗證 R1 每日 3 胎上限、跨日重置、時鐘回撥不重置、用完第 3 胎仍可領養最後一胎，以及 `AdoptionSlotPolicy` 帳號總免費擁有上限計算正確；同時確認既定 `TC-01`、`TC-02` 100% 零破壞通過。

### 8.E.3 Mood-Health 混合模式專屬自動化驗收測試清單 (`TC-MH-01 ~ TC-MH-12`)

1. **TC-MH-01（Mood 40+ 無扣血）：** 驗證 `Mood = 50` 持續 7 天，`Health` 維持 `100`，`below40Hours` 與 `below20Hours` 均保持 `0`。
2. **TC-MH-02（Mood 20~39 緩慢扣血與 72h 門檻）：** 驗證 `Mood = 30` 時，前 72 小時 `Health` 不扣減；超過 72 小時後每小時扣減 `0.05` Health。
3. **TC-MH-03（Mood 0~19 扣血與 48h 門檻）：** 驗證 `Mood = 10` 時，前 48 小時 `Health` 不扣減；超過 48 小時後每小時扣減 `0.1` Health（不與 `-0.05` 疊加）。
4. **TC-MH-04（Health 40 安全地板 — 隔離測試）：** 在保持 `Hunger >= 60` 且 `Hydration >= 60`（確保不觸發飢餓／缺水扣血）的前提下，設定初始 `Health = 40.5` 且 `Mood = 10` 持續滿 `48h` 後再推進 10 小時，驗證當 `Health` 降至 `40.0` 的交點時 `MoodHealthPenalty` 扣減量強制歸 0，最終 `Health` 精確停在 `40.0`，絕不降至 `39.95` 或低於 `40`。
5. **TC-MH-05（低心情扣血與飢餓扣血獨立疊加、40 地板邊界與 10 下限斷言）：** 測試起點設為 Day 1 `08:00`，初始狀態明確指定為 `health = 50.0`、`hunger = 10.0`（`< 20`，單獨觸發 `-2.0/hr` 飢餓扣血）、`hydration = 100.0`（全程維持 `>= 20`，隔離缺水影響以僅測 `hunger < 20`）、`mood = 10.0`（`< 20`），且低心情計時器起始位於門檻邊界 `lowMoodDuration = { below40Hours: 72.0, below20Hours: 48.0 }`（依 §8.C.1 規則，推進時間使 `below20Hours > 48.0` 時立即自跨過 48 小時門檻後起算 `-0.1/hr`，非將等於 48 視為已超過門檻）。連續推進 **20.0 小時**（Day 1 `08:00` ➔ Day 2 `04:00`，結束時 `hydration = 34.0 >= 20`）：(1) **階段 1（`0 ~ 10/2.1 ≈ 4.7619` 小時）**：`health > 40` 區間內總扣血速度為 `-2.1/hr`，於約 `4.7619` 小時精確抵達 `health = 40.0`；(2) **階段 2（`4.7619 ~ 19.7619` 小時，共 `15.0` 小時）**：抵達 `health = 40.0` 交點後，`MoodHealthPenalty` 立即停止（變為 `0`），僅 `hunger < 20` 繼續以 `-2.0/hr` 扣血，使 `health` 正常跌入 `CRITICAL`（`< 40`）並於累計約 `19.7619` 小時精確抵達保護下限 `health = 10.0`；(3) **階段 3（`19.7619 ~ 20.0` 小時）**：斷言 `20.0` 小時結束時 `health` 嚴格維持於保護下限 `10.0`，不得低於 `10`。
6. **TC-MH-06（Mood 恢復時立即重置計時器）：** 驗證 `below40Hours` 累計至 50 小時後，透過撫摸使 `Mood` 升至 45，`below40Hours` 立即歸零；再次降至 30 時需重新累計 72 小時才開始扣血。
7. **TC-MH-07（`NATURAL_RECOVERY` 分級速度 `Mood >= 70`）：** 驗證處於 `NATURAL_RECOVERY` 且 `Hunger >= 60, Hydration >= 60, Mood = 75` 時，恢復速度為 `+2.5/hr`。
8. **TC-MH-08（`NATURAL_RECOVERY` 分級速度 `Mood 40~69`）：** 驗證處於 `NATURAL_RECOVERY` 且 `Hunger >= 60, Hydration >= 60, Mood = 50` 時，恢復速度為 `+1.25/hr`。
9. **TC-MH-09（`NATURAL_RECOVERY` 暫停 `Mood < 40`）：** 驗證處於 `NATURAL_RECOVERY` 且 `Hunger >= 60, Hydration >= 60, Mood = 30` 時，恢復暫停（`+0/hr`）。
10. **TC-MH-10（離線模擬分段一致性）：** 驗證一次模擬 120 小時（跨越 72h 低心情門檻與 40 安全地板）與分 10 次每次 12 小時模擬，最終 `Health`、`Mood`、`lowMoodDuration` 結果誤差 `< 1e-9`。
11. **TC-MH-11（存檔與讀檔持久化）：** 驗證 `lowMoodDuration`（`below40Hours` 與 `below20Hours`）跨越存檔與重啟生命週期時完整保留並正確續算（以下數值為測試 fixture，非新增遊戲規則或調整門檻）：
    - **測試前置狀態（Fixture）：** 測試起點設為 Day 1 `08:00`，`health = 100`、`mood = 10`（確保推進期間維持 `Mood < 20`，兩項計時器同步累加）、`hunger = 80`、`hydration = 80`（隔離飢餓／缺水干擾），且 `lowMoodDuration = { below40Hours: 55.5, below20Hours: 23.5 }`。
    - **測試步驟與斷言：** (1) 建立上述初始狀態；(2) 寫入存檔；(3) 關閉並重新載入存檔；(4) 斷言讀檔後 `below40Hours === 55.5` 且 `below20Hours === 23.5`（誤差 `< 1e-9`）；(5) 推進模擬時間 `1.0` 小時；(6) 斷言推進後 `below40Hours === 56.5` 且 `below20Hours === 24.5`（由原累積值續算而非歸零，誤差 `< 1e-9`）。
    - **分階段 Adapter 執行時程：** Phase A 以 JSON Adapter 執行 `TC-MH-11`（不要求提前實作 SQLite）；Phase C 待 SQLite Adapter 完成後，以相同測試案例與驗收條件執行；兩種 Adapter 皆須保證 `lowMoodDuration` 之序列化與反序列化結果完全一致。
12. **TC-MH-12（夜間係數不影響低心情扣血）：** 驗證夜間 (`23:00~07:00`) 觸發低心情扣血時，扣血速率維持 `-0.05/hr` 或 `-0.1/hr`，不受 `0.3` 時段係數減免。

---

# 9. 產品範圍與非目標 (Scope & Non-Goals)

## 9.1 MVP 核心範圍

1. 單隻貓咪領養與 7 層確定性外觀生成、三層性格行為決策、0.25 小時步進與精確交點離線時間差補算、健康救援狀態機、無懲罰 Care Pause 照護暫停模式、防損本機存檔與 Save Migration、Android 全域懸浮窗、iOS App 內養成與狀態 Widget、積分商店與商品營養分析探索。

## 9.2 MVP 明確排除 (Non-Goals，保留介面但延後至 Phase E)

1. 多隻貓咪同時飼養、即時背景常駐耗電服務、伺服器端防作弊結算、好友即時連線與串門子、GPS/LBS 戶外散步與跳蚤系統、自動截圖相簿、LLM 自由對話與付費月卡。

---

# 10. 隱私、權限與錯誤處理降級規範 (Privacy & Fallback)

## 10.1 最小權限與資料隱私規範

1. Android 僅於完成領養後引導授權 `SYSTEM_ALERT_WINDOW`（拒絕授權仍可於 App 內正常遊玩）；計步器與定位權限於 MVP 階段完全不申請。
2. 問卷與統計僅於使用者明確同意下收集不可識別個人的匿名彙總數據，嚴禁販售個別使用者行為軌跡或定位紀錄。

## 10.2 異常降級與 Fallback 策略

1. **遠端設定檔失敗：** 遠端設定載入功能於 Phase D 配合商店與品牌商品目錄導入 Remote Config Provider 後啟用（Phase A ～ C 不實作遠端下載）：
   1. 網路中斷時，使用已驗證的本機快取設定。
   2. 遠端 JSON 下載失敗或 Schema 驗證失敗時，不得將未驗證資料注入 Game Core。
   3. 本機快取不存在或無法通過驗證時，使用內建且已驗證的預設設定檔。
   4. 若無任何可用的有效設定檔，應停止載入依賴該設定的功能並回報明確錯誤，不得以不完整資料繼續執行。
   5. Game Core 不得直接連線或依賴特定遠端服務；設定來源由 Remote Config Provider 管理。
2. **系統時間倒退異常：** 若偵測到裝置時間倒退（`now < lastSimulatedAt`），`TimeEngine` 忽略負時間差（`Δt = 0`）並記錄異常時間事件，**嚴禁覆寫或修改原本的 `lastSimulatedAt`**，待裝置時間恢復正常區間後再行補算，防止時間回撥造成異常暴增補算。
3. **權限撤銷：** 若使用者於系統設定撤銷 Android 懸浮窗權限，App 自動切換為「App 內模式」並保存進度，不產生閃退。

---

# 11. 版本控制與開發工作拆分 (Versioning & Sprint Plan)

## 11.1 獨立版本號管理

1. 系統將 `gameCoreVersion`、`prngAlgorithmVersion`、`geneticsVersion`、`contentVersion` 與 `saveSchemaVersion` 獨立分開管理，確保更新商品目錄或調整數值平衡時，不會破壞既有貓咪外觀或玩家存檔。

## 11.2 Sprint 執行順序

1. **Sprint 0（Phase A 前置 — 治理銜接與 Monorepo 底座）：** 導入拾戰公司制度（Branch/PR、R2/R3 授權、worktree QA、3 行回報）、補 `.gitignore`、安裝本機 `pre-push` hook、建立 pnpm Monorepo + TypeScript strict + Vitest + 自動純淨度檢核腳本與空白可視化看板骨架。
2. **Sprint 1（Phase A - 契約、設定與基因引擎）：** 建立 `packages/contracts`、`packages/config-loader`（Local 模式＋三區塊商品 Schema＋資料驅動內定父母池驗證）、`content/` 靜態設定檔、`PetState` 模型與 `GeneticsEngine`（涵蓋純品種遺傳 `TC-01`/`TC-02` 及個體父母 7 基因座真實毛色遺傳、一胎 3～5 隻、E1 彩蛋與 R1 防盲抽 `TC-10`），並於 `apps/local-sandbox` 提供「皮克敏式 2D 換色選父母領養一胎 3～5 隻 ＋ 1,000 隻機率分布」可視化驗收。
3. **Sprint 2（Phase A - 時間、健康救援與經濟存檔）：** 實作 `TimeEngine`（0.25 小時區段步進、精確交點切割、時區注入與時間倒退保護）、健康救援狀態機、`MoodHealthPenalty`、`EconomyEngine`、背包系統與防損 JSON 存檔（通過 `TC-03`、`TC-04`、`TC-07`、`TC-MH-01 ~ TC-MH-12`），並於 `apps/local-sandbox` 提供「時間快轉＋Care Pause＋模擬商店與存檔」可視化驗收。
4. **Sprint 3（Phase A - 行為決策、CLI 與長時模擬驗收）：** 實作 `BehaviorEngine` 三層決策與同級仲裁、`apps/local-cli` 互動操作介面、365 天長時模擬與每日照護負擔驗證（通過 `TC-05`、`TC-06`、`TC-08`、`TC-09`），並於 `apps/local-sandbox` 提供「連戳互動冷卻＋60/365 天趨勢曲線」驗收。
5. **Sprint 4（Phase B - 雙平台渲染 PoC）：** 建立單隻測試貓，驗證 React Native、Android Kotlin 懸浮窗與 iOS SwiftUI Widget 消費同一份 `PetViewModel` 之一致性。
