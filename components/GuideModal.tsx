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
						<div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
							{/* 1. 核心數據結構定義 */}
							<section className="space-y-8">
								<div className="flex items-center gap-4 mb-8">
									<h3 className="text-2xl font-black border-l-8 border-brandBlue pl-6 dark:text-white text-brandDark tracking-tight">
										1. 核心數據結構定義 (Data Schema)
									</h3>
								</div>

								<div className="overflow-x-auto rounded-[40px] border border-coreBorder dark:border-darkBorder bg-white/50 dark:bg-white/5 shadow-xl backdrop-blur-md">
									<table className="w-full text-sm">
										<thead className="bg-coreGray/10 dark:bg-white/5">
											<tr>
												<th className="px-10 py-6 text-left font-black text-coreMuted uppercase tracking-widest text-[0.7rem]">
													字段
												</th>
												<th className="px-10 py-6 text-left font-black text-coreMuted uppercase tracking-widest text-[0.7rem]">
													類型
												</th>
												<th className="px-10 py-6 text-left font-black text-coreMuted uppercase tracking-widest text-[0.7rem]">
													QuizMode 組件交互行為映射
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-coreBorder dark:divide-darkBorder">
											<tr>
												<td className="px-10 py-7 font-mono text-brandBlue font-bold text-base">
													QID
												</td>
												<td className="px-10 py-7 font-mono text-xs text-brandPurple font-bold italic">
													String
												</td>
												<td className="px-10 py-7 dark:text-white/80 leading-relaxed">
													<span className="font-bold text-brandDark dark:text-white">
														全局唯一索引。
													</span>
													<br />
													用於{" "}
													<code className="text-xs">
														mistakeIds
													</code>{" "}
													(錯題緩存)
													及進度持久化。格式建議：
													<code className="bg-brandBlue/10 text-brandBlue px-1.5 py-0.5 rounded text-xs font-bold">
														CHI-篇章名-序號
													</code>
													。<br />
													<span className="text-[0.7rem] text-coreMuted italic">
														Example:
														"CHI-六國論-001"
													</span>
												</td>
											</tr>
											<tr>
												<td className="px-10 py-7 font-mono text-brandBlue font-bold text-base">
													type
												</td>
												<td className="px-10 py-7 font-mono text-xs text-brandPurple font-bold italic">
													Enum
												</td>
												<td className="px-10 py-7 dark:text-white/80 leading-relaxed">
													<p className="mb-2 font-bold underline decoration-brandBlue/30 text-xs">
														決定交互模式：
													</p>
													<ul className="space-y-2 text-xs">
														<li>
															•{" "}
															<code className="text-brandBlue font-bold">
																vocabulary
															</code>
															: 激活分段填空。每組{" "}
															<code className="font-mono">
																score-reference
															</code>{" "}
															會在 UI 生成獨立
															Input，存入{" "}
															<code className="text-brandPurple font-mono">
																vocabularyAnswers
															</code>
															。
														</li>
														<li>
															•{" "}
															<code className="text-brandBlue font-bold">
																analysis
															</code>
															:
															激活通用答題區。檢測到{" "}
															<code className="font-mono">
																A/B/C/D
															</code>{" "}
															時自動轉向選項模式。
														</li>
														<li>
															•{" "}
															<code className="text-brandBlue font-bold">
																copy
															</code>
															: 原文摘錄。觸發 AI
															嚴格字符比對。
														</li>
													</ul>
												</td>
											</tr>
											<tr>
												<td className="px-10 py-7 font-mono text-brandBlue font-bold text-base">
													question
												</td>
												<td className="px-10 py-7 font-mono text-xs text-brandPurple font-bold italic">
													Array&lt;Obj&gt;
												</td>
												<td className="px-10 py-7 dark:text-white/80 leading-relaxed">
													<p className="mb-2 font-semibold">
														分段渲染對象：
													</p>
													<ul className="list-disc list-inside space-y-2 text-xs opacity-90">
														<li>
															<code className="text-brandBlue font-bold">
																text
															</code>
															: 支持 Markdown
															渲染（如{" "}
															<code className="font-bold">
																**字詞**
															</code>
															）。
														</li>
														<li>
															<code className="text-brandBlue font-bold">
																score-reference
															</code>
															: [Int]
															陣列。將段落與{" "}
															<code className="font-mono italic">
																answer
															</code>{" "}
															池建立神經連接。
														</li>
													</ul>
												</td>
											</tr>
											<tr>
												<td className="px-10 py-7 font-mono text-brandBlue font-bold text-base">
													answer
												</td>
												<td className="px-10 py-7 font-mono text-xs text-brandPurple font-bold italic">
													Array&lt;Obj&gt;
												</td>
												<td className="px-10 py-7 dark:text-white/80 leading-relaxed">
													<p className="mb-1 font-semibold text-[0.65rem] text-coreMuted uppercase tracking-widest">
														評分內核 (Grading
														Engine)：
													</p>
													<code className="block p-3 rounded-xl bg-gray-50 dark:bg-black/20 text-[0.7rem] font-mono leading-relaxed mb-2">
														&#123; "text":
														"答案文字", "label":
														"point" | "exact",
														"score": 分值 &#125;
													</code>
													<p className="text-[0.65rem] italic">
														系統調用{" "}
														<code className="text-brandPurple italic font-bold underline">
															gradeAnswer()
														</code>{" "}
														將用戶輸入與此處文本進行權重比對。
													</p>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							</section>

							{/* 2. 交互渲染進階準則 */}
							<section className="space-y-8 text-brandDark dark:text-white">
								<h3 className="text-2xl font-black border-l-4 border-brandBlue pl-4">
									2. 交互渲染進階準則 (Interaction Specs)
								</h3>

								<div className="grid md:grid-cols-2 gap-8">
									{/* 選擇題 */}
									<div className="group p-8 rounded-[40px] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 border border-amber-100 dark:border-amber-500/20 shadow-sm transition-all">
										<div className="flex items-center gap-3 mb-6">
											<div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-lg">
												A
											</div>
											<h4 className="font-bold text-amber-900 dark:text-amber-400 text-lg">
												智能選擇題模式
											</h4>
										</div>
										<div className="text-sm space-y-4 text-amber-900/80 dark:text-white/70">
											<p>
												●{" "}
												<span className="font-bold italic">
													觸發條件
												</span>
												：
												<code className="bg-white/80 px-1 font-mono">
													type: "analysis"
												</code>{" "}
												且題幹 text 符合{" "}
												<code className="bg-white/80 px-1 font-mono">
													/^A\s/m
												</code>
												。
											</p>
											<p>
												●{" "}
												<span className="font-bold italic">
													編寫格式
												</span>
												：選項間必須包含換行符{" "}
												<code className="text-brandPurple font-bold">
													\n
												</code>
												。
											</p>
											<div className="p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-amber-200 font-mono text-[0.7rem] leading-tight text-brandDark dark:text-brandLight">
												"text": "A 第一項\nB 第二項\nC
												第三項\nD 第四項"
											</div>
											<p className="text-[0.7rem] italic opacity-70">
												※ 答案僅需對應英文字母（如
												"C"），系統將自動更新
												`selectedOptions` 狀態。
											</p>
										</div>
									</div>

									{/* 字詞解釋 */}
									<div className="group p-8 rounded-[40px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-100 dark:border-blue-500/20 shadow-sm transition-all">
										<div className="flex items-center gap-3 mb-6">
											<div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black shadow-lg italic text-xl font-serif">
												V
											</div>
											<h4 className="font-bold text-blue-900 dark:text-blue-400 text-lg">
												詞義解釋分段模式
											</h4>
										</div>
										<div className="text-sm space-y-4 text-blue-900/80 dark:text-white/70">
											<p>
												●{" "}
												<span className="font-bold italic">
													觸發條件
												</span>
												：
												<code className="bg-white/80 px-1 font-mono">
													type: "vocabulary"
												</code>
												。
											</p>
											<p>
												●{" "}
												<span className="font-bold italic">
													標記規則
												</span>
												：使用{" "}
												<code className="text-brandBlue font-bold">
													**雙星號**
												</code>{" "}
												標示粗體字詞。
											</p>
											<p>
												●{" "}
												<span className="font-bold italic">
													填空渲染
												</span>
												：每個帶有{" "}
												<code className="text-brandPurple font-bold">
													score-reference
												</code>{" "}
												的物件將在前端生成一個 Input
												框，並與{" "}
												<code className="font-mono italic underline">
													vocabularyAnswers
												</code>{" "}
												陣列綁定。
											</p>
										</div>
									</div>
								</div>
							</section>

							{/* 3. 標準範例展示 */}
							<section className="space-y-6">
								<h3 className="text-xl font-bold dark:text-white tracking-tight">
									3. 標準編寫範例 (Standard Implementation)
								</h3>

								<div className="relative group overflow-hidden rounded-[32px] shadow-2xl">
									<div className="absolute top-4 right-4 text-[0.6rem] bg-brandBlue text-white px-2 py-1 rounded-full opacity-50 font-mono">
										JSON SPEC
									</div>
									<div className="p-8 bg-brandDark text-brandLight font-mono text-[0.8rem] leading-relaxed overflow-x-auto border border-white/10">
										<pre className="whitespace-pre-wrap">
											{`{
  "QID": "CHI-論語-014",
  "type": "analysis",
  "question": [
    { 
      "text": "文中在說明君子和小人的分別時，運用了以下哪種修辭手法？\\n", 
      "score-reference": [0] 
    },
    { 
      "text": "A 層遞\\nB 誇飾\\nC 比喻\\nD 對比", 
      "score-reference": [0] 
    }
  ],
  "score": 2,
  "answer": [
    { "text": "D", "label": "point", "score": 2 }
  ]
}`}
										</pre>
									</div>
								</div>
								<div className="p-4 bg-brandBlue/5 border-l-4 border-brandBlue rounded-r-xl">
									<p className="text-[0.7rem] text-brandDark dark:text-white/80 leading-relaxed font-bold italic">
										※ 開發者提示：`QuizMode`
										組件在點擊「提交答案」時，會將索引 0
										的用戶輸入與 `answer[0].text`
										進行自動比對並回傳 `onSaveProgress`。
									</p>
								</div>
							</section>
							{/* 4. 原文與翻譯數據架構 (Reading/Study Mode) */}
							<section className="space-y-8">
								<div className="flex items-center gap-4 mb-8">
									<h3 className="text-2xl font-black border-l-8 border-brandPurple pl-6 dark:text-white text-brandDark tracking-tight">
										4. 原文與翻譯數據架構 (Source Text
										Guide)
									</h3>
								</div>

								<div className="grid md:grid-cols-3 gap-6">
									{/* 基礎屬性 */}
									<div className="md:col-span-1 space-y-4">
										<div className="p-6 rounded-[32px] bg-white dark:bg-white/5 border border-coreBorder dark:border-darkBorder shadow-sm">
											<h4 className="font-bold mb-4 text-brandPurple flex items-center gap-2">
												<span className="w-2 h-2 rounded-full bg-brandPurple" />
												根屬性定義
											</h4>
											<ul className="space-y-3 text-xs text-coreMuted leading-relaxed">
												<li>
													•{" "}
													<code className="text-brandBlue font-bold">
														title
													</code>
													: 篇章完整名稱
												</li>
												<li>
													•{" "}
													<code className="text-brandBlue font-bold">
														author
													</code>
													: 作者姓名
												</li>
												<li>
													•{" "}
													<code className="text-brandBlue font-bold">
														content
													</code>
													: 核心內容陣列
												</li>
											</ul>
										</div>
										<div className="p-6 rounded-[32px] bg-brandPurple/5 border border-brandPurple/20">
											<p className="text-[0.7rem] leading-relaxed text-brandPurple font-medium">
												<span className="font-black italic block mb-1">
													PRO TIP:
												</span>
												在渲染層，系統會遍歷{" "}
												<code className="font-mono">
													content
												</code>{" "}
												陣列。建議以「聯」或「自然段」作為陣列元素單位，以確保移動端閱讀的對照體驗。
											</p>
										</div>
									</div>

									{/* 內容對象詳解 */}
									<div className="md:col-span-2 p-8 rounded-[40px] bg-white dark:bg-white/5 border border-coreBorder dark:border-darkBorder shadow-xl">
										<h4 className="font-bold mb-6 text-lg dark:text-white">
											Content 元素內部結構
										</h4>
										<div className="space-y-6">
											<div className="flex gap-4">
												<div className="flex-none w-1 font-mono text-brandBlue font-black text-lg">
													/
												</div>
												<div>
													<p className="font-bold text-sm dark:text-white">
														source (原文)
													</p>
													<p className="text-xs text-coreMuted mt-1">
														儲存該段落的原始文言文。支持使用全形標點符號。
													</p>
												</div>
											</div>
											<div className="flex gap-4">
												<div className="flex-none w-1 font-mono text-brandPurple font-black text-lg">
													/
												</div>
												<div className="w-full">
													<p className="font-bold text-sm dark:text-white">
														translation (翻譯層級)
													</p>
													<div className="grid grid-cols-2 gap-4 mt-3">
														<div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-dashed border-coreBorder">
															<p className="text-[0.65rem] font-black text-brandPurple uppercase mb-2">
																word (字詞註釋)
															</p>
															<p className="text-[0.7rem] leading-normal opacity-80 italic">
																陣列格式。建議格式：
																<br />
																「字：解釋」。
																<br />
																用於 Hover
																彈窗或側欄註解。
															</p>
														</div>
														<div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/20 border border-dashed border-coreBorder">
															<p className="text-[0.65rem] font-black text-brandBlue uppercase mb-2">
																sentence
																(全文語譯)
															</p>
															<p className="text-[0.7rem] leading-normal opacity-80 italic">
																字串格式。該段原文的完整白話翻譯。
															</p>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</section>

							{/* 5. 原文 JSON 完整示例 */}
							<section className="space-y-6">
								<div className="flex items-center justify-between">
									<h3 className="text-xl font-bold dark:text-white tracking-tight">
										5. 原文編寫範例 (Content Source
										Implementation)
									</h3>
									<span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[0.6rem] font-black tracking-widest uppercase">
										Validated
									</span>
								</div>

								<div className="relative group overflow-hidden rounded-[32px] shadow-2xl border border-white/10">
									<div className="p-8 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[0.8rem] leading-relaxed overflow-x-auto">
										<pre className="">
											{`{
  "title": "山居秋暝",
  "author": "王維",
  "content": [
    {
      "source": "空山新雨後，天氣晚來秋。",
      "translation": {
        "word": [
          "空山：空曠幽靜的山",
          "新：剛剛",
          "晚：傍晚"
        ],
        "sentence": "空曠幽靜的山林剛下一場雨，傍晚時分，天氣顯現出秋天的涼意。"
      }
    },
    {
      "source": "明月松間照，清泉石上流。",
      "translation": {
        "word": [
          "照：照耀",
          "流：流淌"
        ],
        "sentence": "皎潔的月亮在松樹林間照耀，清澈的泉水在山石之上流淌。"
      }
    }
  ]
}`}
										</pre>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="flex items-start gap-4 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20">
										<div className="p-2 rounded-xl bg-amber-500 text-white font-black text-xs">
											!
										</div>
										<p className="text-[0.7rem] text-amber-900 dark:text-amber-200 leading-relaxed">
											<strong>格式注意：</strong> 在{" "}
											<code className="font-bold italic">
												word
											</code>{" "}
											陣列中，請統一使用「：」（全形冒號）分隔字詞與解釋，以便前端的正則表達式能準確分割並進行樣式加強。
										</p>
									</div>
									<div className="flex items-start gap-4 p-5 rounded-3xl bg-blue-500/5 border border-blue-500/20">
										<div className="p-2 rounded-xl bg-blue-500 text-white font-black text-xs">
											?
										</div>
										<p className="text-[0.7rem] text-blue-900 dark:text-blue-200 leading-relaxed">
											<strong>多重解釋：</strong>{" "}
											若一個字有多重意義，請在解釋中使用「/」分隔（例如：
											<code className="italic">
												"善：妥善/出色"
											</code>
											），系統會自動識別並進行分行顯示處理。
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
