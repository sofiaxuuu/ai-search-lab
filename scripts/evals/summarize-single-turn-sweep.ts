import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderScoreTokenPlot } from "../../lib/evals/score-token-plot";
import { summarizeBudgetSweeps } from "../../lib/evals/sweep-aggregate";
import type { BudgetSweepTrace } from "../../lib/evals/types";

const root = resolve("evals/runs/single-turn-suite");
const publicResultsRoot = resolve("public/results");
const traces: BudgetSweepTrace[] = [];
for (const benchmark of await readdir(root, { withFileTypes: true }).catch(() => [])) {
  if (!benchmark.isDirectory()) continue;
  const itemsDir = resolve(root, benchmark.name, "items");
  for (const file of await readdir(itemsDir).catch(() => [])) {
    if (!file.endsWith(".json")) continue;
    traces.push(JSON.parse(await readFile(resolve(itemsDir, file), "utf8")) as BudgetSweepTrace);
  }
}
if (!traces.length) throw new Error("No sweep traces found under evals/runs/single-turn-suite");
const summary = summarizeBudgetSweeps(traces);
await mkdir(root, { recursive: true });
await mkdir(publicResultsRoot, { recursive: true });
await writeFile(resolve(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
const plot = renderScoreTokenPlot(summary);
await writeFile(resolve(root, "score-vs-token.svg"), plot, "utf8");
await writeFile(resolve(publicResultsRoot, "score-vs-token.svg"), plot, "utf8");
console.log(`Summarized ${traces.length} traces across ${Object.keys(summary.byBenchmark).length} benchmarks.`);
console.log(`Saved ${resolve(root, "summary.json")}`);
console.log(`Saved ${resolve(root, "score-vs-token.svg")}`);
console.log(`Updated app asset ${resolve(publicResultsRoot, "score-vs-token.svg")}`);
await import("./export-microscope-data");
