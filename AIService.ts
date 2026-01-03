import { Question, GradingResult, SavedResult } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = localStorage.modelID || "xiaomi/mimo-v2-flash:free";

console.log("Using Model " + MODEL_NAME);

/**
 * Core Fetch Wrapper for OpenRouter
 */
async function callOpenRouter(
	systemInstruction: string,
	promptText: string,
	isJson: boolean = false
) {
	const response = await fetch(OPENROUTER_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${
				localStorage.getItem("user_api_key") || ""
			}`,
			"HTTP-Referer": "https://aphbrt.web.app/dse/chinese", // Optional
			"X-Title": "AlphaBrate DSE", // Optional
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: MODEL_NAME,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: promptText },
			],
			response_format: isJson ? { type: "json_object" } : undefined,
		}),
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(
			errorData.error?.message || "OpenRouter Request Failed"
		);
	}

	const data = await response.json();
	return data.choices[0].message.content;
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

    【評分準則】：
    - 「exact」：針對原文摘錄。
    - 「point」：意對即可。
    - 對於分析題，必須包含文本依據與推論過程。

	重要提示：
	- 你必須只輸出一個 JSON 對象，不得輸出任何其他東西，第一個字符必須是 「{」必須以「}」结尾。
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
		let content = await callOpenRouter(
			systemInstruction,
			promptText,
			true
		);
		content = content.replaceAll(":「", `:"`);
		if (localStorage.printAIOutput === "true") console.log(content);
		return JSON.parse(content) as GradingResult;
	} catch (error) {
		console.error("Grading error:", error);

		throw new Error(error);
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
		const content = await callOpenRouter(systemInstruction, promptText);
		if (localStorage.printAIOutput === "true") console.log(content);
		return content.trim() || "無法生成提示。";
	} catch (error) {
		return "提示功能暫時無法使用。";
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
		const content = await callOpenRouter(systemInstruction, promptText);
		if (localStorage.printAIOutput === "true") console.log(content);
		return content.trim() || "無法生成答題框架。";
	} catch (error) {
		return "框架功能暫時無法使用。";
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
		const content = await callOpenRouter(systemInstruction, promptText);
		if (localStorage.printAIOutput === "true") console.log(content);
		return content || "暫時無法分析弱點。";
	} catch (error) {
		return "分析功能暫時不可用。";
	}
};
