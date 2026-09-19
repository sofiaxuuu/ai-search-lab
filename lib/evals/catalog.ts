export type EvalTrack = "single-turn" | "agentic";

export type Benchmark = {
  id: string;
  name: string;
  track: EvalTrack;
  metric: string;
  availability: "public" | "unclear";
  defaultSampleSize: number;
  note: string;
};

export const benchmarkCatalog: Benchmark[] = [
  { id: "simpleqa", name: "SimpleQA", track: "single-turn", metric: "accuracy", availability: "public", defaultSampleSize: 100, note: "Short factual answers." },
  { id: "long-context-code-qa", name: "Long-context code QA", track: "single-turn", metric: "accuracy", availability: "unclear", defaultSampleSize: 50, note: "Exa does not identify the exact dataset; use a named public proxy and label it." },
  { id: "multiloko", name: "MultiLoKo", track: "single-turn", metric: "exact match", availability: "public", defaultSampleSize: 100, note: "Locally sourced questions across 31 languages." },
  { id: "frames", name: "FRAMES", track: "single-turn", metric: "accuracy", availability: "public", defaultSampleSize: 100, note: "Multi-hop questions requiring several sources." },
  { id: "sealqa", name: "SealQA + SealQA-Hard", track: "single-turn", metric: "accuracy", availability: "public", defaultSampleSize: 100, note: "Noisy and conflicting search evidence." },
  { id: "dsqa", name: "DSQA", track: "agentic", metric: "F1", availability: "public", defaultSampleSize: 30, note: "DeepSearchQA; multi-step information seeking." },
  { id: "browsecomp", name: "BrowseComp", track: "agentic", metric: "accuracy", availability: "public", defaultSampleSize: 30, note: "Hard-to-find, easy-to-verify facts." },
  { id: "finsearchcomp", name: "FinSearchComp", track: "agentic", metric: "accuracy", availability: "public", defaultSampleSize: 30, note: "Historical and multi-step financial research." },
  { id: "widesearch-en", name: "WideSearch-en", track: "agentic", metric: "F1 by row", availability: "unclear", defaultSampleSize: 20, note: "Exact Exa subset and evaluator are not published." },
  { id: "livebrowsecomp", name: "LiveBrowseComp", track: "agentic", metric: "accuracy", availability: "public", defaultSampleSize: 30, note: "Recent questions designed to reduce model-memory effects." },
];

export type PublishedPoint = {
  benchmark: string;
  dynamic: { score: number; tokensK: number };
  standard: { score: number; tokensK: number };
};

// Values transcribed from Exa's Aug. 28, 2026 Dynamic Highlights charts.
// Token positions are approximate because the post publishes them only graphically.
export const exaPublishedSingleTurn: PublishedPoint[] = [
  { benchmark: "SimpleQA", dynamic: { score: 94.6, tokensK: 1.5 }, standard: { score: 93.6, tokensK: 2.8 } },
  { benchmark: "Long-context code QA", dynamic: { score: 87.7, tokensK: 2.45 }, standard: { score: 81.0, tokensK: 4.23 } },
  { benchmark: "MultiLoKo", dynamic: { score: 77.3, tokensK: 2.8 }, standard: { score: 73.7, tokensK: 4.62 } },
  { benchmark: "FRAMES", dynamic: { score: 55.6, tokensK: 2.75 }, standard: { score: 53.4, tokensK: 3.83 } },
  { benchmark: "SealQA + SealQA-Hard", dynamic: { score: 37.4, tokensK: 3.44 }, standard: { score: 31.6, tokensK: 4.78 } },
];

export const exaPublishedAgentic: PublishedPoint[] = [
  { benchmark: "DSQA (F1)", dynamic: { score: 77.0, tokensK: 365 }, standard: { score: 75.1, tokensK: 560 } },
  { benchmark: "BrowseComp", dynamic: { score: 63.9, tokensK: 375 }, standard: { score: 63.0, tokensK: 405 } },
  { benchmark: "FinSearchComp", dynamic: { score: 62.4, tokensK: 118 }, standard: { score: 59.5, tokensK: 158 } },
  { benchmark: "WideSearch-en (F1 by row)", dynamic: { score: 57.0, tokensK: 218 }, standard: { score: 53.3, tokensK: 342 } },
  { benchmark: "LiveBrowseComp", dynamic: { score: 51.8, tokensK: 516 }, standard: { score: 50.7, tokensK: 640 } },
];
