
import React, { useState, useEffect, useMemo } from 'react';
import { SOURCE_MAP } from '../data';
import { OriginalText } from '../types';

interface OriginalModeProps {
  topic: string;
  translationType: 'word' | 'sentence';
  setTranslationType: (type: 'word' | 'sentence') => void;
}

const OriginalMode: React.FC<OriginalModeProps> = ({ topic, translationType, setTranslationType }) => {
  const [data, setData] = useState<OriginalText | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSource = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const path = SOURCE_MAP[topic];
        if (!path) throw new Error("Path not found");
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const text = await response.text();
        const cleanText = text.trim();
        const json = JSON.parse(cleanText);
        setData(json);
      } catch (err: any) {
        console.error("Failed to load original source:", err);
        setError(err.message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadSource();
  }, [topic]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <div className="w-8 h-8 border-2 border-brandBlue/20 border-t-brandBlue rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-start justify-center py-24 text-left opacity-40">
        <i className="fas fa-exclamation-triangle text-4xl mb-4 text-red-500"></i>
        <p className="text-xl font-bold dark:text-white">原文數據載入失敗 ({error || '未知錯誤'})</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6" key={topic}>
      {/* Header - 此部分在切換 translationType 時不會重啟動畫 */}
      <div className="text-left mb-12 animate-in blur-in">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter dark:text-white mb-1">{data.title}</h2>
        <p className="text-[0.55rem] font-bold text-coreMuted uppercase tracking-[0.5em] opacity-50">{data.author}</p>
        
        <div className="flex justify-start mt-4">
          <div className="bg-coreGray dark:bg-white/5 p-1 rounded-full border border-coreBorder dark:border-darkBorder flex relative w-28 shadow-inner">
            <div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-white/10 rounded-full shadow-sm transition-all duration-500 ease-liquid"
              style={{ left: translationType === 'word' ? '4px' : 'calc(50% + 0px)' }}
            />
            <button 
              onClick={() => setTranslationType('word')}
              className={`relative z-10 flex-1 py-1 text-[0.55rem] font-black uppercase tracking-widest transition-colors duration-500 ${translationType === 'word' ? 'text-brandBlue dark:text-white' : 'text-coreMuted'}`}
            >
              逐字
            </button>
            <button 
              onClick={() => setTranslationType('sentence')}
              className={`relative z-10 flex-1 py-1 text-[0.55rem] font-black uppercase tracking-widest transition-colors duration-500 ${translationType === 'sentence' ? 'text-brandBlue dark:text-white' : 'text-coreMuted'}`}
            >
              逐句
            </button>
          </div>
        </div>
      </div>

      {/* Poetry Content - 僅在此區域添加 key 以便在切換模式時觸發 staggered 動畫 */}
      <div 
        key={translationType}
        className="flex flex-col items-start space-y-8 pb-60 transition-all duration-500"
      >
        {data.content.map((line, lineIdx) => (
          <PoetryLine 
            key={lineIdx} 
            index={lineIdx}
            line={line} 
            mode={translationType} 
          />
        ))}
      </div>
    </div>
  );
};

interface LineProps {
  index: number;
  line: any;
  mode: 'word' | 'sentence';
}

const PoetryLine: React.FC<LineProps> = ({ index, line, mode }) => {
  const words = useMemo(() => {
    const list: { term: string; def: string }[] = [];
    if (line.translation && line.translation.word) {
      line.translation.word.forEach((w: string) => {
        const parts = w.split('：');
        if (parts.length === 2) list.push({ term: parts[0], def: parts[1] });
      });
    }
    return list;
  }, [line]);

  if (mode === 'sentence') {
    return (
      <div 
        className="relative flex flex-col items-start w-full group cursor-default animate-in blur-in"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="mb-2">
          <span className="text-[0.65rem] md:text-[0.8rem] font-bold text-brandBlue leading-relaxed block">
            {line.translation?.sentence}
          </span>
        </div>
        
        <div className="py-0.5">
          <span className="text-base md:text-xl font-black dark:text-white tracking-[0.05em] leading-tight">
            {line.source}
          </span>
        </div>
      </div>
    );
  }

  // 逐字模式：處理文本切分
  const sortedWords = [...words].sort((a, b) => b.term.length - a.term.length);
  const parts: (string | { term: string; def: string })[] = [line.source];
  
  sortedWords.forEach(wordObj => {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (typeof p === 'string') {
        const indexMatch = p.indexOf(wordObj.term);
        if (indexMatch !== -1) {
          const before = p.substring(0, indexMatch);
          const after = p.substring(indexMatch + wordObj.term.length);
          const newParts: (string | { term: string; def: string })[] = [];
          if (before) newParts.push(before);
          newParts.push(wordObj);
          if (after) newParts.push(after);
          parts.splice(i, 1, ...newParts);
          i += (before ? 1 : 0);
        }
      }
    }
  });

  return (
    <div className="flex flex-col items-start w-full">
      <div className="flex justify-start items-baseline text-base md:text-xl font-black dark:text-white tracking-[0.1em] cursor-default py-4 flex-wrap gap-x-0 gap-y-12">
        {parts.map((p, i) => {
          if (typeof p === 'string') {
            return (
              <span 
                key={i} 
                className="dark:text-white leading-none animate-in blur-in"
                style={{ animationDelay: `${index * 80 + i * 20}ms` }}
              >
                {p}
              </span>
            );
          }
          return (
            <WordSegment 
              key={i} 
              term={p.term} 
              def={p.def} 
              delay={index * 80 + i * 20}
            />
          );
        })}
      </div>
    </div>
  );
};

const WordSegment: React.FC<{ term: string; def: string; delay: number }> = ({ term, def, delay }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <span 
      className={`relative group mx-1 inline-flex flex-col items-center transition-all duration-300 animate-in blur-in ${hovered ? 'z-50' : 'z-10'}`}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 註釋文字 */}
      <div className="absolute bottom-[115%] left-1/2 -translate-x-1/2 pointer-events-none w-max z-[100]">
        <span 
          className={`text-[0.6rem] md:text-[0.75rem] font-black text-brandBlue transition-all duration-500 block leading-none text-center whitespace-nowrap ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        >
          {def}
        </span>
      </div>
      
      {/* 原字部分：下劃線加深，hover時不大幅變色 */}
      <span className={`px-0.5 pb-1 pt-1 transition-all duration-500 border-b-[2.5px] leading-none ${hovered ? 'border-brandBlue' : 'border-brandBlue/40 dark:border-white/30'}`}>
        {term}
      </span>
    </span>
  );
};

export default OriginalMode;
