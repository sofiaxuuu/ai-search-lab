export type AgenticInspectorExcerpt = {
  id: string;
  source: string;
  url?: string;
  text?: string;
  characters: number;
  tokens: number;
};

export type AgenticInspectorSearch = {
  turn: number;
  query: string;
  retrievalTokens: number;
  returnedCharacters: number;
  excerpts: AgenticInspectorExcerpt[];
};

export type AgenticInspectorArm = {
  answer: string;
  score: number;
  modelTokens: number;
  retrievalTokens: number;
  searches: AgenticInspectorSearch[];
};

export type AgenticInspectorItem = {
  id: string;
  question: string;
  referenceAnswer: string;
  standard: AgenticInspectorArm;
  dynamic: AgenticInspectorArm;
};

export type AgenticInspectorBenchmark = {
  id: string;
  name: string;
  protectedContent: boolean;
  items: AgenticInspectorItem[];
};
