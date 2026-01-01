import React, { useState, useMemo, useEffect } from "react";
import { SavedResult, Question } from "../types";
import { TOPIC_MAP } from "../data";

interface GuideModalProps {
	isOpen: boolean;
	onClose: () => void;
	progress: Record<string, SavedResult[]>;
}

const GuideModal: React.FC<GuideModalProps> = ({
	isOpen,
	onClose,
	progress,
}) => {
	const [activeTab, setActiveTab] = useState<"profile" | "guide" | "api">(
		"profile"
	);
	const [allQuestions, setAllQuestions] = useState<Question[]>([]);
	const [isLoadingData, setIsLoadingData] = useState(false);
	const [isExiting, setIsExiting] = useState(false);

	// API Key State
	const [apiKey, setApiKey] = useState(
		localStorage.getItem("user_api_key") || ""
	);
	const [isSaved, setIsSaved] = useState(false);
	const [showKey, setShowKey] = useState(false);

	useEffect(() => {
		if (isOpen && allQuestions.length === 0) {
			const loadAll = async () => {
				setIsLoadingData(true);
				try {
					const promises = Object.values(TOPIC_MAP).map((path) =>
						fetch(path).then((res) => res.json())
					);
					const results = await Promise.all(promises);
					setAllQuestions(results.flat());
				} catch (err) {
					console.error(
						"Failed to load global questions for profile:",
						err
					);
				} finally {
					setIsLoadingData(false);
				}
			};
			loadAll();
		}
	}, [isOpen]);

	const handleInternalClose = () => {
		setIsExiting(true);
		setTimeout(() => {
			setIsExiting(false);
			onClose();
		}, 500); // 與 animate-out 持續時間一致
	};

	const handleSaveKey = () => {
		localStorage.setItem("user_api_key", apiKey);
		setIsSaved(true);
		setTimeout(() => setIsSaved(false), 2000);
	};

	const handleClearKey = () => {
		localStorage.removeItem("user_api_key");
		setApiKey("");
	};

	const stats = useMemo(() => {
		const qids = Object.keys(progress);
		if (qids.length === 0) return null;

		let firstTimeCorrectCount = 0;
		let totalAttemptsCount = 0;
		const typeStats: Record<
			string,
			{ total: number; score: number; count: number }
		> = {};
		const topicStats: Record<
			string,
			{ attempted: number; correct: number; total: number }
		> = {};
		const recentSubmissions: {
			qid: string;
			qText: string;
			result: SavedResult;
			topic: string;
		}[] = [];

		qids.forEach((qid) => {
			const attempts = progress[qid];
			const firstAttempt = attempts[0];
			const latestAttempt = attempts[attempts.length - 1];

			totalAttemptsCount += attempts.length;

			const isFirstCorrect =
				firstAttempt.result.totalScore / firstAttempt.result.maxScore >=
				0.8;
			if (isFirstCorrect) firstTimeCorrectCount++;

			const question = allQuestions.find((q) => q.QID === qid);
			if (question) {
				const type = question.type;
				if (!typeStats[type])
					typeStats[type] = { total: 0, score: 0, count: 0 };
				typeStats[type].total += latestAttempt.result.maxScore;
				typeStats[type].score += latestAttempt.result.totalScore;
				typeStats[type].count++;

				const topic =
					question.requires.find((r) => r.type === "knowledge")
						?.topic || "其他";
				if (!topicStats[topic])
					topicStats[topic] = { attempted: 0, correct: 0, total: 0 };
				topicStats[topic].attempted++;
				if (
					latestAttempt.result.totalScore /
						latestAttempt.result.maxScore >=
					0.8
				)
					topicStats[topic].correct++;

				attempts.forEach((a) => {
					recentSubmissions.push({
						qid,
						qText:
							question.question
								.map((s) => s.text)
								.join("")
								.substring(0, 40) + "...",
						result: a,
						topic,
					});
				});
			}
		});

		allQuestions.forEach((q) => {
			const topic =
				q.requires.find((r) => r.type === "knowledge")?.topic || "其他";
			if (!topicStats[topic])
				topicStats[topic] = { attempted: 0, correct: 0, total: 0 };
			topicStats[topic].total++;
		});

		return {
			attemptedCount: qids.length,
			firstTimeCorrectRate: (firstTimeCorrectCount / qids.length) * 100,
			totalAttempts: totalAttemptsCount,
			typeStats,
			topicStats: Object.entries(topicStats).map(([name, data]) => ({
				name,
				...data,
			})),
			recentHistory: recentSubmissions
				.sort((a, b) => b.result.timestamp - a.result.timestamp)
				.slice(0, 8),
		};
	}, [progress, allQuestions]);

	if (!isOpen && !isExiting) return null;

	return (
		<div
			className={`fixed inset-0 z-[110] flex items-center justify-center p-0 lg:p-4 bg-black/60 backdrop-blur-[5px] ${
				isExiting ? "animate-out fade-out" : "animate-in fade-in"
			} duration-500`}
			onClick={handleInternalClose}
		>
			<div
				className={`bg-white dark:bg-darkCard w-full max-w-5xl h-full lg:h-[85vh] lg:rounded-[48px] shadow-2xl lg:border lg:border-coreBorder dark:border-darkBorder flex flex-col overflow-hidden relative ${
					isExiting ? "animate-out zoom-out" : "animate-in zoom-in"
				} duration-500`}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					className="absolute top-0 left-0 right-0 z-30 h-[140px] pointer-events-none transition-all duration-500"
					style={{
						backdropFilter: "blur(5px)",
						WebkitBackdropFilter: "blur(5px)",
						maskImage:
							"linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
						WebkitMaskImage:
							"linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
					}}
				></div>

				<div className="absolute top-0 left-0 right-0 z-40 pt-10 pb-6 px-4 pointer-events-auto lg:px-12">
					<div className="flex justify-between items-center">
						<div className="text-left animate-in blur-in">
							<h2 className="text-2xl dark:text-white">
								<span className="font-bold ">AlphaBrate</span>{" "}
								for DSE
							</h2>
						</div>
						<button
							onClick={handleInternalClose}
							className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-all active:scale-90 border border-black/5 dark:border-white/5 shadow-sm"
						>
							<i className="fas fa-times text-coreText dark:text-white"></i>
						</button>
					</div>
				</div>

				<div className="flex-grow overflow-y-auto px-4 lg:px-12 pt-40 pb-40 custom-scrollbar text-left relative">
					{activeTab === "profile" && (
						<div className="space-y-12 animate-in blur-in">
							{isLoadingData && allQuestions.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-20 text-coreMuted">
									<div className="w-8 h-8 border-2 border-brandBlue/20 border-t-brandBlue rounded-full animate-spin mb-4"></div>
									<p>正在分析全量數據庫...</p>
								</div>
							) : !stats ? (
								<div className="text-center py-20">
									<div className="w-20 h-20 bg-coreGray dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-coreMuted">
										<i className="fas fa-database text-3xl"></i>
									</div>
									<h3 className="text-xl font-bold dark:text-white mb-2">
										暫無學習數據
									</h3>
									<p className="text-coreMuted">
										一旦你開始在「練習」模式提交答案，系統將會在此生成你的專屬報告。
									</p>
								</div>
							) : (
								<>
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										<div className="bg-brandBlue text-white p-8 rounded-[40px] shadow-xl shadow-brandBlue/20 relative overflow-hidden group">
											<div className="absolute -right-4 -bottom-4 opacity-10 text-9xl transition-transform duration-700 group-hover:scale-110">
												<i className="fas fa-bullseye"></i>
											</div>
											<div className="relative z-10">
												<span className="text-[0.65rem] font-black uppercase tracking-widest opacity-60">
													首填正確率 (First Hit)
												</span>
												<div className="text-5xl font-black mt-2 mb-1 tabular-nums">
													{Math.round(
														stats.firstTimeCorrectRate
													)}
													%
												</div>
												<p className="text-xs font-medium opacity-80">
													反映你最原始的知識儲備
												</p>
											</div>
										</div>
										<div className="bg-coreGray/50 dark:bg-white/5 p-8 rounded-[40px] border border-coreBorder dark:border-white/10 shadow-sm">
											<span className="text-[0.65rem] font-black text-coreMuted uppercase tracking-widest">
												總覽題目覆蓋率
											</span>
											<div className="text-4xl font-black mt-2 mb-1 dark:text-white tabular-nums">
												{stats.attemptedCount}{" "}
												<span className="text-xl text-coreMuted">
													/ {allQuestions.length}
												</span>
											</div>
											<div className="w-full h-2 bg-coreBorder dark:bg-white/10 rounded-full mt-3 overflow-hidden">
												<div
													className="h-full bg-brandBlue"
													style={{
														width: `${
															(stats.attemptedCount /
																allQuestions.length) *
															100
														}%`,
													}}
												></div>
											</div>
										</div>
										<div className="bg-coreGray/50 dark:bg-white/5 p-8 rounded-[40px] border border-coreBorder dark:border-white/10 shadow-sm">
											<span className="text-[0.65rem] font-black text-coreMuted uppercase tracking-widest">
												平均重練次數
											</span>
											<div className="text-4xl font-black mt-2 mb-1 dark:text-white tabular-nums">
												{(
													stats.totalAttempts /
													stats.attemptedCount
												).toFixed(1)}
											</div>
											<p className="text-xs font-medium text-coreMuted">
												每題平均練習次數
											</p>
										</div>
									</div>

									<div className="grid lg:grid-cols-2 gap-12">
										<div className="space-y-6">
											<h3 className="text-lg font-black dark:text-white flex items-center gap-3 ml-2">
												<i className="fas fa-layer-group text-brandBlue"></i>{" "}
												範文掌握進度
											</h3>
											<div className="grid gap-4">
												{stats.topicStats.map(
													(topic) => (
														<div
															key={topic.name}
															className="p-6 rounded-[32px] bg-coreGray/30 dark:bg-white/5 border border-coreBorder dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-all duration-500 shadow-sm"
														>
															<div className="flex justify-between items-center mb-2">
																<span className="font-bold dark:text-white text-xs">
																	{topic.name}
																</span>
																<span className="text-[0.6rem] font-black text-coreMuted">
																	{
																		topic.attempted
																	}{" "}
																	/{" "}
																	{
																		topic.total
																	}{" "}
																	題
																</span>
															</div>
															<div className="w-full h-1.5 bg-coreBorder dark:bg-white/10 rounded-full overflow-hidden flex">
																<div
																	className="h-full bg-brandBlue"
																	style={{
																		width: `${
																			(topic.attempted /
																				topic.total) *
																			100
																		}%`,
																	}}
																></div>
															</div>
														</div>
													)
												)}
											</div>
										</div>

										<div className="space-y-6">
											<h3 className="text-lg font-black dark:text-white flex items-center gap-3 ml-2">
												<i className="fas fa-history text-amber-500"></i>{" "}
												最近作答歷程
											</h3>
											<div className="space-y-4">
												{stats.recentHistory.map(
													(h, idx) => (
														<div
															key={idx}
															className="p-6 rounded-[32px] bg-white dark:bg-white/5 border border-coreBorder dark:border-white/10 shadow-sm transition-all hover:border-brandBlue/30 hover:-translate-y-1 duration-500"
														>
															<div className="flex justify-between items-start mb-3">
																<div className="flex items-center gap-2">
																	<span className="bg-brandBlue/10 text-brandBlue text-[9px] font-black px-2 py-0.5 rounded-full">
																		{
																			h.topic
																		}
																	</span>
																	<span className="text-coreMuted text-[10px] tabular-nums">
																		{new Date(
																			h.result.timestamp
																		).toLocaleDateString()}
																	</span>
																</div>
																<div className="text-right">
																	<span
																		className={`text-sm font-black ${
																			h
																				.result
																				.result
																				.totalScore /
																				h
																					.result
																					.result
																					.maxScore >=
																			0.8
																				? "text-green-500"
																				: "text-brandBlue"
																		}`}
																	>
																		{
																			h
																				.result
																				.result
																				.totalScore
																		}
																		/
																		{
																			h
																				.result
																				.result
																				.maxScore
																		}
																	</span>
																</div>
															</div>
															<p className="text-xs font-bold dark:text-white/90 line-clamp-1 mb-3">
																「
																{h.result.answer.substring(
																	0,
																	60
																)}
																...」
															</p>
															<div className="p-4 bg-coreGray/30 dark:bg-black/20 rounded-2xl">
																<p className="text-[10px] text-coreMuted italic leading-relaxed">
																	AI 評語：
																	{h.result.result.overallComment.substring(
																		0,
																		80
																	)}
																	...
																</p>
															</div>
														</div>
													)
												)}
											</div>
										</div>
									</div>
								</>
							)}
						</div>
					)}

					{activeTab === "guide" && (
						<div className="space-y-12 animate-in blur-in">
							<section>
								<h3 className="text-xl font-bold mb-6 border-l-4 border-brandBlue pl-4 dark:text-white">
									1. 核心字段定義 (Core Fields)
								</h3>
								<div className="overflow-x-auto rounded-[32px] border border-coreBorder dark:border-darkBorder bg-coreGray/20 dark:bg-white/5 shadow-sm">
									<table className="w-full text-sm">
										<thead className="bg-coreGray/50 dark:bg-white/5">
											<tr>
												<th className="px-8 py-5 text-left font-black text-coreMuted uppercase tracking-widest text-[0.65rem]">
													字段
												</th>
												<th className="px-8 py-5 text-left font-black text-coreMuted uppercase tracking-widest text-[0.65rem]">
													類型
												</th>
												<th className="px-8 py-5 text-left font-black text-coreMuted uppercase tracking-widest text-[0.65rem]">
													說明
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-coreBorder dark:divide-darkBorder">
											{[
												"QID",
												"type",
												"question",
												"answer",
											].map((field) => (
												<tr key={field}>
													<td className="px-8 py-5 font-mono text-brandBlue font-bold">
														{field}
													</td>
													<td className="px-8 py-5 dark:text-white/70">
														String
													</td>
													<td className="px-8 py-5 dark:text-white/70">
														{field === "QID"
															? "唯一識別碼。如 CHI-山居秋暝-001"
															: field === "type"
															? "題目類型：mc, vocabulary, copy, analysis"
															: "結構化數據對象"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</section>

							<section>
								<h3 className="text-xl font-bold mb-6 border-l-4 border-brandBlue pl-4 dark:text-white">
									2. 題目類型規範
								</h3>
								<div className="grid md:grid-cols-2 gap-8">
									<div className="p-10 rounded-[40px] bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 shadow-sm">
										<h4 className="font-bold text-amber-900 dark:text-amber-400 mb-3 text-lg">
											mc (選擇題)
										</h4>
										<p className="text-sm opacity-80 dark:text-white/70 leading-relaxed">
											選項以 A/B/C/D 或 1/2/3/4
											開頭。系統支持多行選項解析，並能自動對齊。
										</p>
									</div>
									<div className="p-10 rounded-[40px] bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 shadow-sm">
										<h4 className="font-bold text-blue-900 dark:text-blue-400 mb-3 text-lg">
											vocabulary (字詞解釋)
										</h4>
										<p className="text-sm opacity-80 dark:text-white/70 leading-relaxed">
											針對粗體字進行解釋。題目中需包含「**」標記關鍵詞。
										</p>
									</div>
								</div>
							</section>
						</div>
					)}

					{activeTab === "api" && (
						<div className="max-w-2xl mx-auto space-y-12 animate-in blur-in">
							<div className="text-center mb-12">
								<div className="w-20 h-20 bg-brandBlue/10 text-brandBlue rounded-full flex items-center justify-center mx-auto mb-6">
									<i className="fas fa-key text-3xl"></i>
								</div>
								<h3 className="text-2xl font-black dark:text-white">
									AI 設置
								</h3>
								<p className="text-coreMuted mt-2">
									請粘貼你的 <b>OpenRouter</b> API 密鑰以激活
									<span className="whitespace-nowrap">
										AI 閱卷功能。
									</span>
								</p>
							</div>

							<div className="glass-card bg-coreGray/20 dark:bg-white/5 border border-coreBorder dark:border-white/10 p-8">
								<label className="block text-[0.6rem] font-black text-coreMuted uppercase tracking-widest mb-4">
									API Key 密鑰
								</label>
								<div className="relative group mb-8">
									<input
										type={showKey ? "text" : "password"}
										value={apiKey}
										onChange={(e) =>
											setApiKey(e.target.value)
										}
										placeholder="sk-or-..."
										className="w-full bg-white dark:bg-darkCard border-2 border-coreBorder dark:border-darkBorder rounded-2xl px-6 py-4 outline-none focus:border-brandBlue transition-all font-mono text-sm dark:text-white"
									/>
									<button
										onClick={() => setShowKey(!showKey)}
										className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-coreMuted hover:text-brandBlue transition-colors"
									>
										<i
											className={`fas ${
												showKey
													? "fa-eye-slash"
													: "fa-eye"
											}`}
										></i>
									</button>
								</div>

								<div className="flex gap-4">
									<button
										onClick={handleSaveKey}
										className={`flex-1 py-4 rounded-full font-bold transition-all duration-500 flex items-center justify-center gap-2 ${
											isSaved
												? "bg-green-500 text-white"
												: "bg-brandBlue text-white hover:scale-[1.02] shadow-lg shadow-brandBlue/20"
										}`}
									>
										{isSaved ? (
											<>
												<i className="fas fa-check"></i>{" "}
												已保存
											</>
										) : (
											<>
												<i className="fas fa-save"></i>{" "}
												保存配置
											</>
										)}
									</button>
									<button
										onClick={handleClearKey}
										className="px-8 py-4 rounded-full bg-coreGray dark:bg-white/10 font-bold text-coreMuted hover:text-red-500 transition-all"
									>
										清除
									</button>
								</div>
							</div>

							<div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-[32px]">
								<h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
									<i className="fas fa-info-circle"></i>{" "}
									如何獲取密鑰？
								</h4>
								<p className="text-sm text-coreMuted leading-relaxed">
									使用{" "}
									<a
										href="https://openrouter.ai/"
										target="_blank"
										className="text-brandBlue underline font-bold"
									>
										OpenRouter
									</a>
									，註冊一個賬號，獲取免費的 OpenRouter API
									密鑰，然後在此處粘貼即可。
								</p>
								<p className="text-sm text-coreMuted leading-relaxed">
									<a
										href="https://aphbrt.web.app/dse/ai"
										target="_blank"
										className="text-brandBlue underline font-bold"
									>
										閱讀詳細使用教程
									</a>
								</p>
							</div>
							<p className="text-sm text-coreMuted leading-relaxed">
								請不要提供任何已付款的 API
								密鑰。我們不會上傳你的密鑰，它將僅保存在你本機的{" "}
								<code className="bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">
									localStorage
								</code>{" "}
								中。請參閱 AlphaBrate 的{" "}
								<a
									href="https://aphbrt.web.app/dse/privacy"
									target="_blank"
									className="text-brandBlue underline font-bold"
								>
									隱私保護聲明
								</a>
								。
								<br />
								<strong className="text-amber-600">
									安全警告：
								</strong>
								請勿在共用或不信任的裝置上保存密鑰。
								若瀏覽器遭受 XSS
								攻擊或惡意擴充套件，密鑰可能被竊取（影響你的帳單與配額）。
								建議定期輪換密鑰，並限制其權限（如設定支出上限）。
								<br />
								詳見{" "}
								<a
									href="https://openrouter.ai/keys"
									target="_blank"
									className="text-brandBlue underline font-bold"
								>
									OpenRouter 密鑰管理
								</a>
								。
							</p>
						</div>
					)}
				</div>

				<div className="absolute bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 w-full px-4 sm:w-auto">
					<div className="bg-white/40 dark:bg-white/10 backdrop-blur-[15px] border border-black/5 dark:border-white/10 p-1 rounded-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex items-center w-full sm:w-[450px] mx-auto relative">
						{/* Liquid Slider Background */}
						<div
							className="absolute top-1 bottom-1 rounded-full bg-white dark:bg-white/10 shadow-lg transition-all duration-700 ease-liquid"
							style={{
								left:
									activeTab === "profile"
										? "4px"
										: activeTab === "guide"
										? "calc(33.33% + 2px)"
										: "calc(66.66% + 2px)",
								width: "calc(33.33% - 6px)",
							}}
						/>

						{/* Profile Tab */}
						<button
							onClick={() => setActiveTab("profile")}
							className={`relative z-10 flex-1 py-2.5 sm:py-3 text-[0.6rem] sm:text-[0.65rem] font-black uppercase tracking-widest transition-all duration-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
								activeTab === "profile"
									? "text-brandBlue dark:text-white"
									: "text-coreMuted"
							}`}
						>
							<i className="fas fa-chart-pie"></i>
							<span className="hidden sm:inline">學習診斷</span>
							<span className="sm:hidden">診斷</span>
						</button>

						{/* Guide Tab */}
						<button
							onClick={() => setActiveTab("guide")}
							className={`relative z-10 flex-1 py-2.5 sm:py-3 text-[0.6rem] sm:text-[0.65rem] font-black uppercase tracking-widest transition-all duration-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
								activeTab === "guide"
									? "text-brandBlue dark:text-white"
									: "text-coreMuted"
							}`}
						>
							<i className="fas fa-code"></i>
							<span className="hidden sm:inline">技術指南</span>
							<span className="sm:hidden">指南</span>
						</button>

						{/* API Tab */}
						<button
							onClick={() => setActiveTab("api")}
							className={`relative z-10 flex-1 py-2.5 sm:py-3 text-[0.6rem] sm:text-[0.65rem] font-black uppercase tracking-widest transition-all duration-500 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
								activeTab === "api"
									? "text-brandBlue dark:text-white"
									: "text-coreMuted"
							}`}
						>
							<i className="fas fa-plug"></i>
							<span className="hidden sm:inline">API 設置</span>
							<span className="sm:hidden">API</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default GuideModal;
