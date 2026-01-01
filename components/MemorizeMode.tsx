import React, { useMemo } from 'react';
import { Question } from '../types';
import { MarkdownText } from '../utils';

interface MemorizeModeProps {
  topic: string;
  questions: Question[];
}

const MemorizeMode: React.FC<MemorizeModeProps> = ({ topic, questions }) => {
  const summarizedPoints = useMemo(() => {
    const points: { q: string, a: string[], id: string }[] = [];
    questions.forEach(q => {
      const qFull = q.question.map(sq => sq.text).join('');
      const qText = qFull.length > 60 ? qFull.substring(0, 60) + '...' : qFull;
      const validAnswers = q.answer.filter(a => a.label === 'point').map(a => a.text);
      if (validAnswers.length > 0) {
        points.push({ q: qText, a: validAnswers, id: q.QID });
      }
    });
    return points;
  }, [questions]);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10 space-y-8 sm:space-y-12 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight dark:text-white mb-3">
          核心要點總結：{topic}
        </h2>
        <p className="text-coreMuted font-medium text-sm sm:text-lg">
          系統已提取必考分析點與核心原文，助您建立長期記憶模型。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left Column: Analysis Highlights */}
        <div className="space-y-6">
          <div className="glass-card bg-white dark:bg-darkCard border-brandBlue/20 p-5 sm:p-8 rounded-core border">
            <h3 className="text-lg sm:text-xl font-bold mb-6 sm:mb-8 flex items-center gap-3 dark:text-white">
              <i className="fas fa-brain text-brandBlue"></i>
              關鍵分析亮點
            </h3>
            <div className="space-y-6">
              {summarizedPoints.map(p => (
                <div key={p.id} className="bg-coreGray/50 dark:bg-white/5 p-4 sm:p-6 rounded-core border border-coreBorder dark:border-white/10 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-lg">
                  <span className="text-[0.6rem] font-bold text-brandBlue/60 uppercase tracking-widest block mb-2">{p.id}</span>
                  <div className="font-bold mb-3 sm:mb-4 border-b border-coreBorder dark:border-white/10 pb-2 sm:pb-3 leading-relaxed text-base sm:text-lg dark:text-white">
                    <MarkdownText text={p.q} />
                  </div>
                  <ul className="space-y-2 sm:space-y-3">
                    {p.a.map((ans, i) => (
                      <li key={i} className="flex gap-3 text-xs sm:text-sm font-medium leading-relaxed dark:text-white/80">
                        <span className="text-brandBlue font-black mt-1">·</span>
                        <span><MarkdownText text={ans} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Excerpts and Guidance */}
        <div className="space-y-6">
          <div className="glass-card bg-white dark:bg-darkCard border-coreBorder dark:border-darkBorder p-5 sm:p-8 rounded-core border">
            <h3 className="text-lg sm:text-xl font-bold mb-6 sm:mb-8 flex items-center gap-3 dark:text-white">
              <i className="fas fa-feather-pointed text-brandBlue"></i>
              核心摘錄模組
            </h3>
            <div className="grid gap-3 sm:gap-4">
              {questions.filter(q => q.type === 'copy').map(q => (
                <div key={q.QID} className="p-4 sm:p-6 rounded-core bg-coreGray/50 dark:bg-white/5 border border-coreBorder dark:border-white/5 transition-all hover:border-brandBlue/30 group">
                  <span className="text-[0.6rem] font-bold text-coreMuted block mb-2">{q.QID}</span>
                  <p className="text-xs sm:text-sm font-medium text-coreMuted mb-3 sm:mb-4 italic leading-relaxed group-hover:text-coreText dark:group-hover:text-white/70 transition-colors">
                    題目要求：<MarkdownText text={q.question.map(s => s.text).join('')} />
                  </p>
                  {q.answer.map((ans, i) => (
                    <div key={i} className="bg-white dark:bg-darkBg p-4 sm:p-6 rounded-core border border-coreBorder dark:border-white/10 text-center shadow-sm">
                      <p className="text-xl sm:text-2xl font-bold text-brandBlue leading-relaxed tracking-tight">
                        「<MarkdownText text={ans.text} />」
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Call to Action / Quote Card */}
          <div className="p-6 sm:p-10 bg-gradient-to-br from-brandBlue to-blue-600 text-white rounded-[24px] sm:rounded-[32px] shadow-2xl shadow-blue-500/20 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 sm:p-12 opacity-10 pointer-events-none transition-transform duration-1000 group-hover:scale-125">
              <i className="fas fa-lightbulb text-6xl sm:text-8xl"></i>
            </div>
            <div className="relative z-10">
              <h4 className="text-[0.65rem] font-bold uppercase tracking-[0.4em] mb-3 sm:mb-4 opacity-70 text-white">學習導讀</h4>
              <p className="text-lg sm:text-2xl font-bold italic leading-relaxed tracking-tight">
                「將複雜的文學分析原子化，是通往高分閱卷反饋的唯一途徑。」
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemorizeMode;