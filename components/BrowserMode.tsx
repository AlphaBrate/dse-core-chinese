
import React, { useState } from 'react';
import { Question } from '../types';
import { MarkdownText } from '../utils';

interface BrowserModeProps {
  topic: string;
  questions: Question[];
}

const BrowserMode: React.FC<BrowserModeProps> = ({ topic, questions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (questions.length === 0) {
    return <div className="text-center py-24 text-coreMuted font-medium">此數據集目前為空。</div>;
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight dark:text-white">{topic}：資產清單</h2>
        <span className="bg-coreGray dark:bg-white/10 px-4 py-1.5 rounded-full text-[0.65rem] font-bold text-coreMuted uppercase tracking-widest">
          共 {questions.length} 個評分單元
        </span>
      </div>
      
      <div className="grid gap-4">
        {questions.map((q, idx) => (
          <div 
            key={q.QID} 
            className={`glass-card !p-0 overflow-hidden ${expandedId === q.QID ? 'border-brandBlue shadow-xl' : 'hover:border-coreMuted'}`}
          >
            <button
              onClick={() => setExpandedId(expandedId === q.QID ? null : q.QID)}
              className="w-full text-left p-6 flex justify-between items-center group transition-colors"
            >
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[0.6rem] font-bold text-coreMuted uppercase tracking-widest">{q.QID}</span>
                  <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest ${q.type === 'copy' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500' : 'bg-blue-100 text-brandBlue dark:bg-brandBlue/20 dark:text-blue-300'}`}>
                    {q.type === 'copy' ? '原文摘錄' : '深度分析'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-coreText dark:text-white leading-relaxed">
                  {idx + 1}. <MarkdownText text={q.question.map(seg => seg.text).join('')} />
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-coreGray dark:bg-white/10 flex items-center justify-center transition-transform group-hover:scale-110">
                <i className={`fas fa-chevron-down text-xs text-coreMuted transition-transform ${expandedId === q.QID ? 'rotate-180 text-brandBlue' : ''}`}></i>
              </div>
            </button>
            
            {expandedId === q.QID && (
              <div className="px-8 pb-8 pt-4 bg-coreGray/30 dark:bg-white/5 border-t border-coreBorder dark:border-darkBorder animate-in slide-in-from-top-2 duration-500">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[0.65rem] font-bold text-coreMuted uppercase tracking-widest mb-4">評分準則與官方參考答案</label>
                    <div className="grid gap-3">
                      {q.answer.map((ans, aIdx) => (
                        <div key={aIdx} className="bg-white dark:bg-darkCard p-6 rounded-core border border-coreBorder dark:border-darkBorder flex items-center gap-4 shadow-sm">
                          <div className="w-8 h-8 rounded-full bg-brandBlue/10 text-brandBlue flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {ans.score}
                          </div>
                          <div>
                            <p className="text-base font-bold text-coreText dark:text-white/90 leading-relaxed">
                                <MarkdownText text={ans.text} />
                            </p>
                            {ans.remark && (
                              <p className="text-[0.65rem] font-bold text-red-500 mt-1 uppercase">註記：{ans.remark}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowserMode;
