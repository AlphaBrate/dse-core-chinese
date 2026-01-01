import React, { useEffect, useState } from "react";
import { AppMode } from "./types";

interface LayoutProps {
	children: React.ReactNode;
	mode: AppMode;
	setMode: (mode: AppMode) => void;
	topics: string[];
	selectedTopic: string;
	setSelectedTopic: (topic: string) => void;
	mistakeCount: number;
}

const Layout: React.FC<LayoutProps> = ({
	children,
	mode,
	setMode,
	topics,
	selectedTopic,
	setSelectedTopic,
	mistakeCount,
}) => {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		if (
			localStorage.theme === "dark" ||
			(!("theme" in localStorage) &&
				window.matchMedia("(prefers-color-scheme: dark)").matches)
		) {
			document.documentElement.classList.add("dark");
			setIsDark(true);
		} else {
			document.documentElement.classList.remove("dark");
			setIsDark(false);
		}
	}, []);

	const toggleDark = () => {
		if (isDark) {
			document.documentElement.classList.remove("dark");
			localStorage.theme = "light";
			setIsDark(false);
		} else {
			document.documentElement.classList.add("dark");
			localStorage.theme = "dark";
			setIsDark(true);
		}
	};

	const modes = [
		{ id: AppMode.Quiz, label: "練習" },
		{ id: AppMode.Browse, label: "瀏覽" },
		{ id: AppMode.Memorize, label: "記憶" },
		{ id: AppMode.Mistakes, label: "錯題" },
	];

	const activeIndex = modes.findIndex((m) => m.id === mode);

	return (
		<div className="min-h-screen flex flex-col font-sans">
			<nav className="sticky top-0 z-50 h-[75px] bg-white/70 dark:bg-black/70 backdrop-blur-[30px] saturate-[180%] border-b border-coreBorder dark:border-darkBorder flex items-center">
				<div className="container mx-auto px-4 flex justify-between items-center">
					<div className="flex items-center gap-3">
						<span className="font-bold text-xl sm:text-2xl tracking-tighter dark:text-white select-none">
							AlphaBrate{" "}
							<span className="font-light text-coreMuted">
								for DSE
							</span>
						</span>
						<span className="hidden md:block bg-coreGray dark:bg-white/10 px-3 py-1 rounded-full text-[0.7rem] font-bold text-coreText dark:text-white/80 tracking-tight select-none">
							中文必修
						</span>
					</div>

					<div className="flex items-center gap-3">
						{/* Mobile mode selector (dropdown) */}
						<select
							value={mode}
							onChange={(e) => setMode(e.target.value as AppMode)}
							className="lg:hidden bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 rounded-full border border-black/[0.05] dark:border-white/[0.05] text-sm font-medium dark:text-white outline-none"
						>
							{modes.map((m) => (
								<option
									key={m.id}
									value={m.id}
									className="dark:bg-black"
								>
									{m.label}
									{m.id === AppMode.Mistakes &&
									mistakeCount > 0
										? ` (${mistakeCount})`
										: ""}
								</option>
							))}
						</select>

						{/* Desktop mode selector */}
						<div className="hidden lg:flex relative bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-full border border-black/[0.05] dark:border-white/[0.05] w-80">
							<div
								className="liquid-slider top-1 bottom-1 rounded-full absolute transition-all duration-500 ease-liquid"
								style={{
									left: `calc(${activeIndex * 25}% + 4px)`,
									width: "calc(25% - 8px)",
								}}
							/>
							{modes.map((m) => (
								<button
									key={m.id}
									onClick={() => setMode(m.id)}
									className={`relative z-10 flex-1 py-1.5 rounded-full text-sm font-medium transition-colors duration-500 ease-liquid ${
										mode === m.id
											? "text-brandBlue dark:text-white"
											: "text-coreMuted hover:text-coreText dark:hover:text-white"
									}`}
								>
									{m.label}
									{m.id === AppMode.Mistakes &&
										mistakeCount > 0 && (
											<span
												className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold transition-colors duration-500 ${
													mode === m.id
														? "bg-red-500 text-white"
														: "bg-red-500/80 text-white"
												}`}
											>
												{mistakeCount}
											</span>
										)}
								</button>
							))}
						</div>

						{/* Larger touch target for theme toggle */}
						<button
							onClick={toggleDark}
							className="w-12 h-12 flex items-center justify-center rounded-full bg-coreGray dark:bg-white/10 text-coreText dark:text-white transition-all hover:scale-110 active:scale-90"
							aria-label={
								isDark ? "切換到亮色模式" : "切換到暗色模式"
							}
						>
							<i
								className={`fas ${
									isDark ? "fa-sun" : "fa-moon"
								}`}
							></i>
						</button>
					</div>
				</div>
			</nav>

			{/* Topics bar with optimized mobile styling */}
			<div className="bg-coreBg dark:bg-darkBg border-b border-coreBorder dark:border-darkBorder overflow-hidden">
				<div className="container mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar items-center pb-2">
					{topics.map((topic) => (
						<button
							key={topic}
							onClick={() => setSelectedTopic(topic)}
							className={`px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-500 ease-liquid whitespace-nowrap text-center border ${
								selectedTopic === topic
									? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] -translate-y-0.5 scale-105"
									: "bg-white/50 dark:bg-transparent text-coreMuted border-coreBorder dark:border-darkBorder hover:border-coreMuted hover:bg-white dark:hover:bg-white/5"
							}`}
						>
							{topic}
						</button>
					))}
				</div>
			</div>

			<main className="flex-grow">{children}</main>

			<footer className="border-t border-coreBorder dark:border-darkBorder py-6 sm:py-12 bg-white dark:bg-darkCard">
				<div className="container mx-auto px-4 text-center">
					<p className="text-coreMuted text-xs sm:text-sm font-medium select-none">
						© {new Date().getFullYear()} AlphaBrate.
					</p>
				</div>
			</footer>
		</div>
	);
};

export default Layout;
