import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizePairs } from "../../lib/evals/aggregate";
import { discoverUrls, retrieveHighlights } from "../../lib/evals/exa-client";
import { answerWithOpenAI } from "../../lib/evals/openai-answer";
import { gradeSimpleQA } from "../../lib/evals/openai-simpleqa-grader";
import type { DatasetSnapshot, RetrievalPair } from "../../lib/evals/types";

const DATASET_PATH = resolve("evals/datasets/simpleqa-pilot.json");
const RUN_ROOT = resolve("evals/runs/simpleqa-retrieval-pilot");
const ITEMS_DIR = resolve(RUN_ROOT, "items");
const ERRORS_PATH = resolve(RUN_ROOT, "errors.json");
const SUMMARY_PATH = resolve(RUN_ROOT, "summary.json");

const exaKey = process.env.EXA_API_KEY;
const openAIKey = process.env.OPENAI_API_KEY;
if (!exaKey) throw new Error("EXA_API_KEY is required");
if (!openAIKey) throw new Error("OPENAI_API_KEY is required");

const dataset = JSON.parse(await readFile(DATASET_PATH, "utf8")) as DatasetSnapshot;
await mkdir(ITEMS_DIR, { recursive: true });
const errors: Array<{ itemId: string; stage: string; message: string }> = [];
const pairs: RetrievalPair[] = [];

async function savePair(path: string, pair: RetrievalPair) {
  await writeFile(path, `${JSON.stringify(pair, null, 2)}\n`, "utf8");
}

for (const [index, item] of dataset.items.entries()) {
  const path = resolve(ITEMS_DIR, `${item.id}.json`);
  let pair: RetrievalPair | undefined;
  try {
    pair = JSON.parse(await readFile(path, "utf8")) as RetrievalPair;
    console.log(`[${index + 1}/${dataset.items.length}] ${item.id}: resuming saved trace`);
  } catch {
    console.log(`[${index + 1}/${dataset.items.length}] ${item.id}: discovering URLs`);
  }

  try {
    if (!pair) {
      const discovery = await discoverUrls(exaKey, item.problem, 10);
      const standard = await retrieveHighlights(exaKey, item.problem, discovery.urls, "standard");
      const dynamic = await retrieveHighlights(exaKey, item.problem, discovery.urls, "dynamic");
      pair = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        benchmark: "simpleqa",
        item,
        discovery,
        standard,
        dynamic,
      };
      await savePair(path, pair);
    }

    if (!pair.standard.answer) {
      console.log(`  ${item.id}: answering Standard`);
      pair.standard.answer = await answerWithOpenAI(openAIKey, item, pair.standard.response.excerpts);
      await savePair(path, pair);
    }
    if (!pair.dynamic.answer) {
      console.log(`  ${item.id}: answering Dynamic`);
      pair.dynamic.answer = await answerWithOpenAI(openAIKey, item, pair.dynamic.response.excerpts);
      await savePair(path, pair);
    }
    if (!pair.standard.answer.simpleQAGrade) {
      console.log(`  ${item.id}: grading Standard`);
      pair.standard.answer.simpleQAGrade = await gradeSimpleQA(openAIKey, item, pair.standard.answer.text);
      await savePair(path, pair);
    }
    if (!pair.dynamic.answer.simpleQAGrade) {
      console.log(`  ${item.id}: grading Dynamic`);
      pair.dynamic.answer.simpleQAGrade = await gradeSimpleQA(openAIKey, item, pair.dynamic.answer.text);
      await savePair(path, pair);
    }
    pairs.push(pair);
    console.log(
      `  complete: ${pair.standard.answer.simpleQAGrade.label} / ${pair.dynamic.answer.simpleQAGrade.label}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ itemId: item.id, stage: "pipeline", message });
    console.error(`  failed: ${message}`);
  }
}

await writeFile(ERRORS_PATH, `${JSON.stringify(errors, null, 2)}\n`, "utf8");
const summary = summarizePairs(pairs, dataset.items.length);
await writeFile(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`\nCompleted ${summary.completedItems}/${summary.expectedItems}; errors: ${errors.length}`);
console.log(`Standard accuracy: ${(summary.scores.standardAccuracy * 100).toFixed(1)}%`);
console.log(`Dynamic accuracy: ${(summary.scores.dynamicAccuracy * 100).toFixed(1)}%`);
console.log(`Mean character delta (Dynamic - Standard): ${summary.context.meanCharacterDelta.toFixed(1)}`);
console.log(`Saved summary to ${SUMMARY_PATH}`);

if (errors.length) process.exitCode = 1;
