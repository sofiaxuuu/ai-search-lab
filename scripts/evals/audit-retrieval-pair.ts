import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RetrievalPair } from "../../lib/evals/types";

const input = process.argv[2] ?? "evals/runs/simpleqa-retrieval-pilot/items/simpleqa-2371.json";
const pair = JSON.parse(await readFile(resolve(input), "utf8")) as RetrievalPair;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Audit failed: ${message}`);
}

assert(pair.schemaVersion === 1, "unknown schema version");
assert(pair.item.problem === pair.discovery.query, "discovery query differs from benchmark question");
assert(
  JSON.stringify(pair.discovery.urls) === JSON.stringify(pair.standard.request.ids),
  "Standard URL order differs from discovery",
);
assert(
  JSON.stringify(pair.discovery.urls) === JSON.stringify(pair.dynamic.request.ids),
  "Dynamic URL order differs from discovery",
);
assert(
  pair.standard.request.highlights.query === pair.dynamic.request.highlights.query,
  "highlight queries differ",
);
assert(!("dynamic" in pair.standard.request.highlights), "Standard request contains dynamic flag");
assert(pair.dynamic.request.highlights.dynamic === true, "Dynamic request is missing dynamic: true");
assert(Boolean(pair.dynamic.request.beta), "Dynamic request is missing beta metadata");
if (pair.standard.answer || pair.dynamic.answer) {
  assert(Boolean(pair.standard.answer), "Standard answer is missing");
  assert(Boolean(pair.dynamic.answer), "Dynamic answer is missing");
  const standardAnswer = pair.standard.answer;
  const dynamicAnswer = pair.dynamic.answer;
  assert(standardAnswer && dynamicAnswer, "paired answers are incomplete");
  assert(standardAnswer.model === dynamicAnswer.model, "answer models differ");
  assert(standardAnswer.promptVersion === dynamicAnswer.promptVersion, "answer prompts differ");
  if (standardAnswer.simpleQAGrade || dynamicAnswer.simpleQAGrade) {
    assert(Boolean(standardAnswer.simpleQAGrade), "Standard SimpleQA grade is missing");
    assert(Boolean(dynamicAnswer.simpleQAGrade), "Dynamic SimpleQA grade is missing");
    assert(
      standardAnswer.simpleQAGrade?.model === dynamicAnswer.simpleQAGrade?.model,
      "grader models differ",
    );
    assert(
      standardAnswer.simpleQAGrade?.promptVersion === dynamicAnswer.simpleQAGrade?.promptVersion,
      "grader prompts differ",
    );
  }
}

const summary = {
  itemId: pair.item.id,
  question: pair.item.problem,
  frozenUrlCount: pair.discovery.urls.length,
  controls: {
    sameQuestion: true,
    sameOrderedUrls: true,
    sameHighlightQuery: true,
    onlyDynamicArmHasFlag: true,
  },
  observed: {
    standardCharacters: pair.standard.metrics.returnedCharacters,
    dynamicCharacters: pair.dynamic.metrics.returnedCharacters,
    characterDelta: pair.dynamic.metrics.returnedCharacters - pair.standard.metrics.returnedCharacters,
    standardStatuses: pair.standard.response.statuses.map((status) => status.status),
    dynamicStatuses: pair.dynamic.response.statuses.map((status) => status.status),
    ...(pair.standard.answer && pair.dynamic.answer
      ? {
          referenceAnswer: pair.item.answer,
          standardAnswer: pair.standard.answer.text,
          dynamicAnswer: pair.dynamic.answer.text,
          standardModelTokens: pair.standard.answer.usage.totalTokens,
          dynamicModelTokens: pair.dynamic.answer.usage.totalTokens,
          sameAnswerModel: true,
          sameAnswerPrompt: true,
          ...(pair.standard.answer.simpleQAGrade && pair.dynamic.answer.simpleQAGrade
            ? {
                standardSimpleQALabel: pair.standard.answer.simpleQAGrade.label,
                dynamicSimpleQALabel: pair.dynamic.answer.simpleQAGrade.label,
                sameGraderModel: true,
                sameGraderPrompt: true,
              }
            : {}),
        }
      : {}),
  },
};

console.log(JSON.stringify(summary, null, 2));
