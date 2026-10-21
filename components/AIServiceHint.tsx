import React from "react";
import { getAIConfig, isLocalEndpoint } from "../AIService";

const AIServiceHint: React.FC = () => {
	const cfg = getAIConfig();
	const host = cfg.baseUrl.replace(/^https?:\/\/([^/]+).*$/, "$1");
	const needsKey = !cfg.apiKey && !isLocalEndpoint(cfg.baseUrl);
	const modelExplicit =
		cfg.model && cfg.model !== "" && cfg.model !== "nvidia/nemotron-3-ultra-550b-a55b";

	return (
		<div
			className={`border fixed flex flex-row items-center justify-center gap-2 bottom-5 left-5 right-5 w-fit z-[99] px-4 py-2 max-w-[50] rounded-xl backdrop-blur-[50px] ${
				needsKey
					? "bg-amber-500/10 dark:bg-amber-900/10 border-amber-500/30 text-amber-500"
					: "hidden bg-emerald-500/10 dark:bg-emerald-900/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
			} font-bold`}
		>
			<i className="fas fa-plug text-3xl"></i>
			<div className="flex flex-col justify-start items-start">
				{needsKey ? (
					<span>
						尚未設置 API 密鑰，AI 服務暫時不可用。請到「統計 →
						API 設置」配置 Base URL 與密鑰。
					</span>
				) : (
					<span>
						AI 服務已配置：{cfg.model || "（未設定模型）"}（
						{host}）
					</span>
				)}
				{!needsKey && modelExplicit && (
					<span className="opacity-70 text-xs">
						可於「統計 → API 設置」隨時更改。
					</span>
				)}
			</div>
		</div>
	);
};

export default AIServiceHint;
