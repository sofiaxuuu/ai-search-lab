import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discoverUrls, retrieveHighlights } from "../../lib/evals/exa-client";
import type { DatasetSnapshot, RetrievalPair } from "../../lib/evals/types";

const isLive = process.argv.includes("--live");
const datasetPath = resolve("evals/datasets/simpleqa-pilot.json");
const dataset = JSON.parse(await readFile(datasetPath, "utf8")) as DatasetSnapshot;
const item = dataset.items[0];
if (!item) throw new Error("SimpleQA pilot dataset is empty; run eval:import-simpleqa first");

if (!isLive) {
  console.log("DRY RUN — no external requests will be made\n");
  console.log(`Question: ${item.problem}`);
  console.log("1. POST /search once to freeze 10 ordered URLs");
  console.log("2. POST /contents with Standard Highlights");
  console.log("3. POST /contents with the same URLs and Dynamic Highlights");
  console.log("4. Save both arms in one item-level JSON trace");
  process.exit(0);
}

const apiKey = process.env.EXA_API_KEY;
if (!apiKey) throw new Error("EXA_API_KEY is required for --live");
const discovery = await discoverUrls(apiKey, item.problem, 10);
const standard = await retrieveHighlights(apiKey, item.problem, discovery.urls, "standard");
const dynamic = await retrieveHighlights(apiKey, item.problem, discovery.urls, "dynamic");
const pair: RetrievalPair = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  benchmark: "simpleqa",
  item,
  discovery,
  standard,
  dynamic,
};
const runDirectory = resolve("evals/runs/simpleqa-retrieval-pilot/items");
await mkdir(runDirectory, { recursive: true });
const output = resolve(runDirectory, `${item.id}.json`);
await writeFile(output, `${JSON.stringify(pair, null, 2)}\n`, "utf8");
console.log(`Saved paired retrieval trace to ${output}`);
console.log(`Standard: ${standard.metrics.returnedCharacters} chars`);
console.log(`Dynamic: ${dynamic.metrics.returnedCharacters} chars`);
