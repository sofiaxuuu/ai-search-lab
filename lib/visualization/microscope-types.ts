import type { HighlightMode, SingleTurnBenchmarkId } from "../evals/types";

export type MicroscopeGrade = {
  label: "CORRECT" | "INCORRECT" | "NOT_ATTEMPTED";
  score: 0 | 1;
};

export type MicroscopeArm = {
  mode: HighlightMode;
  excerpts: Array<{ id: string; url: string; text: string }>;
  returnedCharacters: number;
  retrievalTokens: number;
  answer: string;
  grade?: MicroscopeGrade;
};

export type MicroscopeItem = {
  benchmark: SingleTurnBenchmarkId;
  item: { id: string; problem: string; answer: string };
  standard: MicroscopeArm;
  dynamicByConfig: Record<string, MicroscopeArm>;
};

export type MicroscopeBenchmark = {
  id: SingleTurnBenchmarkId;
  name: string;
  count: number;
  path: string;
};

export type MicroscopeManifest = {
  schemaVersion: 1;
  totalQuestions: number;
  defaultBenchmark: SingleTurnBenchmarkId;
  defaultDynamicConfig: "medium";
  benchmarks: MicroscopeBenchmark[];
};
