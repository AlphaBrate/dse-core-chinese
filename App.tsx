import React, { useState, useEffect } from "react";
import { AppMode, Question, SavedResult } from "./types";
import { TOPICS, TOPIC_MAP } from "./data";
import QuizMode from "./components/QuizMode";
import BrowserMode from "./components/BrowserMode";
import MemorizeMode from "./components/MemorizeMode";
import MistakesMode from "./components/MistakesMode";
import OriginalMode from "./components/OriginalMode";
import Layout from "./components/Layout";
import ActivationHintModal from "./components/ActivationHintModal";

const App: React.FC = () => {
	const [mode, setMode] = useState<AppMode>(AppMode.Quiz);

	// 1. 立即從 localStorage 回復上次選擇的篇章
	const [selectedTopic, setSelectedTopic] = useState<string>(() => {
		return localStorage.getItem("dse_last_topic") || TOPICS[0];
	});

	const [questions, setQuestions] = useState<Question[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [mistakeIds, setMistakeIds] = useState<string[]>([]);
	const [mistakeHistoryIds, setMistakeHistoryIds] = useState<string[]>([]);
	const [progress, setProgress] = useState<Record<string, SavedResult[]>>({});
	const [showKeyHint, setShowKeyHint] = useState(false);
	const [isGuideOpen, setIsGuideOpen] = useState(false);

	const [translationType, setTranslationType] = useState<"word" | "sentence">(
		"sentence"
	);

	useEffect(() => {
		// 紀錄最後訪問的篇章名
		localStorage.setItem("dse_last_topic", selectedTopic);
	}, [selectedTopic]);

	useEffect(() => {
		const userKey = localStorage.getItem("user_api_key");
		const hintDismissed = sessionStorage.getItem("dse_key_hint_dismissed");

		if (!userKey && !hintDismissed) {
			setShowKeyHint(true);
		}

		const savedMistakes = localStorage.getItem("dse_mistakes");
		if (savedMistakes) setMistakeIds(JSON.parse(savedMistakes));

		const savedHistory = localStorage.getItem("dse_mistake_history");
		if (savedHistory) setMistakeHistoryIds(JSON.parse(savedHistory));

		const savedProgress = localStorage.getItem("dse_progress");
		if (savedProgress) {
			try {
				const parsed = JSON.parse(savedProgress);
				const migrated: Record<string, SavedResult[]> = {};
				Object.keys(parsed).forEach((qid) => {
					migrated[qid] = Array.isArray(parsed[qid])
						? parsed[qid]
						: [parsed[qid]];
				});
				setProgress(migrated);
			} catch (e) {
				setProgress({});
			}
		}

		const savedType = localStorage.getItem("dse_translation_type");
		if (savedType) setTranslationType(savedType as "word" | "sentence");
	}, []);

	useEffect(() => {
		localStorage.setItem("dse_translation_type", translationType);
	}, [translationType]);

	useEffect(() => {
		const loadQuestions = async () => {
			setIsLoading(true);
			try {
				const path = TOPIC_MAP[selectedTopic];
				const response = await fetch(path);
				const data = await response.json();
				setQuestions(data);
			} catch (err) {
				console.error("Failed to load questions:", err);
			} finally {
				setIsLoading(false);
			}
		};
		loadQuestions();
	}, [selectedTopic]);

	const toggleMistake = (qid: string, add: boolean) => {
		setMistakeIds((prev) => {
			const next = add
				? prev.includes(qid)
					? prev
					: [...prev, qid]
				: prev.filter((id) => id !== qid);
			localStorage.setItem("dse_mistakes", JSON.stringify(next));
			return next;
		});

		if (add) {
			setMistakeHistoryIds((prev) => {
				if (prev.includes(qid)) return prev;
				const next = [...prev, qid];
				localStorage.setItem(
					"dse_mistake_history",
					JSON.stringify(next)
				);
				return next;
			});
		}
	};

	const saveProgress = (qid: string, answer: string, result: any) => {
		setProgress((prev) => {
			const currentHistory = prev[qid] || [];
			const next = {
				...prev,
				[qid]: [
					...currentHistory,
					{ answer, result, timestamp: Date.now() },
				],
			};
			localStorage.setItem("dse_progress", JSON.stringify(next));
			return next;
		});
	};

	const handleDismissHint = () => {
		setShowKeyHint(false);
		sessionStorage.setItem("dse_key_hint_dismissed", "true");
	};

	const handleConfigureNow = () => {
		setShowKeyHint(false);
		sessionStorage.setItem("dse_key_hint_dismissed", "true");
		setIsGuideOpen(true);
	};

	return (
		<>
			{showKeyHint && (
				<ActivationHintModal
					onClose={handleDismissHint}
					onConfigure={handleConfigureNow}
				/>
			)}
			<Layout
				mode={mode}
				setMode={setMode}
				topics={TOPICS}
				selectedTopic={selectedTopic}
				setSelectedTopic={setSelectedTopic}
				mistakeCount={mistakeIds.length}
				progress={progress}
				isGuideOpen={isGuideOpen}
				setIsGuideOpen={setIsGuideOpen}
			>
				<div className="max-w-4xl mx-auto py-8 px-4 min-h-[60vh]">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-20 animate-pulse">
							<div className="w-16 h-16 border-4 border-brandBlue/20 border-t-brandBlue rounded-full animate-spin mb-4"></div>
							<p className="text-coreMuted font-medium">
								正在載入專屬數據庫...
							</p>
						</div>
					) : (
						<>
							{mode === AppMode.Original && (
								<OriginalMode
									topic={selectedTopic}
									translationType={translationType}
									setTranslationType={setTranslationType}
								/>
							)}

							{mode === AppMode.Quiz && (
								<QuizMode
									topic={selectedTopic}
									questions={questions}
									onMistake={(qid, isMistake) =>
										toggleMistake(qid, isMistake)
									}
									mistakeIds={mistakeIds}
									progress={progress}
									onSaveProgress={saveProgress}
								/>
							)}

							{mode === AppMode.Browse && (
								<BrowserMode
									topic={selectedTopic}
									questions={questions}
								/>
							)}

							{mode === AppMode.Memorize && (
								<MemorizeMode
									topic={selectedTopic}
									questions={questions}
								/>
							)}

							{mode === AppMode.Mistakes && (
								<MistakesMode
									mistakeIds={mistakeIds}
									mistakeHistoryIds={mistakeHistoryIds}
									progress={progress}
									onMistake={(qid, isMistake) =>
										toggleMistake(qid, isMistake)
									}
									onSaveProgress={saveProgress}
								/>
							)}
						</>
					)}
				</div>
			</Layout>
		</>
	);
};

export default App;
