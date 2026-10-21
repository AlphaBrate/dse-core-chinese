import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 通用 AI 中转站（Dev 模式）。
 *
 * 浏览器直接請求雲端 AI 端點（如 OpenAI / NVIDIA NIM）會被 CORS 攔截，
 * 因此所有非本機的 AI 請求改為同源 POST 到 /api/relay，
 * 由開發伺服器在伺服器端轉發到目標端點（伺服器端請求沒有 CORS 限制）。
 *
 * 生產環境由 api/relay.ts（Vercel 無伺服器函數）提供同一端點。
 */
function aiRelayPlugin(): Plugin {
	const isAllowedTarget = (target: string): boolean => {
		let url: URL;
		try {
			url = new URL(target);
		} catch {
			return false;
		}
		// 只允許 http(s)，且僅服務 OpenAI 相容的 chat/completions 端點（防止被當作通用代理）
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
		if (!/\/chat\/completions$/i.test(url.pathname)) return false;
		const host = url.hostname.toLowerCase();
		// 阻擋本機回環、鏈路本地與雲端中繼位址（SSRF 防護）
		if (
			host === 'localhost' ||
			host === '0.0.0.0' ||
			host === '::1' ||
			host.startsWith('127.') ||
			host === '169.254.169.254' ||
			host.startsWith('169.254.')
		)
			return false;
		return true;
	};

	return {
		name: 'ai-relay',
		configureServer(server) {
			server.middlewares.use('/api/relay', async (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405;
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ error: { message: '僅支援 POST' } }));
					return;
				}
				let raw = '';
				for await (const chunk of req) raw += chunk;
				let parsed: { target?: string; apiKey?: string; payload?: unknown };
				try {
					parsed = JSON.parse(raw);
				} catch {
					res.statusCode = 400;
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ error: { message: '請求體格式錯誤' } }));
					return;
				}
				const target = typeof parsed.target === 'string' ? parsed.target : '';
				const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey : '';
				if (!isAllowedTarget(target)) {
					res.statusCode = 400;
					res.setHeader('Content-Type', 'application/json');
					res.end(
						JSON.stringify({
							error: {
								message:
									'中轉目標不被允許：僅接受公開的 OpenAI 相容 chat/completions 端點（https）。',
							},
						})
					);
					return;
				}
				try {
					const upstream = await fetch(target, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
						},
						body: JSON.stringify(parsed.payload ?? {}),
					});
					res.statusCode = upstream.status;
					const text = await upstream.text();
					const contentType = upstream.headers.get('content-type');
					if (contentType) res.setHeader('Content-Type', contentType);
					res.end(text);
				} catch (error) {
					res.statusCode = 502;
					res.setHeader('Content-Type', 'application/json');
					res.end(
						JSON.stringify({
							error: {
								message: '中轉站無法連接到目標服務，請檢查 Base URL 是否正確。',
							},
						})
					);
				}
			});
		},
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	return {
		server: {
			port: 3000,
			host: '0.0.0.0',
		},
		plugins: [react(), aiRelayPlugin()],
		define: {
			'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
			'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
		},
		resolve: {
			alias: {
				'@': path.resolve(__dirname, '.'),
			}
		}
	};
});
