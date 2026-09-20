export type HighlightMode = "standard" | "dynamic";

export const SINGLE_TURN_BENCHMARK_IDS = [
  "simpleqa",
  "multiloko",
  "frames",
  "sealqa",
  "sealqa-hard",
  "sweqa-code-proxy",
] as const;

export type SingleTurnBenchmarkId = (typeof SINGLE_TURN_BENCHMARK_IDS)[number];

export type BenchmarkItem = {
  id: string;
  problem: string;
  answer: string;
  acceptableAnswers?: string[];
  metadata?: Record<string, unknown>;
};

export type DatasetSnapshot = {
  schemaVersion?: 1 | 2;
  benchmark: SingleTurnBenchmarkId;
  benchmarkName?: string;
  source: string;
  sourceRevision?: string;
  adapterVersion?: string;
  importedAt: string;
  seed: number;
  totalSourceItems: number;
  items: BenchmarkItem[];
};

export type DiscoveryTrace = {
  query: string;
  urls: string[];
  requestId?: string;
  latencyMs: number;
};

export type RetrievalExcerpt = {
  id: string;
  url: string;
  text: string;
};

export type RetrievalArm = {
  mode: HighlightMode;
  request: {
    ids: string[];
    highlights: {
      query: string;
      dynamic?: true;
      maxCharacters?: number;
      verbosity?: "low" | "medium" | "high";
    };
    beta?: string;
  };
  response: {
    requestId?: string;
    excerpts: RetrievalExcerpt[];
    statuses: Array<{ url: string; status: string; source?: string }>;
    costDollars?: number;
  };
  metrics: {
    returnedCharacters: number;
    estimatedTokens: number;
    retrievalTokens?: number;
    tokenizer?: TokenizerDescriptor;
    latencyMs: number;
  };
  answer?: AnswerTrace;
};

export type AnswerTrace = {
  provider: "openai";
  model: string;
  responseId: string;
  promptVersion: string;
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  provisionalGrade: {
    exactMatch: number;
    tokenF1: number;
    note: "debug-only-not-official-simpleqa-grade";
  };
  simpleQAGrade?: SimpleQAGradeTrace;
  grade?: SimpleQAGradeTrace;
};

export type SimpleQAGradeLabel = "CORRECT" | "INCORRECT" | "NOT_ATTEMPTED";

export type SimpleQAGradeTrace = {
  provider: "openai";
  model: string;
  responseId: string;
  promptVersion: "openai-simpleqa-three-way-v1" | "reference-answer-three-way-v1";
  rawOutput: string;
  label: SimpleQAGradeLabel;
  score: 0 | 1;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
};

export type RetrievalPair = {
  schemaVersion: 1;
  createdAt: string;
  benchmark: "simpleqa";
  item: BenchmarkItem;
  discovery: DiscoveryTrace;
  standard: RetrievalArm;
  dynamic: RetrievalArm;
};

export type TokenizerDescriptor = {
  library: "js-tiktoken";
  libraryVersion: "1.0.21";
  encoding: "o200k_base";
  countedText: "formatted-retrieval-context";
};

export type BudgetSweepTrace = {
  schemaVersion: 2;
  createdAt: string;
  benchmark: SingleTurnBenchmarkId;
  item: BenchmarkItem;
  discovery: DiscoveryTrace;
  standard: RetrievalArm;
  dynamicByConfig: Record<string, RetrievalArm>;
  /** Present only on an interrupted pre-migration trace. */
  dynamicByBudget?: Record<string, RetrievalArm>;
};
