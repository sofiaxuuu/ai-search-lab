import { countRetrievalTokens } from "./retrieval-tokenizer";
import type { AgentTrace, AgenticPairTrace } from "./types";
import type {
  AgenticInspectorArm,
  AgenticInspectorBenchmark,
  AgenticInspectorItem,
} from "../visualization/agentic-inspector-types";

function score(trace: AgenticPairTrace, mode: "standard" | "dynamic") {
  if (trace.benchmarkGrades) return trace.benchmarkGrades[mode].score;
  if (trace.dsqaF1Grades) return trace.dsqaF1Grades[mode].f1;
  return trace.grades?.[mode].score ?? 0;
}

const BENCHMARKS = {
  dsqa: { name: "DeepSearchQA · F1", protectedContent: false },
  browsecomp: { name: "BrowseComp", protectedContent: true },
  finsearchcomp: { name: "FinSearchComp", protectedContent: false },
  livebrowsecomp: { name: "LiveBrowseComp", protectedContent: true },
} as const;

function arm(trace: AgentTrace, grade: number, protectedContent: boolean): AgenticInspectorArm {
  return {
    answer: trace.finalAnswer,
    score: grade,
    modelTokens: trace.usage.modelTotalTokens,
    retrievalTokens: trace.usage.retrievalTokens,
    searches: trace.searches.map((search, index) => {
      const excerpts = search.retrieval?.response.excerpts ?? [];
      return {
        turn: index + 1,
        query: protectedContent ? `Protected search query ${index + 1}` : search.query,
        retrievalTokens: search.retrieval?.metrics.retrievalTokens ?? 0,
        returnedCharacters: search.retrieval?.metrics.returnedCharacters ?? 0,
        excerpts: excerpts.map((excerpt) => ({
          id: excerpt.id,
          source: protectedContent ? "Protected source" : excerpt.url,
          ...(protectedContent ? {} : { url: excerpt.url, text: excerpt.text }),
          characters: excerpt.text.length,
          tokens: countRetrievalTokens([excerpt]),
        })),
      };
    }),
  };
}

export function buildAgenticInspector(traces: AgenticPairTrace[]): AgenticInspectorBenchmark[] {
  return Object.entries(BENCHMARKS).map(([benchmark, config]) => {
    const items: AgenticInspectorItem[] = traces
      .filter((trace) => trace.benchmark === benchmark)
      .sort((left, right) => left.item.id.localeCompare(right.item.id))
      .map((trace, index) => ({
        id: trace.item.id,
        question: config.protectedContent ? `Protected benchmark item ${index + 1}` : trace.item.problem,
        referenceAnswer: config.protectedContent ? "Protected by the benchmark release" : trace.item.answer,
        standard: {
          ...arm(trace.standard, score(trace, "standard"), config.protectedContent),
          answer: config.protectedContent ? "Protected answer" : trace.standard.finalAnswer,
        },
        dynamic: {
          ...arm(trace.dynamic, score(trace, "dynamic"), config.protectedContent),
          answer: config.protectedContent ? "Protected answer" : trace.dynamic.finalAnswer,
        },
      }));
    return { id: benchmark, ...config, items };
  });
}
