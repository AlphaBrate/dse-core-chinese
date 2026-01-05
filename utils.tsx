import React from "react";

/**
 * Full definition for customizable styles
 */
export interface MarkdownClassList {
	container?: string;
	hr?: string;
	p?: string;
	h1?: string;
	h2?: string;
	h3?: string;
	h4?: string;
	h5?: string;
	h6?: string;
	ul?: string;
	ol?: string;
	liText?: string;
	liBullet?: string;
	liNumber?: string;
	blockquote?: string;
	strong?: string;
	link?: string;
	img?: string;
	checkbox?: string;
}

interface MarkdownTextProps {
	text: string;
	className?: string;
	classList?: MarkdownClassList;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
	text,
	className = "",
	classList = {} as MarkdownClassList,
}) => {
	const lines = text.split("\n");

	return (
		<div
			className={`${className.includes("nopreline") ? className : "whitespace-pre-line " + className} ${
				classList.container || ""
			}`}
		>
			{lines.map((line, lineIdx) => {
				const trimmed = line.trim();

				// 1. Horizontal Rule (---)
				if (trimmed === "---") {
					return (
						<hr
							key={lineIdx}
							className={`my-8 border-gray-200 dark:border-white/10 ${
								classList.hr || ""
							}`}
						/>
					);
				}

				// 2. Headings (# to ######)
				const headingMatch = line.match(/^(#{1,6})\s(.*)/);
				if (headingMatch) {
					const level = headingMatch[1].length;
					const content = renderInline(headingMatch[2], classList);
					const baseClass =
						"font-bold mt-8 mb-4 tracking-tight dark:text-white";

					const sizes: Record<number, string> = {
						1: `text-4xl ${classList.h1 || ""}`,
						2: `text-3xl ${classList.h2 || ""}`,
						3: `text-2xl border-l-4 border-brandBlue pl-4 ${
							classList.h3 || ""
						}`,
						4: `text-xl ${classList.h4 || ""}`,
						5: `text-lg ${classList.h5 || ""}`,
						6: `text-base ${classList.h6 || ""}`,
					};

					return React.createElement(
						`h${level}`,
						{
							key: lineIdx,
							className: `${baseClass} ${sizes[level]}`,
						},
						content
					);
				}

				// 3. Blockquotes (>)
				if (trimmed.startsWith(">")) {
					return (
						<blockquote
							key={lineIdx}
							className={`border-l-4 border-gray-300 dark:border-white/20 pl-4 py-1 my-4 italic text-gray-600 dark:text-white/60 ${
								classList.blockquote || ""
							}`}
						>
							{renderInline(
								trimmed.replace(/^>\s?/, ""),
								classList
							)}
						</blockquote>
					);
				}

				// 4. Task Lists (- [ ] or - [x])
				const taskMatch = line.match(/^[\*\-]\s\[([ xX])\]\s(.*)/);
				if (taskMatch) {
					const isChecked = taskMatch[1].toLowerCase() === "x";
					return (
						<div
							key={lineIdx}
							className="flex gap-3 ml-4 my-2 items-center text-left"
						>
							<input
								type="checkbox"
								checked={isChecked}
								readOnly
								className={`w-4 h-4 rounded border-brandBlue text-brandBlue ${
									classList.checkbox || ""
								}`}
							/>
							<span
								className={`flex-1 leading-relaxed dark:text-white/90 ${
									classList.liText || ""
								}`}
							>
								{renderInline(taskMatch[2], classList)}
							</span>
						</div>
					);
				}

				// 5. Ordered List (1. )
				const oListMatch = line.match(/^(\d+)\.\s(.*)/);
				if (oListMatch) {
					return (
						<div
							key={lineIdx}
							className={`flex gap-3 ml-2 my-2 items-start text-left ${
								classList.ol || ""
							}`}
						>
							<span
								className={`font-black text-brandBlue shrink-0 ${
									classList.liNumber || ""
								}`}
							>
								{oListMatch[1]}.
							</span>
							<span
								className={`flex-1 leading-relaxed dark:text-white/90 ${
									classList.liText || ""
								}`}
							>
								{renderInline(oListMatch[2], classList)}
							</span>
						</div>
					);
				}

				// 6. Unordered List (* or -)
				const uListMatch = line.match(/^[\*\-]\s(.*)/);
				if (uListMatch) {
					return (
						<div
							key={lineIdx}
							className={`flex gap-3 ml-4 my-2 items-start text-left ${
								classList.ul || ""
							}`}
						>
							<span
								className={`text-brandBlue font-black shrink-0 ${
									classList.liBullet || ""
								}`}
							>
								•
							</span>
							<span
								className={`flex-1 leading-relaxed dark:text-white/90 ${
									classList.liText || ""
								}`}
							>
								{renderInline(uListMatch[1], classList)}
							</span>
						</div>
					);
				}

				// 7. Regular Paragraphs
				return (
					<p
						key={lineIdx}
						className={
							trimmed === ""
								? "h-4"
								: `mb-3 leading-[1.8] text-coreText/90 dark:text-white/80 text-left ${
										classList.p || ""
								  }`
						}
					>
						{renderInline(line, classList)}
					</p>
				);
			})}
		</div>
	);
};

/**
 * Handles Inline Styles (Bold, Links, Images)
 */
function renderInline(text: string, classList: MarkdownClassList) {
	// FIXED: Removed the extra capturing group around the bold regex (**.*?**)
	// This prevents the string split from duplicating the bolded text in the array.
	const parts = text.split(
		/(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)\s?|\*\*.*?\*\*)/g
	);

	return parts.map((part, i) => {
		if (!part) return null;

		// Image: ![alt](url)
		const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)/);
		if (imgMatch) {
			return (
				<img
					key={i}
					src={imgMatch[2]}
					alt={imgMatch[1]}
					className={`rounded-lg my-4 max-w-full h-auto border dark:border-white/10 ${
						classList.img || ""
					}`}
				/>
			);
		}

		// Link: [text](url)
		const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)/);
		if (linkMatch) {
			return (
				<a
					key={i}
					href={linkMatch[2]}
					target="_blank"
					rel="noopener noreferrer"
					className={`text-brandBlue underline hover:opacity-80 transition-opacity ${
						classList.link || ""
					}`}
				>
					{linkMatch[1]}
				</a>
			);
		}

		// Bold: **text**
		if (part.startsWith("**") && part.endsWith("**")) {
			return (
				<strong
					key={i}
					className={`font-black text-brandBlue dark:text-blue-400 ${
						classList.strong || ""
					}`}
				>
					{part.slice(2, -2)}
				</strong>
			);
		}

		return part;
	});
}
