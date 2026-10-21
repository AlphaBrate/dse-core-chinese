import type { IncomingMessage, ServerResponse } from "http";

/**
 * 通用 AI 中轉站（Vercel 無伺服器函數）。
 *
 * 與 vite.config.ts 中的 dev 中轉中間件共用同一協議：
 *   前端 POST /api/relay  { target, apiKey, payload }
 *   本函數在伺服器端把請求轉發到 target（無 CORS 限制），
 *   原樣透傳上游的 HTTP 狀態碼與回應內容。
 *
 * 安全性：
 *   - 只允許公開的 http(s) 端點，且路徑必須以 /chat/completions 結尾，
 *     避免被當作通用開放代理。
 *   - 阻擋回環 / 鏈路本地 / 雲端中繼位址（SSRF 防護）。
 */
export default async function handler(
	req: IncomingMessage,
	res: ServerResponse
) {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ error: { message: "僅支援 POST" } }));
		return;
	}

	let raw = "";
	for await (const chunk of req) raw += chunk;

	let parsed: { target?: string; apiKey?: string; payload?: unknown };
	try {
		parsed = JSON.parse(raw);
	} catch {
		res.statusCode = 400;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ error: { message: "請求體格式錯誤" } }));
		return;
	}

	const target = typeof parsed.target === "string" ? parsed.target : "";
	const apiKey = typeof parsed.apiKey === "string" ? parsed.apiKey : "";

	if (!isAllowedTarget(target)) {
		res.statusCode = 400;
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				error: {
					message:
						"中轉目標不被允許：僅接受公開的 OpenAI 相容 chat/completions 端點（https）。",
				},
			})
		);
		return;
	}

	try {
		const upstream = await fetch(target, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
			},
			body: JSON.stringify(parsed.payload ?? {}),
		});
		res.statusCode = upstream.status;
		const text = await upstream.text();
		const contentType = upstream.headers.get("content-type");
		if (contentType) res.setHeader("Content-Type", contentType);
		res.end(text);
	} catch (error) {
		res.statusCode = 502;
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				error: {
					message: "中轉站無法連接到目標服務，請檢查 Base URL 是否正確。",
				},
			})
		);
	}
}

function isAllowedTarget(target: string): boolean {
	let url: URL;
	try {
		url = new URL(target);
	} catch {
		return false;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return false;
	if (!/\/chat\/completions$/i.test(url.pathname)) return false;
	const host = url.hostname.toLowerCase();
	if (
		host === "localhost" ||
		host === "0.0.0.0" ||
		host === "::1" ||
		host.startsWith("127.") ||
		host === "169.254.169.254" ||
		host.startsWith("169.254.")
	)
		return false;
	return true;
}
