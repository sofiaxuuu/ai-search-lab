import { pairedBootstrapCI } from "./bootstrap";
import type { AgenticBenchmarkId, AgenticPairTrace } from "./types";

type AgenticRow = {
  itemId: string;
  standardScore: number;
  dynamicScore: number;
  scoreDelta: number;
  standardModelTokens: number;
  dynamicModelTokens: number;
  standardObservedTokens: number;
  dynamicObservedTokens: number;
  standardRetrievalTokens: number;
  dynamicRetrievalTokens: number;
  standardSearches: number;
  dynamicSearches: number;
};

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(values: number[], proportion: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function distribution(values: number[]) {
  return { mean: mean(values), median: quantile(values, 0.5), q1: quantile(values, 0.25), q3: quantile(values, 0.75) };
}

function scores(trace: AgenticPairTrace) {
  if (trace.dsqaF1Grades) {
    return { standard: trace.dsqaF1Grades.standard.f1, dynamic: trace.dsqaF1Grades.dynamic.f1 };
  }
  if (trace.benchmarkGrades) {
    return { standard: trace.benchmarkGrades.standard.score, dynamic: trace.benchmarkGrades.dynamic.score };
  }
  if (trace.grades) {
    return { standard: trace.grades.standard.score, dynamic: trace.grades.dynamic.score };
  }
  return undefined;
}

function toRow(trace: AgenticPairTrace): AgenticRow | undefined {
  const score = scores(trace);
  if (!score) return undefined;
  return {
    itemId: trace.item.id,
    standardScore: score.standard,
    dynamicScore: score.dynamic,
    scoreDelta: score.dynamic - score.standard,
    standardModelTokens: trace.standard.usage.modelTotalTokens,
    dynamicModelTokens: trace.dynamic.usage.modelTotalTokens,
    standardObservedTokens: trace.standard.usage.totalObservedTokens,
    dynamicObservedTokens: trace.dynamic.usage.totalObservedTokens,
    standardRetrievalTokens: trace.standard.usage.retrievalTokens,
    dynamicRetrievalTokens: trace.dynamic.usage.retrievalTokens,
    standardSearches: trace.standard.searches.length,
    dynamicSearches: trace.dynamic.searches.length,
  };
}

function summarizeRows(rows: AgenticRow[]) {
  const scoreDelta = (sample: AgenticRow[]) => mean(sample.map((row) => row.scoreDelta));
  const modelTokenReduction = (sample: AgenticRow[]) =>
    1 - mean(sample.map((row) => row.dynamicModelTokens)) /
      mean(sample.map((row) => row.standardModelTokens));
  const observedTokenReduction = (sample: AgenticRow[]) =>
    1 - mean(sample.map((row) => row.dynamicObservedTokens)) /
      mean(sample.map((row) => row.standardObservedTokens));
  const searchDelta = (sample: AgenticRow[]) =>
    mean(sample.map((row) => row.dynamicSearches - row.standardSearches));
  return {
    completedItems: rows.length,
    standardScore: mean(rows.map((row) => row.standardScore)),
    dynamicScore: mean(rows.map((row) => row.dynamicScore)),
    scoreDelta: scoreDelta(rows),
    scoreDeltaCI95: pairedBootstrapCI(rows, scoreDelta),
    standardModelTokens: distribution(rows.map((row) => row.standardModelTokens)),
    dynamicModelTokens: distribution(rows.map((row) => row.dynamicModelTokens)),
    modelTokenReduction: modelTokenReduction(rows),
    modelTokenReductionCI95: pairedBootstrapCI(rows, modelTokenReduction),
    standardObservedTokens: distribution(rows.map((row) => row.standardObservedTokens)),
    dynamicObservedTokens: distribution(rows.map((row) => row.dynamicObservedTokens)),
    observedTokenReduction: observedTokenReduction(rows),
    observedTokenReductionCI95: pairedBootstrapCI(rows, observedTokenReduction),
    standardRetrievalTokens: distribution(rows.map((row) => row.standardRetrievalTokens)),
    dynamicRetrievalTokens: distribution(rows.map((row) => row.dynamicRetrievalTokens)),
    standardSearches: distribution(rows.map((row) => row.standardSearches)),
    dynamicSearches: distribution(rows.map((row) => row.dynamicSearches)),
    meanSearchDelta: searchDelta(rows),
    searchDeltaCI95: pairedBootstrapCI(rows, searchDelta),
    rows,
  };
}

export function summarizeAgenticTraces(traces: AgenticPairTrace[]) {
  const benchmarkIds = [...new Set(traces.map((trace) => trace.benchmark))].sort() as AgenticBenchmarkId[];
  const byBenchmark = Object.fromEntries(benchmarkIds.map((benchmark) => {
    const rows = traces
      .filter((trace) => trace.benchmark === benchmark)
      .map(toRow)
      .filter((row): row is AgenticRow => Boolean(row));
    return [benchmark, summarizeRows(rows)];
  })) as Record<AgenticBenchmarkId, ReturnType<typeof summarizeRows>>;
  const benchmarkSummaries = Object.values(byBenchmark);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    completedPairs: traces.length,
    aggregation: "paired by question; macro average weights each benchmark equally",
    bootstrap: "10,000 paired resamples per benchmark; percentile 95% CI; seed 20260920",
    byBenchmark,
    macro: {
      standardScore: mean(benchmarkSummaries.map((summary) => summary.standardScore)),
      dynamicScore: mean(benchmarkSummaries.map((summary) => summary.dynamicScore)),
      scoreDelta: mean(benchmarkSummaries.map((summary) => summary.scoreDelta)),
      modelTokenReduction: mean(benchmarkSummaries.map((summary) => summary.modelTokenReduction)),
      observedTokenReduction: mean(benchmarkSummaries.map((summary) => summary.observedTokenReduction)),
      meanSearchDelta: mean(benchmarkSummaries.map((summary) => summary.meanSearchDelta)),
    },
  };
}

export type AgenticSummary = ReturnType<typeof summarizeAgenticTraces>;
