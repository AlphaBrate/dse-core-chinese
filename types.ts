
export interface KnowledgeRequirement {
  type: 'knowledge' | 'question-completion';
  topic?: string;
  QID?: string;
}

export interface QuestionSegment {
  text: string;
  'score-reference'?: number[];
}

export interface AnswerPoint {
  text: string;
  label: 'exact' | 'point' | 'complete';
  remark?: string;
  score: number;
}

export interface Question {
  QID: string;
  requires: KnowledgeRequirement[];
  question: QuestionSegment[];
  score: number;
  type: 'copy' | 'analysis' | 'mc' | 'vocabulary';
  answer: AnswerPoint[];
}

export interface GradingResult {
  totalScore: number;
  maxScore: number;
  feedback: {
    pointIndex: number;
    awardedScore: number;
    comment: string;
    hit: boolean;
  }[];
  overallComment: string;
}

export interface SavedResult {
  answer: string;
  result: GradingResult;
  timestamp: number;
}

export interface TranslationData {
  word: string[];
  sentence: string;
}

export interface OriginalLine {
  source: string;
  translation: TranslationData;
}

export interface OriginalText {
  title: string;
  author: string;
  content: OriginalLine[];
}

export enum AppMode {
  Quiz = 'quiz',
  Browse = 'browse',
  Memorize = 'memorize',
  Mistakes = 'mistakes',
  Original = 'original'
}
