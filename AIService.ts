import { Question, GradingResult, SavedResult } from "./types";

/**
 * OpenAI 相容接口配置。
 * 支援任何 OpenAI Chat Completions 相容的端點：
 * OpenAI、DeepSeek、Moonshot(Kimi)、NVIDIA NIM、以及 LM Studio / Ollama 等本機服務。
 * 所有欄位皆儲存在瀏覽器 localStorage，可完全自訂。
 */
export interface AIConfig {
  /** API 端點（Base URL），如 https://api.openai.com/v1 */
  baseUrl: string;
  /** API 密鑰；本機服務（localhost）可留空 */
  apiKey: string;
  /** 模型名稱，如 gpt-4o-mini、deepseek-chat */
  model: string;
  /** 取樣溫度 0–2 */
  temperature: number;
  /** 是否要求端點以 JSON 格式回應（部分端點不支援，預設關閉） */
  strictJson: boolean;
}

export const DEFAULT_CONFIG: AIConfig = {
  baseUrl: "https://integrate.api.nvidia.com/v1",
  apiKey: "",
  model: "nvidia/nemotron-3-ultra-550b-a55b",
  temperature: 0.7,
  strictJson: false,
};

/** localStorage 鍵名（舊鍵 user_api_key / modelID 會自動遷移） */
const KEYS = {
  baseUrl: "ai_base_url",
  apiKey: "ai_api_key",
  model: "ai_model",
  temperature: "ai_temperature",
  strictJson: "ai_strict_json",
};

/** 讀取當前 AI 配置，舊版 localStorage 鍵自動遷移。 */
export function getAIConfig(): AIConfig {
  const readNumber = (key: string, fallback: number): number => {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === "") return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    baseUrl:
      localStorage.getItem(KEYS.baseUrl) || DEFAULT_CONFIG.baseUrl,
    apiKey:
      localStorage.getItem(KEYS.apiKey) ||
      localStorage.getItem("user_api_key") ||
      "",
    model:
      localStorage.getItem(KEYS.model) ||
      localStorage.getItem("modelID") ||
      DEFAULT_CONFIG.model,
    temperature: readNumber(KEYS.temperature, DEFAULT_CONFIG.temperature),
    strictJson:
      localStorage.getItem(KEYS.strictJson) === "true"
        ? true
        : localStorage.getItem(KEYS.strictJson) === "false"
        ? false
        : DEFAULT_CONFIG.strictJson,
  };
}

/** 判斷端點是否為本機服務（本機服務通常不需要 API 密鑰）。 */
export function isLocalEndpoint(baseUrl: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])([:/]|$)/i.test(
    baseUrl.trim()
  );
}

/** 是否已有效配置 AI 服務（雲端端點必須有密鑰；本機端點只要有模型即可）。 */
export function isAIConfigured(): boolean {
  const cfg = getAIConfig();
  if (!cfg.model) return false;
  return !!cfg.apiKey || isLocalEndpoint(cfg.baseUrl);
}

/** 把使用者輸入的 Base URL 正規化為完整的 /chat/completions 端點。 */
export function normalizeEndpoint(baseUrl: string): string {
  let url = baseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  if (/\/chat\/completions$/i.test(url)) return url;
  const path = url.replace(/^https?:\/\/[^/]+/i, "");
  if (!path) return url + "/v1/chat/completions";
  if (/\/v1$/i.test(url)) return url + "/chat/completions";
  return url + "/chat/completions";
}

/** 擷取回應中的 JSON（容忍 markdown 程式碼塊等外框）。 */
function extractJson(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : trimmed;
}

/**
 * 核心請求：向指定 OpenAI 相容端點發送 Chat Completions。
 *
 * 路由規則：
 *   - 雲端端點（OpenAI / DeepSeek / Kimi / NIM 等）→ 同源 POST 到 /api/relay，
 *     由自己的伺服器（dev：Vite 中間件；生產：Vercel api/relay 函數）中轉，
 *     避免瀏覽器跨域請求被 CORS 攔截。
 *   - 本機端點（LM Studio / Ollama，localhost）→ 瀏覽器直連
 *     （本機服務預設開放 CORS，且不需要密鑰）。
 *
 * @param cfg 完整配置（可由表單臨時組合，不影響已保存設定）
 */
async function rawCall(
  cfg: AIConfig,
  systemInstruction: string,
  promptText: string,
  opts: { isJson?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const endpoint = normalizeEndpoint(cfg.baseUrl);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: promptText },
    ],
    temperature: cfg.temperature,
  };
  if (opts.isJson && cfg.strictJson) {
    body.response_format = { type: "json_object" };
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  const response = isLocalEndpoint(cfg.baseUrl)
    ? // 本機模型：瀏覽器直連
      await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
    : // 雲端模型：經由自己的伺服器中轉（同源請求，無 CORS）
      await fetch("/api/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: endpoint,
          apiKey: cfg.apiKey,
          payload: body,
        }),
      });

  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err?.error?.message || JSON.stringify(err);
    } catch {
      detail = await response.text().catch(() => "");
    }
    throw new Error(
      `AI 服務請求失敗（HTTP ${response.status}）${
        detail ? `：${detail}` : ""
      }。請檢查「API 設置」中的 Base URL、模型名稱與密鑰。`
    );
  }

  const data = await response.json();
  const content: string = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error(
      "AI 服務返回了空白回應。請確認模型名稱正確，或改用支援 Chat Completions 的端點。"
    );
  }
  return content;
}

/** 使用目前已保存的配置發送請求。 */
async function callOpenAI(
  systemInstruction: string,
  promptText: string,
  isJson: boolean = false
): Promise<string> {
  return rawCall(getAIConfig(), systemInstruction, promptText, { isJson });
}

/** 測試目前設定的 OpenAI 相容端點是否可用（只發送極短請求，不寫入 localStorage）。 */
export async function testAIConnection(
  config: Partial<AIConfig>
): Promise<{ ok: boolean; message: string }> {
  const merged: AIConfig = { ...getAIConfig(), ...config };
  if (!merged.model) {
    return { ok: false, message: "請先填寫模型名稱。" };
  }
  if (!merged.baseUrl.trim()) {
    return { ok: false, message: "請先填寫 Base URL。" };
  }
  if (!merged.apiKey && !isLocalEndpoint(merged.baseUrl)) {
    return { ok: false, message: "雲端端點需要 API 密鑰，請填寫後再測試。" };
  }
  try {
    const content = await rawCall(
      merged,
      "你是連線測試助手，只需簡短回覆。",
      "請只回覆「OK」兩個字。",
      { maxTokens: 8 }
    );
    const host = normalizeEndpoint(merged.baseUrl).replace(
      /^https?:\/\/([^/]+).*$/,
      "$1"
    );
    return {
      ok: true,
      message: `連線成功（${host}，模型 ${merged.model}）。`,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || "連線測試失敗，請檢查設定。",
    };
  }
}

/**
 * 1. AI Grading System
 */
export const gradeAnswer = async (
  question: Question,
  userAnswer: string
): Promise<GradingResult> => {
  const systemInstruction = `
    你是一位嚴謹且公正的 DSE 中文科閱卷組長。你的任務是根據「評分參考點」評核學生的作答。
    
    【重要安全規則】：
    1. **判定認真程度**：請優先考慮作答的「語境合理性」。
       - 對於「選擇題 (MC)」、「字詞解釋 (Vocabulary)」或「判斷題」，極短的答案（如「A」、「正確」、「抵擋」）是完全合理且正確的，**嚴禁**將其判定為非認真作答。
       - 僅當答案完全無意義（如純亂碼「asdfg」、隨機數字串「12345」）、或與題目完全無關時，才判定為「非認真作答」。
       - 對於判斷題，學生回答任何一類可以表示正確與否的回答都是被允許的（如「是、否」、「對、錯」、「T、F」、「Yes、No」）又或者任意搭配（如「T 錯」）都是可以的，必須隨機應變。
    2. **處置方式**：在確定為「非認真作答」（惡意灌水/亂填）的情況下：
       - 在 overallComment 中嚴格指出其態度問題。
       - 將所有 hit 設為 false，awardedScore 設為 0。
       - **feedback 數組必須為空 []**。嚴禁在這種情況下透露正確答案。
    3. 如果學生的答案表達「不知道」、「不會做」，請給予鼓勵性的 overallComment，但同樣將 feedback 設為空 []。
    4. 每一個 point 用戶不管答對答錯都應該有 comment。
    5. pointIndex 自 0 開始。
    6. 这个考试接受简体字。学生可以有错别字或者异体字。

    【評分準則】：
    - 「exact」：針對原文摘錄。
    - 「point」：意對即可。
    - 對於分析題，必須包含文本依據與推論過程。

    重要提示：
    - 你必須只輸出一個 JSON 對象，不得輸出任何其他東西，第一個字符必須是 「{」必須以「}」結尾。
    - 確保內容中不包括錯誤的格式，比如用 「 替換掉了 " 字符符號。必須注意。

    返回 JSON 對象：
    {
      "totalScore": 總分,
      "maxScore": 題目總分,
      "feedback": [
        {
          "pointIndex": 答案索引位,
          "awardedScore": 獲得分數,
          "hit": 是否符合得分要求,
          "comment": 具體的評語
        }
      ],
      "overallComment": 整體評價及建議
    }
  `;

  const promptText = `
    題目內容：${question.question.map((q) => q.text).join("")}
    題目類型：${question.type}
    官方評分準則：${JSON.stringify(question.answer)}
    考生作答內容：
    """
    ${userAnswer}
    """
  `;

  try {
    let content = await callOpenAI(systemInstruction, promptText, true);
    content = content.replaceAll(":「", `:"`);
    if (localStorage.printAIOutput === "true") console.log(content);
    return JSON.parse(extractJson(content)) as GradingResult;
  } catch (error: any) {
    console.error("Grading error:", error);
    throw new Error(
      error?.message ||
        "評分服務暫時無法使用，請檢查「API 設置」中的配置。"
    );
  }
};

/**
 * 2. Generate Question Hint
 */
export const getQuestionHint = async (question: Question): Promise<string> => {
  const systemInstruction = `你是一位資深的 DSE 中文科導師。請提供一個簡短提示。
  **重要限制：** - 直接輸出提示內容，嚴禁包含「提示：」或「Hint:」等任何標籤前綴。
  - 字數控制在 50 字內，支持 Markdown。`;

  const promptText = `
    題目：${question.question.map((q) => q.text).join("")}
    評分準則：${JSON.stringify(question.answer)}
  `;

  try {
    const content = await callOpenAI(systemInstruction, promptText);
    if (localStorage.printAIOutput === "true") console.log(content);
    return content.trim() || "無法生成提示。";
  } catch (error) {
    console.log(error);
    return "提示功能暫時無法使用，請檢查「API 設置」。";
  }
};

/**
 * 3. Generate Answer Framework
 */
export const getAnswerFramework = async (
  question: Question
): Promise<string> => {
  const systemInstruction = `你是一位 DSE 中文科助教。
  **嚴格規則：**
  1. 僅輸出「答題框架」內容，使用 Markdown（如 ### 答題框架）。
  2. 嚴禁包含任何招呼語（如「你好」、「不用擔心」）、嚴禁重複題目內容。
  4. 絕對不可洩漏任何正確答案。`;

  const promptText = `
    題目：${question.question.map((q) => q.text).join("")}
    請僅提供此題的引導式答題框架。
  `;

  try {
    const content = await callOpenAI(systemInstruction, promptText);
    if (localStorage.printAIOutput === "true") console.log(content);
    return content.trim() || "無法生成答題框架。";
  } catch (error) {
    console.log(error);
    return "框架功能暫時無法使用，請檢查「API 設置」。";
  }
};

/**
 * 4. Analyze Weaknesses
 */
export const analyzeWeaknesses = async (
  mistakeQuestions: Question[],
  progress: Record<string, SavedResult[]>
): Promise<string> => {
  const history = mistakeQuestions.map((q) => {
    const attempts = progress[q.QID] || [];
    return {
      title: q.question
        .map((s) => s.text)
        .join("")
        .substring(0, 50),
      type: q.type,
      attempts: attempts.map((a, idx) => ({
        attemptNumber: idx + 1,
        answer: a.answer,
        score: `${a.result.totalScore}/${a.result.maxScore}`,
        comment: a.result.overallComment,
      })),
    };
  });

  const systemInstruction = `你是一位 DSE 中文科專家分析師。
  請分析學生的錯題歷史數據。
  **特別注意：** 數據包含學生的「多次嘗試」。請分析其進步趨勢或是否存在「頑固性錯誤」（即重練後仍犯同樣錯誤）。
  請總結出其三大主要弱點，並提供具體的改進建議。使用 Markdown 格式輸出，語氣鼓勵且專業。不要使用引言。`;

  const promptText = `以下是學生的完整錯題與嘗試歷史數據：
  ${JSON.stringify(history)}
  
  請根據這些多維數據進行深度弱點診斷。`;

  try {
    const content = await callOpenAI(systemInstruction, promptText);
    if (localStorage.printAIOutput === "true") console.log(content);
    return content || "暫時無法分析弱點。";
  } catch (error) {
    console.log(error);
    return "分析功能暫時不可用，請檢查「API 設置」。";
  }
};
