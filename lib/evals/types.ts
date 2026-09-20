export type HighlightMode = "standard" | "dynamic";

export type BenchmarkItem = {
  id: string;
  problem: string;
  answer: string;
  metadata?: Record<string, string>;
};

export type DatasetSnapshot = {
  benchmark: "simpleqa";
  source: string;
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
    highlights: { query: string; dynamic?: true };
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
};

export type SimpleQAGradeLabel = "CORRECT" | "INCORRECT" | "NOT_ATTEMPTED";

export type SimpleQAGradeTrace = {
  provider: "openai";
  model: string;
  responseId: string;
  promptVersion: "openai-simpleqa-three-way-v1";
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
