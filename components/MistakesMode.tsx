
import React, { useMemo, useState, useEffect } from 'react';
import { TOPIC_MAP } from '../data';
import QuizMode from './QuizMode';
import { Question, SavedResult, GradingResult } from '../types';
import { analyzeWeaknesses } from '../AIService';
import { MarkdownText } from '../utils';

interface MistakesModeProps {
  mistakeIds: string[];
  mistakeHistoryIds: string[];
  // Corrected: use Record<string, SavedResult[]> to accommodate the multiple attempts history
  progress: Record<string, SavedResult[]>;
  onMistake: (qid: string, isMistake: boolean) => void;
  onSaveProgress: (qid: string, answer: string, result: GradingResult) => void;
}

const MistakesMode: React.FC<MistakesModeProps> = ({ 
  mistakeIds, 
  mistakeHistoryIds, 
  progress, 
  onMistake, 
  onSaveProgress 
}) => {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const promises = Object.values(TOPIC_MAP).map(path => fetch(path).then(res => res.json()));
        const results = await Promise.all(promises);
        setAllQuestions(results.flat());
      } catch (err) {
        console.error("Error loading all questions for mistakes:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // 用於界面練習的題目 (當前尚未掌握的)
  const activeMistakeQuestions = useMemo(() => {
    return allQuestions.filter(q => mistakeIds.includes(q.QID));
  }, [allQuestions, mistakeIds]);

  // 用於 AI 分析的題目 (歷史上曾出錯的所有題目)
  const historyMistakeQuestions = useMemo(() => {
    return allQuestions.filter(q => mistakeHistoryIds.includes(q.QID));
  }, [allQuestions, mistakeHistoryIds]);

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      // 關鍵改動：分析歷史上的所有錯題，而不僅僅是練習清單中的題目
      const result = await analyzeWeaknesses(historyMistakeQuestions, progress);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-2 border-brandBlue/20 border-t-brandBlue rounded-full animate-spin mb-4"></div>
          <p className="text-coreMuted font-medium">正在盤點您的學習盲區...</p>
        </div>
      );
  }

  if (activeMistakeQuestions.length === 0) {
    return (
      <div className="text-center py-24 px-10 glass-card bg-transparent border-dashed border-2 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 bg-coreGray dark:bg-white/5 rounded-full flex items-center justify-center mb-8 text-brandBlue shadow-inner">
          <i className="fas fa-check-double text-4xl"></i>
        </div>
        <h3 className="text-3xl font-bold dark:text-white mb-4 tracking-tight">練習清單已清空</h3>
        <p className="text-coreMuted font-medium max-w-sm leading-relaxed mb-8">
          太棒了！您已經完成了所有標記為困難的題目。
        </p>
        {mistakeHistoryIds.length > 0 && (
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-8 py-4 bg-brandBlue text-white rounded-full font-bold flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-history"></i>}
            分析過往累計數據 ({mistakeHistoryIds.length})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 p-10 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-red-500 text-white rounded-[24px] flex items-center justify-center font-black text-3xl shadow-2xl">
            {activeMistakeQuestions.length}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-red-900 dark:text-red-400 mb-1 tracking-tight">專項錯題集</h2>
            <p className="text-red-700 dark:text-red-300 text-base font-medium opacity-80 italic">歷史累計已追蹤 {mistakeHistoryIds.length} 個薄弱環節</p>
          </div>
        </div>
        <button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full md:w-auto px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <i className="fas fa-circle-notch animate-spin"></i>
          ) : (
            <i className="fas fa-wand-magic-sparkles"></i>
          )}
          AI 全局弱點診斷
        </button>
      </div>

      {analysis && (
        <div className="glass-card bg-brandBlue/5 border-brandBlue/20 animate-in slide-in-down duration-700 p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-brandBlue text-white flex items-center justify-center shadow-lg">
              <i className="fas fa-brain"></i>
            </div>
            <div className="text-left">
              <h3 className="text-2xl font-bold tracking-tight dark:text-white">學習盲區診斷報告</h3>
              <p className="text-[0.65rem] font-bold text-coreMuted uppercase tracking-widest mt-0.5">基於全量歷史錯題數據生成</p>
            </div>
          </div>
          <div className="max-w-none">
            <MarkdownText text={analysis} />
          </div>
        </div>
      )}

      <QuizMode 
        questions={activeMistakeQuestions} 
        onMistake={onMistake}
        mistakeIds={mistakeIds}
        isRandom={true}
        progress={progress}
        onSaveProgress={onSaveProgress}
      />
    </div>
  );
};

export default MistakesMode;
