import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverUrls, retrieveHighlights } from "../../lib/evals/exa-client";
import { answerBenchmarkWithOpenAI } from "../../lib/evals/openai-answer";
import { gradeReferenceAnswer, gradeSimpleQA } from "../../lib/evals/openai-simpleqa-grader";
import { PUBLIC_DYNAMIC_CONFIGS } from "../../lib/evals/suite-config";
import type { BudgetSweepTrace, DatasetSnapshot, RetrievalArm } from "../../lib/evals/types";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const datasetPath = argument("dataset");
if (!datasetPath) throw new Error("Pass --dataset=evals/datasets/generated/<snapshot>.json");
const dataset = JSON.parse(await readFile(resolve(datasetPath), "utf8")) as DatasetSnapshot;
const limit = Math.min(Number(argument("limit") ?? dataset.items.length), dataset.items.length);
const items = dataset.items.slice(0, limit);
const runRoot = resolve(argument("output") ?? `evals/runs/single-turn-suite/${dataset.benchmark}`);

if (!process.argv.includes("--live")) {
  console.log(`DRY RUN: ${dataset.benchmark}, ${items.length} paired questions`);
  console.log(`Public Dynamic configs: ${PUBLIC_DYNAMIC_CONFIGS.map((config) => config.id).join(", ")}`);
  console.log(`Maximum calls: ${items.length} Search, ${items.length * 5} Contents, ${items.length * 5} answers, ${items.length * 5} grades`);
  console.log(`Output: ${runRoot}`);
  process.exit(0);
}

const exaKey = process.env.EXA_API_KEY;
const openAIKey = process.env.OPENAI_API_KEY;
if (!exaKey || !openAIKey) throw new Error("EXA_API_KEY and OPENAI_API_KEY are required");
const itemsDir = resolve(runRoot, "items");
await mkdir(itemsDir, { recursive: true });

async function save(path: string, trace: BudgetSweepTrace) {
  await writeFile(path, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
}

async function answerAndGrade(arm: RetrievalArm, item: DatasetSnapshot["items"][number]) {
  if (!arm.answer) {
    arm.answer = await answerBenchmarkWithOpenAI(openAIKey!, dataset.benchmark, item, arm.response.excerpts);
  }
  if (!arm.answer.grade && !arm.answer.simpleQAGrade) {
    const grade = dataset.benchmark === "simpleqa"
      ? await gradeSimpleQA(openAIKey!, item, arm.answer.text)
      : await gradeReferenceAnswer(openAIKey!, item, arm.answer.text);
    if (dataset.benchmark === "simpleqa") arm.answer.simpleQAGrade = grade;
    else arm.answer.grade = grade;
  }
}

for (const [index, item] of items.entries()) {
  const path = resolve(itemsDir, `${item.id}.json`);
  let trace: BudgetSweepTrace | undefined;
  try {
    trace = JSON.parse(await readFile(path, "utf8")) as BudgetSweepTrace;
    console.log(`[${index + 1}/${items.length}] ${item.id}: resume`);
  } catch {
    console.log(`[${index + 1}/${items.length}] ${item.id}: discover + retrieve`);
  }
  if (!trace) {
    const discovery = await discoverUrls(exaKey, item.problem, 10);
    const standard = await retrieveHighlights(exaKey, item.problem, discovery.urls, "standard");
    trace = {
      schemaVersion: 2,
      createdAt: new Date().toISOString(),
      benchmark: dataset.benchmark,
      item,
      discovery,
      standard,
      dynamicByConfig: {},
    };
    await save(path, trace);
  }
  trace.dynamicByConfig ??= {};
  for (const config of PUBLIC_DYNAMIC_CONFIGS) {
    if (!trace.dynamicByConfig[config.id]) {
      trace.dynamicByConfig[config.id] = await retrieveHighlights(
        exaKey,
        item.problem,
        trace.discovery.urls,
        "dynamic",
        "verbosity" in config ? { verbosity: config.verbosity } : {},
      );
      await save(path, trace);
    }
  }
  await answerAndGrade(trace.standard, item);
  await save(path, trace);
  for (const config of PUBLIC_DYNAMIC_CONFIGS) {
    await answerAndGrade(trace.dynamicByConfig[config.id], item);
    await save(path, trace);
  }
  console.log(`  complete: Standard + ${PUBLIC_DYNAMIC_CONFIGS.length} Dynamic arms`);
}
