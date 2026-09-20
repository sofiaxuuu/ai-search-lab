import { pairedBootstrapCI } from "./bootstrap";
import { PUBLIC_DYNAMIC_CONFIGS } from "./suite-config";
import type { BudgetSweepTrace, RetrievalArm, SingleTurnBenchmarkId } from "./types";

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function score(arm: RetrievalArm) {
  return arm.answer?.grade?.score ?? arm.answer?.simpleQAGrade?.score;
}

function retrievalTokens(arm: RetrievalArm) {
  return arm.metrics.retrievalTokens;
}

type PairedRow = {
  itemId: string;
  standardScore: number;
  dynamicScore: number;
  scoreDelta: number;
  standardTokens: number;
  dynamicTokens: number;
  tokenDelta: number;
};

function summarizeRows(rows: PairedRow[], config: string) {
  const scoreDelta = (sample: PairedRow[]) => mean(sample.map((row) => row.scoreDelta));
  const tokenDelta = (sample: PairedRow[]) => mean(sample.map((row) => row.tokenDelta));
  const tokenReduction = (sample: PairedRow[]) =>
    1 - mean(sample.map((row) => row.dynamicTokens)) / mean(sample.map((row) => row.standardTokens));
  return {
    config,
    completedItems: rows.length,
    standardScore: mean(rows.map((row) => row.standardScore)),
    dynamicScore: mean(rows.map((row) => row.dynamicScore)),
    scoreDelta: scoreDelta(rows),
    scoreDeltaCI95: pairedBootstrapCI(rows, scoreDelta),
    standardMeanRetrievalTokens: mean(rows.map((row) => row.standardTokens)),
    dynamicMeanRetrievalTokens: mean(rows.map((row) => row.dynamicTokens)),
    meanRetrievalTokenDelta: tokenDelta(rows),
    retrievalTokenDeltaCI95: pairedBootstrapCI(rows, tokenDelta),
    retrievalTokenReduction: tokenReduction(rows),
    retrievalTokenReductionCI95: pairedBootstrapCI(rows, tokenReduction),
    rows,
  };
}

function rowsForConfig(traces: BudgetSweepTrace[], config: string): PairedRow[] {
  return traces.flatMap((trace) => {
    const dynamic = trace.dynamicByConfig?.[config];
    const standardScore = score(trace.standard);
    const dynamicScore = dynamic ? score(dynamic) : undefined;
    const standardTokens = retrievalTokens(trace.standard);
    const dynamicTokens = dynamic ? retrievalTokens(dynamic) : undefined;
    if (
      standardScore === undefined ||
      dynamicScore === undefined ||
      standardTokens === undefined ||
      dynamicTokens === undefined
    ) {
      return [];
    }
    return [{
      itemId: trace.item.id,
      standardScore,
      dynamicScore,
      scoreDelta: dynamicScore - standardScore,
      standardTokens,
      dynamicTokens,
      tokenDelta: dynamicTokens - standardTokens,
    }];
  });
}

export function summarizeBudgetSweeps(traces: BudgetSweepTrace[]) {
  const benchmarkIds = [...new Set(traces.map((trace) => trace.benchmark))].sort();
  const byBenchmark = Object.fromEntries(
    benchmarkIds.map((benchmark) => {
      const benchmarkTraces = traces.filter((trace) => trace.benchmark === benchmark);
      return [
        benchmark,
        PUBLIC_DYNAMIC_CONFIGS.map(({ id }) => {
          const rows = rowsForConfig(benchmarkTraces, id);
          return rows.length ? summarizeRows(rows, id) : { config: id, completedItems: 0 };
        }),
      ];
    }),
  ) as Record<SingleTurnBenchmarkId, ReturnType<typeof summarizeRows>[]>;

  const pooled = PUBLIC_DYNAMIC_CONFIGS.map(({ id }) => {
    const rows = rowsForConfig(traces, id);
    return rows.length ? summarizeRows(rows, id) : { config: id, completedItems: 0 };
  });

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    dynamicConfigs: PUBLIC_DYNAMIC_CONFIGS.map((config) => ({ ...config })),
    tokenizer: traces[0]?.standard.metrics.tokenizer,
    aggregation: "paired-by-question; pooled results weight every question equally",
    bootstrap: "10,000 paired resamples; percentile 95% confidence interval; seed 20260920",
    byBenchmark,
    pooled,
  };
}

export type BudgetSweepSummary = ReturnType<typeof summarizeBudgetSweeps>;
