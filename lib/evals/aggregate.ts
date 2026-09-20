import type { RetrievalPair } from "./types";

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarizePairs(pairs: RetrievalPair[], expectedItems: number) {
  const complete = pairs.filter(
    (pair) => pair.standard.answer?.simpleQAGrade && pair.dynamic.answer?.simpleQAGrade,
  );
  const rows = complete.map((pair) => {
    const standardScore = pair.standard.answer?.simpleQAGrade?.score ?? 0;
    const dynamicScore = pair.dynamic.answer?.simpleQAGrade?.score ?? 0;
    const standardCharacters = pair.standard.metrics.returnedCharacters;
    const dynamicCharacters = pair.dynamic.metrics.returnedCharacters;
    const standardInputTokens = pair.standard.answer?.usage.inputTokens ?? 0;
    const dynamicInputTokens = pair.dynamic.answer?.usage.inputTokens ?? 0;
    return {
      itemId: pair.item.id,
      question: pair.item.problem,
      referenceAnswer: pair.item.answer,
      standardAnswer: pair.standard.answer?.text ?? "",
      dynamicAnswer: pair.dynamic.answer?.text ?? "",
      standardLabel: pair.standard.answer?.simpleQAGrade?.label,
      dynamicLabel: pair.dynamic.answer?.simpleQAGrade?.label,
      standardScore,
      dynamicScore,
      scoreDelta: dynamicScore - standardScore,
      standardCharacters,
      dynamicCharacters,
      characterDelta: dynamicCharacters - standardCharacters,
      standardInputTokens,
      dynamicInputTokens,
      answerInputTokenDelta: dynamicInputTokens - standardInputTokens,
    };
  });
  const standardScores = rows.map((row) => row.standardScore);
  const dynamicScores = rows.map((row) => row.dynamicScore);
  const characterDeltas = rows.map((row) => row.characterDelta);
  const answerInputTokenDeltas = rows.map((row) => row.answerInputTokenDelta);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    benchmark: "simpleqa",
    expectedItems,
    completedItems: complete.length,
    missingItems: expectedItems - complete.length,
    scores: {
      standardAccuracy: mean(standardScores),
      dynamicAccuracy: mean(dynamicScores),
      accuracyDelta: mean(dynamicScores) - mean(standardScores),
      standardOnlyCorrect: rows.filter((row) => row.standardScore === 1 && row.dynamicScore === 0).length,
      dynamicOnlyCorrect: rows.filter((row) => row.standardScore === 0 && row.dynamicScore === 1).length,
      bothCorrect: rows.filter((row) => row.standardScore === 1 && row.dynamicScore === 1).length,
      bothNotCorrect: rows.filter((row) => row.standardScore === 0 && row.dynamicScore === 0).length,
    },
    context: {
      standardMeanCharacters: mean(rows.map((row) => row.standardCharacters)),
      dynamicMeanCharacters: mean(rows.map((row) => row.dynamicCharacters)),
      meanCharacterDelta: mean(characterDeltas),
      medianCharacterDelta: median(characterDeltas),
      standardMeanAnswerInputTokens: mean(rows.map((row) => row.standardInputTokens)),
      dynamicMeanAnswerInputTokens: mean(rows.map((row) => row.dynamicInputTokens)),
      meanAnswerInputTokenDelta: mean(answerInputTokenDeltas),
      medianAnswerInputTokenDelta: median(answerInputTokenDeltas),
      dynamicUsedFewerCharacters: rows.filter((row) => row.characterDelta < 0).length,
      dynamicUsedMoreCharacters: rows.filter((row) => row.characterDelta > 0).length,
      equalCharacters: rows.filter((row) => row.characterDelta === 0).length,
    },
    rows,
  };
}
