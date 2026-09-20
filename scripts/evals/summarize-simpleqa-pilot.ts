import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizePairs } from "../../lib/evals/aggregate";
import type { DatasetSnapshot, RetrievalPair } from "../../lib/evals/types";

const root = resolve("evals/runs/simpleqa-retrieval-pilot");
const dataset = JSON.parse(
  await readFile(resolve("evals/datasets/simpleqa-pilot.json"), "utf8"),
) as DatasetSnapshot;
const files = (await readdir(resolve(root, "items"))).filter((name) => name.endsWith(".json"));
const pairs = await Promise.all(
  files.map(async (name) => JSON.parse(await readFile(resolve(root, "items", name), "utf8")) as RetrievalPair),
);
const summary = summarizePairs(pairs, dataset.items.length);
await writeFile(resolve(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ scores: summary.scores, context: summary.context }, null, 2));
