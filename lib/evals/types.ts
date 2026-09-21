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

export const AGENTIC_BENCHMARK_IDS = [
  "dsqa",
  "browsecomp",
  "finsearchcomp",
  "livebrowsecomp",
] as const;

export type AgenticBenchmarkId = (typeof AGENTIC_BENCHMARK_IDS)[number];

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

export type AgenticDatasetSnapshot = {
  schemaVersion: 1;
  benchmark: AgenticBenchmarkId;
  benchmarkName: string;
  source: string;
  adapterVersion: string;
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

export type DsqaMatch = {
  referenceItem: string;
  predictedItem: string;
};

export type DsqaF1GradeTrace = {
  provider: "openai";
  model: string;
  responseId: string;
  promptVersion: "dsqa-list-f1-openai-proxy-v1";
  /** This local proxy does not reproduce DSQA's official Gemini autorater. */
  evaluator: "local-openai-proxy";
  referenceItems: string[];
  predictedItems: string[];
  matches: DsqaMatch[];
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
};

export type AgenticAccuracyGradeTrace = {
  provider: "openai";
  model: string;
  responseId: string;
  promptVersion:
    | "browsecomp-compatible-openai-v1"
    | "livebrowsecomp-exact-answer-openai-proxy-v1";
  evaluator: "benchmark-compatible-openai" | "local-openai-proxy";
  extractedAnswer: string;
  reasoning: string;
  correct: boolean;
  score: 0 | 1;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
};

export type FinSearchCompGradeTrace = {
  provider: "openai";
  model: string;
  responseId: string;
  promptVersion: "finsearchcomp-row-judge-openai-proxy-v1";
  evaluator: "benchmark-prompt-openai-proxy";
  rawOutput: string;
  score: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
};

export type AgenticBenchmarkGradeTrace = AgenticAccuracyGradeTrace | FinSearchCompGradeTrace;

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

/**
 * A transcript from our own small tool-using agent. This is intentionally not
 * an Exa Agent trace: the public Agent API does not expose a highlights-mode
 * switch, so it cannot make a paired Standard/Dynamic experiment.
 */
export type AgentSearchTrace = {
  query: string;
  urls: string[];
  discoveryLatencyMs: number;
  retrieval?: RetrievalArm;
  error?: string;
};

export type AgentTrace = {
  mode: HighlightMode;
  model: string;
  promptVersion: string;
  maxSearches: number;
  finalAnswer: string;
  searches: AgentSearchTrace[];
  usage: {
    /** Sum of all Responses API calls made by the agent, including tool turns. */
    modelInputTokens: number;
    modelOutputTokens: number;
    modelTotalTokens: number;
    /** Exact formatted Exa context tokens returned across every search. */
    retrievalTokens: number;
    /** Model + retrieved-context tokens; reported separately from API billing. */
    totalObservedTokens: number;
  };
  latencyMs: number;
};

export type AgenticPairTrace = {
  schemaVersion: 1;
  createdAt: string;
  benchmark: string;
  item: BenchmarkItem;
  standard: AgentTrace;
  dynamic: AgentTrace;
  grades?: { standard: SimpleQAGradeTrace; dynamic: SimpleQAGradeTrace };
  dsqaF1Grades?: { standard: DsqaF1GradeTrace; dynamic: DsqaF1GradeTrace };
  benchmarkGrades?: {
    standard: AgenticBenchmarkGradeTrace;
    dynamic: AgenticBenchmarkGradeTrace;
  };
};
