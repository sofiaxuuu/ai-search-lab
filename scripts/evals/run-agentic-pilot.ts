import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runAndSaveAgenticPair } from "../../lib/evals/run-agentic-pair";
import type {
  AgenticBenchmarkId,
  AgenticDatasetSnapshot,
} from "../../lib/evals/types";
import { AGENTIC_BENCHMARK_IDS } from "../../lib/evals/types";

function argument(name: string) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const datasetPath = argument("dataset");
const itemId = argument("item");
const isLive = process.argv.includes("--live");
if (!datasetPath) throw new Error("Pass --dataset=evals/datasets/generated/<snapshot>.json");
const dataset = JSON.parse(await readFile(resolve(datasetPath), "utf8")) as AgenticDatasetSnapshot;
if (!AGENTIC_BENCHMARK_IDS.includes(dataset.benchmark)) {
  throw new Error(`Expected an agentic benchmark snapshot, received ${dataset.benchmark}`);
}
const item = itemId ? dataset.items.find((candidate) => candidate.id === itemId) : dataset.items[0];
if (!item) throw new Error(`No item found${itemId ? ` with id ${itemId}` : ""}`);

const output = resolve(argument("output") ?? `evals/runs/agentic-pilot/${dataset.benchmark}/${item.id}.json`);
if (!isLive) {
  console.log(JSON.stringify({
    dryRun: true,
    benchmark: dataset.benchmark,
    item: { id: item.id },
    plannedCalls: { maxModelResponsesPerArm: 5, maxSearchesPerArm: 4, exaSearchAndContentsPerSearch: 2 },
    maximumRequestsForPair: { openaiAgent: 10, exa: 16, openaiGrader: 2 },
    output,
    note: "Run again with --live after reviewing the request cap. One paired item only.",
  }, null, 2));
  process.exit(0);
}

const openaiApiKey = process.env.OPENAI_API_KEY;
const exaApiKey = process.env.EXA_API_KEY;
if (!openaiApiKey || !exaApiKey) throw new Error("OPENAI_API_KEY and EXA_API_KEY are required");
const trace = await runAndSaveAgenticPair({
  openaiApiKey,
  exaApiKey,
  benchmark: dataset.benchmark as AgenticBenchmarkId,
  item,
  output,
});
const { standard, dynamic } = trace;
console.log(JSON.stringify({
  output,
  item: item.id,
  standard: {
    searches: standard.searches.length,
    ...standard.usage,
    score: trace.dsqaF1Grades?.standard.f1 ?? trace.benchmarkGrades?.standard.score,
  },
  dynamic: {
    searches: dynamic.searches.length,
    ...dynamic.usage,
    score: trace.dsqaF1Grades?.dynamic.f1 ?? trace.benchmarkGrades?.dynamic.score,
  },
}, null, 2));
