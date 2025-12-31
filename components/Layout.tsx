import React, { useEffect, useState, useRef } from "react";
import { AppMode, SavedResult } from "../types";
import GuideModal from "./GuideModal";

interface LayoutProps {
	children: React.ReactNode;
	mode: AppMode;
	setMode: (mode: AppMode) => void;
	topics: string[];
	selectedTopic: string;
	setSelectedTopic: (topic: string) => void;
	mistakeCount: number;
	progress: Record<string, SavedResult[]>;
	isGuideOpen: boolean;
	setIsGuideOpen: (open: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({
	children,
	mode,
	setMode,
	topics,
	selectedTopic,
	setSelectedTopic,
	mistakeCount,
	progress,
	isGuideOpen,
	setIsGuideOpen,
}) => {
	const [isDark, setIsDark] = useState(false);
	const [showLeftFade, setShowLeftFade] = useState(false);
	const [showRightFade, setShowRightFade] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const hideTopicBar = mode === AppMode.Mistakes;

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

	const updateScrollFades = () => {
		const el = scrollRef.current;
		if (el) {
			setShowLeftFade(el.scrollLeft > 10);
			setShowRightFade(
				el.scrollLeft < el.scrollWidth - el.clientWidth - 10
			);
		}
	};

	useEffect(() => {
		if (!hideTopicBar) {
			const timer = setTimeout(updateScrollFades, 200);
			window.addEventListener("resize", updateScrollFades);
			return () => {
				window.removeEventListener("resize", updateScrollFades);
				clearTimeout(timer);
			};
		}
	}, [topics, selectedTopic, hideTopicBar]);

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
		{ id: AppMode.Original, label: "原文", icon: "fa-feather" },
		{ id: AppMode.Quiz, label: "練習", icon: "fa-pen-nib" },
		{ id: AppMode.Browse, label: "瀏覽", icon: "fa-book" },
		{ id: AppMode.Memorize, label: "記憶", icon: "fa-brain" },
		{ id: AppMode.Mistakes, label: "錯題", icon: "fa-heart" },
	];

	const activeIndex = modes.findIndex((m) => m.id === mode);

	return (
		<div className="min-h-screen flex flex-col font-sans transition-colors duration-500 overflow-x-hidden">
			<nav className="sticky top-0 z-50 h-[75px] bg-white/70 dark:bg-black/70 backdrop-blur-[30px] saturate-[180%] border-b border-coreBorder dark:border-darkBorder flex items-center text-left">
				<div className="container mx-auto px-4 flex justify-between items-center text-left">
					<div className="flex items-center gap-4 text-left">
						<span className="font-bold text-2xl tracking-tighter dark:text-white select-none">
							<a href="https://aphbrt.web.app/">AlphaBrate</a>{" "}
							<a href="https://aphbrt.web.app/dse" className="font-light text-coreMuted">
								for DSE
							</a>
						</span>
					</div>

					<div className="flex items-center gap-3">
						<div className="hidden lg:flex relative bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-full border border-black/[0.05] dark:border-white/[0.05] w-[400px]">
							<div
								className="liquid-slider top-1 bottom-1 rounded-full"
								style={{
									left: `calc(${activeIndex * 20}% + 4px)`,
									width: "calc(20% - 8px)",
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
								</button>
							))}
						</div>

						<button
							onClick={() => setIsGuideOpen(true)}
							className="w-10 h-10 flex items-center justify-center rounded-full bg-coreGray dark:bg-white/10 text-coreText dark:text-white transition-all hover:scale-110 active:scale-90"
						>
							<i className="fas fa-chart-line"></i>
						</button>

						<button
							onClick={toggleDark}
							className="w-10 h-10 flex items-center justify-center rounded-full bg-coreGray dark:bg-white/10 text-coreText dark:text-white transition-all hover:scale-110 active:scale-90"
						>
							<i
								className={`fas ${
									isDark ? "fa-sun" : "fa-moon"
								}`}
							></i>
						</button>

						<button
							onClick={() => setIsMobileMenuOpen(true)}
							className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full text-brandBlue dark:text-white hover:bg-coreGray dark:hover:bg-white/10 transition-all"
						>
							<i className="fas fa-bars text-xl"></i>
						</button>
					</div>
				</div>
			</nav>

			{/* Mobile Drawer */}
			<div
				className={`fixed inset-0 z-[100] transition-all duration-500 ${
					isMobileMenuOpen
						? "opacity-100"
						: "opacity-0 pointer-events-none"
				}`}
			>
				<div
					className="absolute inset-0 bg-black/40 backdrop-blur-sm"
					onClick={() => setIsMobileMenuOpen(false)}
				></div>
				<div
					className={`absolute right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-darkCard border-l border-coreBorder dark:border-darkBorder shadow-2xl transition-transform duration-500 ease-liquid flex flex-col ${
						isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
					}`}
				>
					<div className="p-6 border-b border-coreBorder dark:border-darkBorder flex justify-between items-center text-left">
						<span className="font-bold text-lg dark:text-white">
							菜單導航
						</span>
						<button
							onClick={() => setIsMobileMenuOpen(false)}
							className="w-8 h-8 rounded-full bg-coreGray dark:bg-white/10 flex items-center justify-center"
						>
							<i className="fas fa-times text-xs dark:text-white"></i>
						</button>
					</div>
					<div className="flex-grow p-4 space-y-2">
						{modes.map((m) => (
							<button
								key={m.id}
								onClick={() => {
									setMode(m.id);
									setIsMobileMenuOpen(false);
								}}
								className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
									mode === m.id
										? "bg-brandBlue text-white shadow-lg"
										: "hover:bg-coreGray dark:hover:bg-white/5 text-coreText dark:text-white/80"
								}`}
							>
								<div className="flex items-center gap-3">
									<i className={`fas ${m.icon} w-5`}></i>
									<span className="font-bold">{m.label}</span>
								</div>
							</button>
						))}
					</div>
				</div>
			</div>

			<GuideModal
				isOpen={isGuideOpen}
				onClose={() => setIsGuideOpen(false)}
				progress={progress}
			/>

			<div
				className={`bg-coreBg dark:bg-darkBg border-b border-coreBorder dark:border-darkBorder relative overflow-hidden transition-all duration-700 ${
					hideTopicBar
						? "max-h-0 opacity-0 py-0"
						: "max-h-[200px] opacity-100 py-0"
				}`}
			>
				{!hideTopicBar && (
					<div className="container mx-auto relative">
						<div
							className={`absolute left-0 top-0 bottom-0 w-16 z-20 pointer-events-none bg-gradient-to-r from-coreBg dark:from-darkBg to-transparent transition-opacity duration-500 ${
								showLeftFade ? "opacity-100" : "opacity-0"
							}`}
						></div>
						<div
							className={`absolute right-0 top-0 bottom-0 w-16 z-20 pointer-events-none bg-gradient-to-l from-coreBg dark:from-darkBg to-transparent transition-opacity duration-500 ${
								showRightFade ? "opacity-100" : "opacity-0"
							}`}
						></div>

						<div
							ref={scrollRef}
							onScroll={updateScrollFades}
							className="flex gap-3 overflow-x-auto minimal-scrollbar items-center py-5 relative scroll-smooth no-scrollbar md:scrollbar-thin px-2"
							style={{ scrollbarWidth: "none" }}
						>
							{topics.map((topic) => (
								<button
									key={topic}
									onClick={() => setSelectedTopic(topic)}
									className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-500 ease-liquid whitespace-nowrap text-center border shrink-0 ${
										selectedTopic === topic
											? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-[0_10px_20px_rgba(0,0,0,0.1)] -translate-y-0.5 scale-105 mx-1"
											: "bg-white/50 dark:bg-transparent text-coreMuted border-coreBorder dark:border-darkBorder hover:border-coreMuted hover:bg-white dark:hover:bg-white/5"
									}`}
								>
									{topic}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			<main className="flex-grow bg-coreBg dark:bg-darkBg">
				{children}
			</main>

			<footer className="py-12 bg-coreBg dark:bg-darkBg">
				<div className="container mx-auto px-4 text-center">
					<p className="text-coreMuted text-xs font-medium select-none opacity-40">
						© {new Date().getFullYear()} AlphaBrate. AI may make mistakes.
					</p>
				</div>
			</footer>
		</div>
	);
};

export default Layout;
