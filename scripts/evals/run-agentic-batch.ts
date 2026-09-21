import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runAndSaveAgenticPair } from "../../lib/evals/run-agentic-pair";
import { AGENTIC_BENCHMARK_IDS } from "../../lib/evals/types";
import type { AgenticBenchmarkId, AgenticDatasetSnapshot } from "../../lib/evals/types";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function exists(path: string) {
  return stat(path).then(() => true).catch(() => false);
}

function filename(id: string) {
  return `${id.replaceAll("/", "_")}.json`;
}

const isLive = process.argv.includes("--live");
const retryFailures = process.argv.includes("--retry-failures");
const limit = Number(argument("limit") ?? 3);
if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error("--limit must be an integer from 1 to 10");
const requested = argument("benchmark");
if (requested && !AGENTIC_BENCHMARK_IDS.includes(requested as AgenticBenchmarkId)) {
  throw new Error(`Unknown benchmark: ${requested}`);
}
const benchmarks = requested ? [requested as AgenticBenchmarkId] : [...AGENTIC_BENCHMARK_IDS];
const plans: Array<{
  benchmark: AgenticBenchmarkId;
  dataset: AgenticDatasetSnapshot;
  item: AgenticDatasetSnapshot["items"][number];
  output: string;
  failure: string;
  state: "pending" | "complete" | "failed";
}> = [];

for (const benchmark of benchmarks) {
  const datasetPath = resolve(`evals/datasets/generated/${benchmark}-10.json`);
  const dataset = JSON.parse(await readFile(datasetPath, "utf8")) as AgenticDatasetSnapshot;
  for (const item of dataset.items.slice(0, limit)) {
    const output = resolve(`evals/runs/agentic-pilot/${benchmark}/${filename(item.id)}`);
    const failure = resolve(`evals/runs/agentic-pilot/${benchmark}/failures/${filename(item.id)}`);
    const state = await exists(output) ? "complete" : await exists(failure) ? "failed" : "pending";
    plans.push({ benchmark, dataset, item, output, failure, state });
  }
}

const pending = plans.filter((plan) => plan.state === "pending" || (retryFailures && plan.state === "failed"));
console.log(JSON.stringify({
  live: isLive,
  limitPerBenchmark: limit,
  selectedPairs: plans.length,
  completedPairs: plans.filter((plan) => plan.state === "complete").length,
  recordedFailures: plans.filter((plan) => plan.state === "failed").length,
  pendingPairs: pending.length,
  maximumAdditionalRequests: {
    openaiAgent: pending.length * 10,
    exa: pending.length * 16,
    openaiGrader: pending.length * 2,
  },
}, null, 2));
if (!isLive) process.exit(0);

const openaiApiKey = process.env.OPENAI_API_KEY;
const exaApiKey = process.env.EXA_API_KEY;
if (!openaiApiKey || !exaApiKey) throw new Error("OPENAI_API_KEY and EXA_API_KEY are required");
for (const [index, plan] of pending.entries()) {
  console.log(`[${index + 1}/${pending.length}] ${plan.benchmark} ${plan.item.id}`);
  try {
    const trace = await runAndSaveAgenticPair({
      openaiApiKey,
      exaApiKey,
      benchmark: plan.benchmark,
      item: plan.item,
      output: plan.output,
    });
    const standardScore = trace.dsqaF1Grades?.standard.f1 ?? trace.benchmarkGrades?.standard.score;
    const dynamicScore = trace.dsqaF1Grades?.dynamic.f1 ?? trace.benchmarkGrades?.dynamic.score;
    console.log(JSON.stringify({ standardScore, dynamicScore, output: plan.output }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await mkdir(resolve(plan.failure, ".."), { recursive: true });
    await writeFile(plan.failure, `${JSON.stringify({
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      benchmark: plan.benchmark,
      itemId: plan.item.id,
      error: message,
    }, null, 2)}\n`, "utf8");
    console.error(JSON.stringify({ failed: plan.item.id, error: message }));
  }
}
