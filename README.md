# AlphaBrate for DSE | Core Chinese

**AlphaBrate for DSE** is an integrated AI-powered question bank platform tailored for the HKDSE curriculum. It leverages advanced technology to provide Hong Kong students with a personalized and comprehensive exam preparation experience.

> 以下內容將以繁體中文介紹。

**AlphaBrate for DSE - Core Chinese** 是一款專為香港中學文憑考試（HKDSE）設計的中文科範文深度學習平台。透過整合 AI 引擎，本平台實現了自動閱卷、深度分析、要點總結及個性化弱點診斷功能，將傳統的背誦學習提升至智能互動層次。

## 🌟 核心功能 (Core Features)

### 🤖 AI 智能閱卷系統
* **實時評分**：利用自然語言大模型，針對學生的分析題、字詞解釋及原文摘錄進行即時評分。
* **精準點評**：AI 能自動識別答案要點（Marking Scheme Points），並提供具體的改善建議與總結。

### 📚 範文全覆蓋（12 篇指定文言經典全收錄）
* 內建 DSE 核心範文（由《論語》至《六國論》，含《逍遙遊》《出師表》及唐詩三首、宋詞三首）的 JSON 結構化題庫。
* 提供精確的原文翻譯數據與考點分析。

### 📑 五大專項模式
1. **原文模式**：支持「逐字」與「逐句」切換的語體文對照。
2. **練習模式**：沉浸式答題體驗，具備 AI 提示、答題框架引導及自動重練機制。
3. **瀏覽模式**：快速檢閱所有評分單元與官方參考答案。
4. **記憶模式**：自動提取「必考點」與核心摘錄，構建結構化記憶模型。
5. **錯題模式**：追蹤未掌握題目，由 AI 進行全局弱點診斷並生成報告。

### 📊 學習診斷中心
* **數據可視化**：直觀呈現首填正確率、題目覆蓋率及各範文掌握進度。

### 🎨 卓越 UI/UX 體驗
* **多端適配**：完整支持深色模式 (Dark Mode) 及移動端設備。
* **極致流暢**：細緻的進場與退場動畫（Fade, Zoom, Slide）。

---

## 🛠️ 技術棧 (Tech Stack)

* **Frontend**: React 19 (ESM Mode)
* **Styling**: Tailwind CSS
* **Icons**: Font Awesome 6
* **AI Engine**: OpenAI 相容 Chat Completions（自訂端點：OpenAI / DeepSeek / NIM / 本機模型）
* **Build System**: 無需編譯，直接透過 `index.html` 的 `importmap` 載入原生 ES Modules。
* **Persistence**: `localStorage` (儲存學習進度、錯題集及 API Key)。

---

## 📁 檔案結構 (Project Structure)

```text
.
├── App.tsx             # 主程式入口，管理路由與全域狀態
├── components/         # UI 組件庫
│   ├── Layout.tsx      # 整體佈局與導航控制
│   ├── QuizMode.tsx    # 核心練習邏輯與 AI 互動
│   ├── GuideModal.tsx  # 統計數據、技術指南與 API 設置
│   └── ...             # 其他功能組件
├── data/               # 結構化題庫 (JSON)
├── data/source/        # 原文與翻譯數據 (JSON)
├── AIService.ts    # AI 服務封裝 (評分、提示、分析；OpenAI 相容)
├── types.ts            # TypeScript 類型定義
├── utils.tsx           # 工具函數（如 Markdown 渲染器）
└── index.html          # 頁面入口與全域樣式

```

---

## 🔑 API 配置（完全 OpenAI 相容）

為了使用智能閱卷功能，用戶需要配置自己的 **OpenAI 相容（Chat Completions）AI 服務**，所有欄位皆可自訂：

1. 點擊 App 右上角的 **統計圖示**。
2. 切換至 **「API 設置」** 標籤。
3. 填寫 **Base URL**（如 `https://api.openai.com/v1`、`https://api.deepseek.com/v1`、`http://localhost:1234/v1`）、**模型名稱** 與 **API 密鑰**（本機模型可留空），並可自訂溫度與嚴格 JSON 模式。
4. 點擊「測試連線」確認可用後，點擊「保存配置」。

支援 OpenAI、DeepSeek、Kimi（Moonshot）、NVIDIA NIM 及 LM Studio / Ollama 等本機服務。

### 伺服器中轉架構

瀏覽器直接請求雲端 AI 端點會被 **CORS** 攔截，因此所有雲端請求都改為同源
`POST /api/relay`，由自己的伺服器中轉（伺服器端請求不受 CORS 限制）：

- **開發環境**：`vite.config.ts` 內建的 `aiRelay` 中間件，`npm run dev` 即可使用。
- **生產環境**：`api/relay.ts`（Vercel 無伺服器函數），與 dev 中間件共用同一協議。
- **本機模型**（localhost）：瀏覽器直連，不走中轉。

中轉站安全性：僅接受公開的 http(s) 端點且路徑必須以 `/chat/completions`
結尾（防止被當作通用開放代理），並阻擋回環 / 鏈路本地 / 雲端中繼位址（SSRF 防護）。

> **隱私聲明**：您的 API 密鑰及配置僅保存在瀏覽器的本地存儲（localStorage）中；發出請求時密鑰僅經由您自己的伺服器轉發至目標服務商，絕不會上傳至 AlphaBrate 後端。

---

## 💡 開發規範 (Engineering Principles)

* **高效能渲染**：利用 React 19 特性與 Tailwind CSS 原子化樣式，確保低配設備運行流暢。
* **魯棒性設計**：針對 AI 回傳數據進行嚴格校驗與錯誤處理，確保服務異常時仍有優雅提示。
* **無障礙設計**：遵循 WCAG 標準，確保全平台可用性與響應式佈局。

*Copyright © 2025 AlphaBrate. All rights reserved.*