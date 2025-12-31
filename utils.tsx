
import React from 'react';

/**
 * 強化版 Markdown 渲染器：
 * - 支援 # 到 ###### 各級標題
 * - 支援 **粗體**
 * - 支援 1. 有序列表
 * - 支援 * 或 - 無序列表
 * - 支援 --- 水平分割線
 */
export const MarkdownText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  const lines = text.split('\n');

  return (
    <div className={`whitespace-pre-line ${className}`}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // 1. 水平分割線
        if (trimmed === '---') {
          return <hr key={lineIdx} className="my-8 border-coreBorder dark:border-white/10" />;
        }

        // 2. 標題處理 (# 到 ######)
        const headingMatch = line.match(/^(#{1,6})\s(.*)/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const content = renderInline(headingMatch[2]);
          const baseClass = "font-bold mt-8 mb-4 tracking-tight dark:text-white";
          
          if (level === 1) return <h1 key={lineIdx} className={`${baseClass} text-4xl`}>{content}</h1>;
          if (level === 2) return <h2 key={lineIdx} className={`${baseClass} text-3xl`}>{content}</h2>;
          if (level === 3) return <h3 key={lineIdx} className={`${baseClass} text-2xl border-l-4 border-brandBlue pl-4`}>{content}</h3>;
          if (level === 4) return <h4 key={lineIdx} className={`${baseClass} text-xl`}>{content}</h4>;
          return <h5 key={lineIdx} className={`${baseClass} text-lg`}>{content}</h5>;
        }

        // 3. 有序列表 (1. )
        const oListMatch = line.match(/^(\d+)\.\s(.*)/);
        if (oListMatch) {
          return (
            <div key={lineIdx} className="flex gap-3 ml-2 my-2 items-start text-left">
              <span className="font-black text-brandBlue shrink-0">{oListMatch[1]}.</span>
              <span className="flex-1 leading-relaxed dark:text-white/90">{renderInline(oListMatch[2])}</span>
            </div>
          );
        }

        // 4. 無序列表 (* 或 -)
        const uListMatch = line.match(/^[\*\-]\s(.*)/);
        if (uListMatch) {
          return (
            <div key={lineIdx} className="flex gap-3 ml-4 my-2 items-start text-left">
              <span className="text-brandBlue font-black shrink-0">•</span>
              <span className="flex-1 leading-relaxed dark:text-white/90">{renderInline(uListMatch[1])}</span>
            </div>
          );
        }

        // 5. 普通段落
        return (
          <p key={lineIdx} className={trimmed === "" ? "h-4" : "mb-3 leading-[1.8] text-coreText/90 dark:text-white/80 text-left"}>
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * 處理行內樣式 (粗體)
 */
function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong 
          key={i} 
          className="font-black text-brandBlue dark:text-blue-400"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
