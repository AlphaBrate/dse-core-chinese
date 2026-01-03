import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
import { Question, GradingResult, SavedResult } from "../types";
import { gradeAnswer, getQuestionHint, getAnswerFramework } from "../AIService";
import { MarkdownText } from "../utils";

interface QuizModeProps {
	topic?: string;
	questions: Question[];
	onMistake?: (qid: string, isMistake: boolean) => void;
	mistakeIds?: string[];
	isRandom?: boolean;
	progress?: Record<string, SavedResult[]>;
	onSaveProgress?: (
		qid: string,
		answer: string,
		result: GradingResult
	) => void;
	sessionState?: { index: number; answer: string };
	onUpdateSession?: (index: number, answer: string) => void;
}

const QuizMode: React.FC<QuizModeProps> = ({
	topic,
	questions: initialQuestions,
	onMistake,
	mistakeIds = [],
	isRandom = false,
	progress = {},
	onSaveProgress,
	sessionState,
	onUpdateSession,
}) => {
	const [questions, setQuestions] = useState<Question[]>(initialQuestions);
	const [currentIndex, setCurrentIndex] = useState(sessionState?.index || 0);
	const [userAnswer, setUserAnswer] = useState(sessionState?.answer || "");
	const [submittedAnswer, setSubmittedAnswer] = useState("");
	const [vocabularyAnswers, setVocabularyAnswers] = useState<
		Record<number, string>
	>({});
	const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
	const [isGrading, setIsGrading] = useState(false);
	const [result, setResult] = useState<GradingResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showNavigator, setShowNavigator] = useState(false);
	const [isNavExiting, setIsNavExiting] = useState(false);
	const [isJumpInputVisible, setIsJumpInputVisible] = useState(false);
	const [jumpInputValue, setJumpInputValue] = useState("");

	const [hint, setHint] = useState<string | null>(null);
	const [isLoadingHint, setIsLoadingHint] = useState(false);
	const [framework, setFramework] = useState<string | null>(null);

	const jumpInputRef = useRef<HTMLInputElement>(null);
	const currentQuestion = questions[currentIndex];

	const isVocabularyTask = currentQuestion?.type === "vocabulary";
	const canSubmit = !!(
		userAnswer.trim() ||
		selectedOptions.length > 0 ||
		Object.keys(vocabularyAnswers).length > 0
	);

	const attemptsCount = progress[currentQuestion?.QID]?.length || 0;

	const parsedContent = useMemo(() => {
		if (!currentQuestion) return { options: null, headerLines: [] };
		const rawLines = currentQuestion.question;
		const optionLines: string[] = [];
		const headerLines: string[] = [];
		const mainOptionRegex = /^[A-D][\s\.]|^[A-D][、\s]/i;
		const subPointRegex = /^[1-4①-④][、\s\.]/;
		const hasMainOptions = rawLines.some((q) =>
			q.text.trim().match(mainOptionRegex)
		);
		const hasSubPoints = rawLines.some((q) =>
			q.text.trim().match(subPointRegex)
		);

		rawLines.forEach((q) => {
			const text = q.text;
			const trimmed = text.trim();

			const isOption =
				trimmed.match(mainOptionRegex) ||
				(hasSubPoints &&
					!hasMainOptions &&
					trimmed.match(subPointRegex));

			if (isOption) {
				if (text.includes("\n")) {
					const parts = text
						.split("\n")
						.map((p) => p.trim())
						.filter((p) => p.length > 0);
					parts.forEach((p) => {
						if (p.match(mainOptionRegex) || p.match(subPointRegex))
							optionLines.push(p);
						else headerLines.push(p);
					});
				} else {
					optionLines.push(trimmed);
				}
			} else {
				if (!(isVocabularyTask && q["score-reference"])) {
					headerLines.push(text);
				}
			}
		});

		return {
			options: optionLines.length > 0 ? optionLines : null,
			headerLines,
		};
	}, [currentQuestion, isVocabularyTask]);

	const mcOptions = parsedContent.options;

	useEffect(() => {
		if (isRandom)
			setQuestions([...initialQuestions].sort(() => Math.random() - 0.5));
		else setQuestions(initialQuestions);
	}, [topic, initialQuestions, isRandom]);

	useEffect(() => {
		const history = progress[currentQuestion?.QID];
		const saved =
			history && history.length > 0 ? history[history.length - 1] : null;

		if (saved) {
			setSubmittedAnswer(saved.answer);
			setResult(saved.result);
			setUserAnswer(saved.answer);
		} else {
			setResult(null);
			setSubmittedAnswer("");
			if (sessionState && currentIndex === sessionState.index) {
				setUserAnswer(sessionState.answer);
			} else {
				setUserAnswer("");
			}
			setVocabularyAnswers({});
			setSelectedOptions([]);
		}
		setError(null);
		setHint(null);
		setFramework(null);
		setIsJumpInputVisible(false);
	}, [topic, currentIndex, currentQuestion?.QID]);

	useEffect(() => {
		if (
			onUpdateSession &&
			(currentIndex !== sessionState?.index ||
				userAnswer !== sessionState?.answer)
		) {
			onUpdateSession(currentIndex, userAnswer);
		}
	}, [currentIndex, userAnswer, onUpdateSession]);

	const handleNavClose = useCallback(() => {
		setIsNavExiting(true);
		setTimeout(() => {
			setIsNavExiting(false);
			setShowNavigator(false);
		}, 500);
	}, []);

	const handleGrade = useCallback(async () => {
		const trimmedVal = userAnswer.trim();
		const isAskingForHelp = trimmedVal.match(
			/^(不知道|唔知|唔識|唔識填|不會|不會做|不懂|我唔識|我不會|我不知道|求助|help)$/i
		);

		if (isAskingForHelp && !isGrading) {
			setIsGrading(true);
			try {
				const fw = await getAnswerFramework(currentQuestion);
				setFramework(fw);
				setSubmittedAnswer(userAnswer);
				setResult({
					totalScore: 0,
					maxScore: currentQuestion.score,
					feedback: [],
					overallComment:
						"我們明白這道題目可能有一定難度。系統已為您準備了答題框架，建議您可以根據指引嘗試重新組織答案。加油！",
				});
			} catch (err) {
				setError("獲取框架失敗。");
			} finally {
				setIsGrading(false);
			}
			return;
		}

		if (mcOptions) {
			const finalAnswer = selectedOptions.sort().join("、");
			setSubmittedAnswer(finalAnswer);
			const correctAnswer = currentQuestion.answer[0]?.text || "";
			const answerDescription = currentQuestion.answer[1]?.text || null;
			const isCorrect = finalAnswer === correctAnswer;
			const localResult: GradingResult = {
				totalScore: isCorrect ? currentQuestion.score : 0,
				maxScore: currentQuestion.score,
				feedback: [
					{
						pointIndex: 0,
						awardedScore: isCorrect ? currentQuestion.score : 0,
						hit: isCorrect,
						comment: isCorrect
							? "答案正確。"
							: `答案不正確。正確答案為「${correctAnswer}」。\n${answerDescription}`,
					}
				],
				overallComment: isCorrect
					? "選擇正確，繼續保持！"
					: "可惜選錯了，建議重溫相關範文內容。",
			};
			setResult(localResult);
			if (onSaveProgress)
				onSaveProgress(currentQuestion.QID, finalAnswer, localResult);
			if (onMistake && !isCorrect) onMistake(currentQuestion.QID, true);
			return;
		}

		let finalAnswer = isVocabularyTask
			? Object.entries(vocabularyAnswers)
					.map(
						([idx, val]) =>
							`${currentQuestion.question
								.filter((q) => q["score-reference"])
								[parseInt(idx)]?.text.replace(/\*\*/g, "")
								.trim()}: ${val}`
					)
					.join("\n")
			: userAnswer;

		if (!finalAnswer.trim()) return;
		setSubmittedAnswer(finalAnswer);
		setIsGrading(true);
		setError(null);
		try {
			const gradingResult = await gradeAnswer(
				currentQuestion,
				finalAnswer
			);
			setResult(gradingResult);
			if (onSaveProgress)
				onSaveProgress(currentQuestion.QID, finalAnswer, gradingResult);
			if (
				onMistake &&
				gradingResult.totalScore / gradingResult.maxScore < 0.8
			)
				onMistake(currentQuestion.QID, true);
		} catch (err: any) {
			let message = "";

			if (err.message.includes("is not a valid model ID")) {
				message = `Incorrect model name. Do not attempt to modify this if you are not familiar with web development.\nTo resolve this issue, enter "localStorage.modelID = "xiaomi/mimo-v2-flash:free"" in the console and reload.`
			} else if (err.message.includes("SyntaxError: JSON Parse error: Unrecognized token")) {
				message = `Please try again; AI output failed. If the problem persists, please seek support or submit a problem report.\nWe're sorry, this free model may have issues.`
			}

			alert(`${err.message}\n${message}`)
			setError(err.message || "發生錯誤");
		} finally {
			setIsGrading(false);
		}
	}, [
		currentQuestion,
		mcOptions,
		isVocabularyTask,
		selectedOptions,
		vocabularyAnswers,
		userAnswer,
		onMistake,
		isGrading,
		onSaveProgress,
	]);

	const handleGetHint = async () => {
		if (isLoadingHint || hint) return;
		setIsLoadingHint(true);
		try {
			const hintText = await getQuestionHint(currentQuestion);
			setHint(hintText);
		} catch (err) {
			setHint("暫時無法獲取提示。");
		} finally {
			setIsLoadingHint(false);
		}
	};

	const pickRandomQuestion = () => {
		let nextIdx = Math.floor(Math.random() * questions.length);
		if (questions.length > 1 && nextIdx === currentIndex)
			nextIdx = (nextIdx + 1) % questions.length;
		setCurrentIndex(nextIdx);
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
				if (!result && !isGrading && canSubmit) handleGrade();
				else if (result && currentIndex < questions.length - 1)
					setCurrentIndex((prev) => prev + 1);
			}
			if (
				e.key.toLowerCase() === "g" &&
				!isGrading &&
				!result &&
				document.activeElement?.tagName !== "INPUT" &&
				document.activeElement?.tagName !== "TEXTAREA"
			) {
				e.preventDefault();
				setShowNavigator(true);
			}
			if (e.key === "Escape") {
				if (showNavigator) handleNavClose();
				setIsJumpInputVisible(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		handleGrade,
		result,
		isGrading,
		currentIndex,
		questions.length,
		canSubmit,
		showNavigator,
		handleNavClose,
	]);

	if (!currentQuestion) return null;

	return (
		<div className="space-y-6 font-sans">
			{(showNavigator || isNavExiting) && (
				<div
					className={`fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex justify-start ${
						isNavExiting
							? "animate-out fade-out"
							: "animate-in fade-in"
					} duration-500 text-left cursor-pointer`}
					onClick={handleNavClose}
				>
					<div
						className={`w-full max-w-sm bg-white dark:bg-darkCard h-full shadow-2xl flex flex-col ${
							isNavExiting
								? "animate-out slide-left-out"
								: "animate-in slide-in-left"
						} duration-700 border-r border-coreBorder dark:border-darkBorder cursor-default`}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="p-8 border-b border-coreBorder dark:border-darkBorder flex justify-between items-center text-left">
							<div>
								<h3 className="font-bold text-2xl tracking-tight dark:text-white">
									題目索引
								</h3>
								<p className="text-[0.6rem] font-bold text-coreMuted mt-1 uppercase tracking-wider">
									選取題目以快速跳轉
								</p>
							</div>
							<button
								onClick={handleNavClose}
								className="w-12 h-12 flex items-center justify-center rounded-full bg-coreGray dark:bg-white/10 hover:bg-coreBorder transition-all duration-500 active:scale-90 text-left"
							>
								<i className="fas fa-times text-coreText dark:text-white"></i>
							</button>
						</div>
						<div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar text-left">
							{questions.map((q, idx) => {
								const isFinished = !!progress[q.QID];
								return (
									<button
										key={q.QID}
										onClick={() => {
											setCurrentIndex(idx);
											handleNavClose();
										}}
										className={`w-full p-6 rounded-core border transition-all duration-500 ease-liquid group ${
											currentIndex === idx
												? "bg-brandBlue text-white border-brandBlue shadow-xl -translate-y-1"
												: "bg-coreGray/30 dark:bg-white/5 text-coreText dark:text-white/80 border-transparent hover:border-coreMuted/10"
										}`}
									>
										<div className="flex justify-between items-center mb-2 text-[0.6rem] font-bold opacity-60 text-left">
											<span>
												題號 {idx + 1}{" "}
												{isFinished && "✓"}
											</span>
											{mistakeIds.includes(q.QID) && (
												<i className="fas fa-heart text-red-500 scale-75"></i>
											)}
										</div>
										<div className="font-bold line-clamp-2 text-base leading-snug text-left text-coreText dark:text-white">
											<MarkdownText
												text={q.question
													.map((sq) => sq.text)
													.join("")}
												classList={currentIndex === idx ? { p: "!text-white" } : {}}
											/>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{isJumpInputVisible && (
				<div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const t = parseInt(jumpInputValue) - 1;
							if (t >= 0 && t < questions.length) {
								setCurrentIndex(t);
								setIsJumpInputVisible(false);
								setJumpInputValue("");
							}
						}}
						className="bg-white dark:bg-darkCard p-10 rounded-[40px] shadow-2xl w-full max-w-xs border border-coreBorder dark:border-darkBorder animate-in zoom-in duration-500"
					>
						<div className="text-center mb-8 text-left">
							<h4 className="font-bold text-2xl dark:text-white tracking-tight text-center">
								跳轉至題號
							</h4>
							<p className="text-[0.6rem] font-bold text-coreMuted mt-1 text-center">
								輸入數字並按回車鍵 (Enter)
							</p>
						</div>
						<input
							ref={jumpInputRef}
							type="number"
							min="1"
							max={questions.length}
							value={jumpInputValue}
							onChange={(e) => setJumpInputValue(e.target.value)}
							className="w-full p-6 text-center text-5xl font-black bg-coreGray dark:bg-white/5 rounded-[24px] border-0 outline-none dark:text-white focus:ring-4 focus:ring-brandBlue/20 transition-all duration-500 tabular-nums"
							placeholder="1"
							autoFocus
						/>
						<div className="mt-8 flex gap-4">
							<button
								type="button"
								onClick={() => setIsJumpInputVisible(false)}
								className="flex-1 py-4 font-bold text-coreMuted hover:text-coreText dark:hover:text-white transition-colors duration-500"
							>
								取消
							</button>
							<button
								type="submit"
								className="btn-primary flex-1 !h-14 font-bold"
							>
								跳轉
							</button>
						</div>
					</form>
				</div>
			)}

			<div className="glass-card-mobile lg:glass-card relative animate-in fade-in slide-in-up duration-700">
				<div className="flex justify-between items-start mb-10">
					<div className="flex items-start gap-4">
						<div className="flex flex-col gap-4">
							<div className="flex items-center gap-2">
								<button
									onClick={() => setShowNavigator(true)}
									className="w-12 h-12 rounded-full bg-coreGray dark:bg-white/5 flex items-center justify-center hover:bg-coreBorder dark:hover:bg-white/10 transition-all duration-500 active:scale-90 group"
									title="題目清單 (G)"
								>
									<i className="fas fa-list-ul text-brandBlue group-hover:scale-110"></i>
								</button>
								<button
									onClick={pickRandomQuestion}
									className="w-12 h-12 rounded-full bg-coreGray dark:bg-white/5 flex items-center justify-center hover:bg-coreBorder dark:hover:bg-white/10 transition-all duration-500 active:scale-90 group"
									title="隨機抽題"
								>
									<i className="fas fa-random text-brandBlue group-hover:rotate-5 transition-all duration-500"></i>
								</button>
								<button
									onClick={handleGetHint}
									disabled={isLoadingHint || result !== null}
									className={`relative w-12 h-12 rounded-full bg-coreGray dark:bg-white/5 flex items-center justify-center transition-all duration-500 active:scale-90 group disabled:opacity-30 ${
										hint
											? "text-amber-500 bg-amber-500/10"
											: "text-brandBlue hover:bg-coreBorder dark:hover:bg-white/10"
									}`}
									title="AI 提示"
								>
									{isLoadingHint ? (
										<div className="w-5 h-5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
									) : (
										<i className="fas fa-lightbulb"></i>
									)}
								</button>
							</div>
							<div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20 w-fit animate-in slide-in-up delay-200">
								<i className="fas fa-star text-amber-500 text-[0.65rem]"></i>
								<span className="text-[0.65rem] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
									{currentQuestion.score} 分
								</span>
							</div>
						</div>
					</div>
					<div className="text-right">
						<span className="block text-[0.6rem] font-bold text-coreMuted uppercase mb-1">
							當前進度
						</span>
						<span className="text-xl lg:text-2xl font-black dark:text-white tabular-nums tracking-tighter">
							{currentIndex + 1}
							<span className="text-coreMuted font-light mx-1">
								/
							</span>
							{questions.length}
						</span>
					</div>
				</div>

				<div className="mb-10 text-left">
					<div className="text-xl md:text-3xl font-bold leading-[1.6] dark:text-white tracking-tight">
						<MarkdownText
							text={parsedContent.headerLines.join("\n").trim()}
						/>
					</div>

					{hint && (
						<div className="mt-8 p-6 rounded-3xl bg-amber-500/10 dark:bg-amber-900/10 border border-amber-500/30 animate-in slide-in-down duration-500 flex gap-4">
							<div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 text-white text-xs">
								<i className="fas fa-info"></i>
							</div>
							<div className="text-base font-bold text-amber-600 dark:text-amber-400 italic leading-relaxed">
								提示：
								<MarkdownText text={hint} />
							</div>
						</div>
					)}
				</div>

				{!result ? (
					<div className="space-y-10">
						<div className="animate-in fade-in slide-in-up duration-700 delay-100">
							{mcOptions ? (
								<div className="grid gap-4">
									{mcOptions.map((opt, i) => {
										const labelMatch =
											opt.match(/^[A-D1-4①-④]/i);
										const optLabel = labelMatch
											? labelMatch[0]
													.replace(/[、\s\.]/g, "")
													.toUpperCase()
											: (i + 1).toString();
										const isSelected =
											selectedOptions.includes(optLabel);
										return (
											<button
												key={i}
												onClick={() =>
													setSelectedOptions((prev) =>
														isSelected
															? prev.filter(
																	(p) =>
																		p !==
																		optLabel
															  )
															: [
																	...prev,
																	optLabel,
															  ]
													)
												}
												className={`group p-6 rounded-2xl border-2 text-left transition-all duration-500 ease-liquid flex items-center gap-6 ${
													isSelected
														? "bg-brandBlue text-white border-brandBlue shadow-xl -translate-y-1"
														: "bg-coreGray/40 dark:bg-white/5 text-coreText dark:text-white/90 border-transparent hover:border-coreBorder"
												}`}
											>
												<div
													className={`w-10 h-10 rounded-full border flex-shrink-0 flex items-center justify-center font-bold text-lg transition-all duration-500 ${
														isSelected
															? "bg-white text-brandBlue"
															: "bg-white/50 dark:bg-white/10 border-coreBorder dark:border-white/10"
													}`}
												>
													{optLabel}
												</div>
												<div className="font-bold text-xl leading-snug">
													<MarkdownText
														text={opt
															.replace(
																/^[A-D1-4①-④][、\s\.\s]*/i,
																""
															)
															.trim()}
													/>
												</div>
											</button>
										);
									})}
								</div>
							) : isVocabularyTask ? (
								<div className="grid gap-6">
									{currentQuestion.question
										.filter((q) => q["score-reference"])
										.map((q, idx) => (
											<div
												key={idx}
												className="space-y-3"
											>
												<label className="block text-xl font-bold dark:text-white/90 text-left">
													<MarkdownText
														text={q.text.trim()}
													/>
												</label>
												<input
													type="text"
													value={
														vocabularyAnswers[
															idx
														] || ""
													}
													onChange={(e) =>
														setVocabularyAnswers(
															(prev) => ({
																...prev,
																[idx]: e.target
																	.value,
															})
														)
													}
													placeholder="在此輸入解釋..."
													className="w-full py-3.5 px-6 rounded-2xl border-2 border-coreGray dark:border-white/5 bg-coreGray/20 dark:bg-white/10 focus:bg-white dark:focus:bg-darkCard focus:border-brandBlue outline-none text-xl font-bold transition-all duration-500 dark:text-white shadow-inner"
													autoFocus={idx === 0}
												/>
											</div>
										))}
								</div>
							) : (
								<textarea
									value={userAnswer}
									onChange={(e) =>
										setUserAnswer(e.target.value)
									}
									placeholder="在此組織答案並進行深度分析..."
									className="w-full h-80 py-4 px-6 rounded-2xl border-2 border-coreGray dark:border-white/5 bg-coreGray/20 dark:bg-white/10 focus:bg-white dark:focus:bg-darkCard focus:border-brandBlue outline-none transition-all duration-500 resize-none text-lg font-bold dark:text-white leading-[1.8] shadow-inner"
									disabled={isGrading}
									autoFocus
								/>
							)}
						</div>
						<button
							onClick={handleGrade}
							disabled={isGrading || !canSubmit}
							className={`btn-primary h-14 text-xl font-bold tracking-tight shadow-2xl transition-all duration-700 ${
								!canSubmit
									? "opacity-40 grayscale"
									: "shadow-blue-500/20"
							} flex items-center justify-center gap-4`}
						>
							{isGrading ? (
								<>
									<i className="fas fa-circle-notch animate-spin mr-2"></i>{" "}
									正在評分
								</>
							) : (
								<>
									提交答案{" "}
									<span className="opacity-40 text-sm ml-2 font-normal italic">
										⌘ ↵
									</span>
								</>
							)}
						</button>
					</div>
				) : (
					<div className="space-y-12 animate-in fade-in slide-in-up duration-1000">
						<div className="lg:bg-coreGray/40 lg:dark:bg-white/5 p-2 lg:p-10 lg:rounded-[48px] lg:border lg:border-coreBorder lg:dark:border-white/10 text-left">
							<div className="flex items-end justify-between mb-12 pb-8 border-b border-coreBorder dark:border-white/10">
								<div>
									<h3 className="font-bold text-3xl dark:text-white tracking-tight">
										{framework ? "導師模式" : "閱卷報告"}
									</h3>
									<div className="flex items-center gap-3 mt-2">
										<p className="text-[0.6rem] font-bold text-coreMuted uppercase tracking-wider">
											{framework
												? "AI 學習引導中"
												: "AI 評分系統反饋"}
										</p>
										{attemptsCount > 0 && (
											<span className="bg-brandBlue/10 text-brandBlue text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
												第 {attemptsCount} 次嘗試
											</span>
										)}
									</div>
								</div>
								{!framework && (
									<div className="text-8xl font-black text-brandBlue tabular-nums tracking-tighter leading-none">
										{result.totalScore}
										<span className="text-3xl text-coreMuted font-light ml-2">
											/ {result.maxScore}
										</span>
									</div>
								)}
							</div>

							{framework && (
								<div className="mb-10 p-8 rounded-[32px] bg-brandBlue/5 border border-brandBlue/20 animate-in zoom-in duration-700">
									<h4 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] mb-4 text-brandBlue flex items-center gap-2">
										<i className="fas fa-pen-nib"></i>{" "}
										答題框架指引
									</h4>
									<div className="text-lg font-bold text-coreText dark:text-white/90 leading-relaxed italic whitespace-pre-line bg-white/50 dark:bg-black/20 p-8 rounded-2xl border border-brandBlue/10 shadow-inner">
										<MarkdownText text={framework} />
									</div>
									<p className="text-xs text-brandBlue mt-4 opacity-70">
										*
										請根據此框架結構重新組織答案並提交練習。
									</p>
								</div>
							)}

							<div className="mb-10">
								<label className="block text-[0.6rem] font-bold text-coreMuted uppercase mb-4 opacity-60">
									您的作答紀錄
								</label>
								<div className="bg-white dark:bg-darkBg p-4 lg:p-8 rounded-[24px] border border-coreBorder dark:border-white/10 text-coreText dark:text-white/90 italic text-xl font-bold leading-relaxed shadow-sm whitespace-pre-line overflow-x-hidden text-ellipsis">
									{submittedAnswer}
								</div>
							</div>

							{!framework && result.feedback.length > 0 ? (
								<div className="space-y-5">
									<label className="block text-[0.6rem] font-bold text-coreMuted uppercase mb-2 opacity-60">
										評分要點對應
									</label>
									{result.feedback.map((f, i) => {
										const point =
											currentQuestion.answer[
												f.pointIndex
											];
										if (!point) return null;
										return (
											<div
												key={i}
												className={`p-4 lg:p-8 rounded-[32px] border transition-all duration-700 flex items-start gap-4 lg:gap-6 animate-in fade-in slide-in-up ${
													f.hit
														? "bg-white dark:bg-darkCard border-brandBlue/30 shadow-xl scale-[1.01]"
														: "bg-transparent border-transparent opacity-40"
												}`}
												style={{
													animationDelay: `${
														400 + i * 100
													}ms`,
												}}
											>
												<div
													className={`w-6 h-6 lg:w-12 lg:h-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold ${
														f.hit
															? "bg-brandBlue text-white shadow-lg"
															: "bg-coreGray dark:bg-white/10 text-coreMuted"
													}`}
												>
													{f.hit ? (
														<i className="fas fa-check"></i>
													) : (
														i + 1
													)}
												</div>
												<div className="flex-grow">
													<div className="flex justify-between items-center mb-2">
														<div
															className={`font-bold text-lg ${
																f.hit
																	? "text-coreText dark:text-white"
																	: "text-coreMuted"
															}`}
														>
															<MarkdownText
																text={
																	point.text
																}
															/>
														</div>
														<span
															className={`text-[0.7rem] font-black px-3 py-1.5 rounded-full tabular-nums ${
																f.hit
																	? "bg-blue-50 dark:bg-brandBlue/20 text-brandBlue"
																	: "bg-coreGray dark:bg-white/5 text-coreMuted"
															}`}
														>
															+{f.awardedScore}
														</span>
													</div>
													<p className="text-base text-coreMuted leading-relaxed italic">
														「{f.comment}」
													</p>
												</div>
											</div>
										);
									})}
								</div>
							) : (
								!framework && (
									<div className="p-8 rounded-[32px] bg-red-500/5 border border-red-500/20 text-center animate-in zoom-in">
										<p className="text-red-600 dark:text-red-400 font-bold italic leading-relaxed">
											<i className="fas fa-user-secret mr-2"></i>{" "}
											由於偵測到非認真或異常作答，正確答案解析已隱藏。請嘗試修正內容或使用提示功能後再試。
										</p>
									</div>
								)
							)}

							<div className="mt-12 p-4 pb-0 lg:p-10 bg-coreGray/50 dark:bg-white/10 rounded-[40px] border border-coreBorder dark:border-white/5 relative overflow-hidden transition-all duration-500">
								<h4 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] mb-0 lg:mb-4 text-brandBlue">
									{framework ? "導師總評" : "閱卷總評"}
								</h4>
								<div className="font-bold text-xl lg:text-2xl italic leading-relaxed tracking-tight text-coreText dark:text-white">
									<MarkdownText
										text={
											result.overallComment.startsWith(
												'"'
											)
												? result.overallComment
												: `"${result.overallComment}"`
										}
									/>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-up delay-800">
							<button
								onClick={() => {
									setResult(null);
									setUserAnswer("");
									setVocabularyAnswers({});
									setSelectedOptions([]);
									setHint(null);
									setFramework(null);
								}}
								className="py-4 px-6 rounded-full border border-coreBorder dark:border-white/20 font-bold text-coreMuted hover:bg-coreGray dark:hover:bg-white/5 hover:text-coreText dark:hover:text-white transition-all duration-500 active:scale-95"
							>
								重新練習
							</button>
							<button
								onClick={() => {
									if (onMistake)
										onMistake(
											currentQuestion.QID,
											!mistakeIds.includes(
												currentQuestion.QID
											)
										);
								}}
								className={`py-4 px-6 rounded-full border border-coreBorder dark:border-white/20 font-bold transition-all duration-500 flex items-center justify-center gap-3 active:scale-95 ${
									mistakeIds.includes(currentQuestion.QID)
										? "text-red-500 border-red-500 bg-red-50 dark:bg-red-500/10"
										: "text-coreMuted hover:text-coreText"
								}`}
							>
								<i
									className={`${
										mistakeIds.includes(currentQuestion.QID)
											? "fas"
											: "far"
									} fa-heart text-lg`}
								></i>
								{mistakeIds.includes(currentQuestion.QID)
									? "已收錄"
									: "加入錯題"}
							</button>
							{currentIndex < questions.length - 1 ? (
								<button
									onClick={() =>
										setCurrentIndex((prev) => prev + 1)
									}
									className="btn-primary !h-auto py-4 sm:py-0 text-xl group font-bold flex items-center justify-center gap-2"
								>
									下一題{" "}
									<i className="fas fa-chevron-right text-sm group-hover:translate-x-1 transition-transform"></i>
								</button>
							) : (
								<div className="hidden sm:block"></div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default QuizMode;