export type QType = "single" | "multiple" | "truefalse" | "ordering";

/** A question as served from public/data/q/<module>.json (markdown pre-rendered to HTML). */
export type QItem = {
  id: string;
  module: string;
  topic: string;
  type: QType;
  difficulty: 1 | 2 | 3;
  q: string; // html (Thai)
  qEn?: string; // html (English) — real exam is in English
  diagram?: string;
  options: { id: string; html: string; htmlEn?: string }[];
  answer: string[];
  exp: string; // html
  ref?: string;
};

export type MockKind = "full" | "full-random" | "module" | "drill" | "retry" | "review";

export type MockDef = {
  id: string;
  kind: MockKind;
  title: string;
  desc: string;
  count: number;
  minutes: number | null; // null = untimed
  instant: boolean; // reveal answer right after answering
  module?: string;
};

export type Attempt = {
  attemptId: string;
  mockId: string;
  title: string;
  instant: boolean;
  questionIds: string[];
  optionOrder: Record<string, string[]>;
  answers: Record<string, string[]>;
  checked: string[]; // instant mode: questions already revealed
  flags: string[];
  current: number;
  startedAt: number;
  deadline: number | null;
};

export type ModuleScore = { correct: number; total: number };

export type HistoryEntry = {
  attemptId: string;
  mockId: string;
  title: string;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  timedOut: boolean;
  correct: number;
  total: number;
  score: number; // 0–1000
  passed: boolean;
  perModule: Record<string, ModuleScore>;
  questionIds: string[];
  optionOrder: Record<string, string[]>;
  answers: Record<string, string[]>;
  flags: string[];
};

export type SrsItem = { box: number; due: number; wrong: number; lastWrong: number };
