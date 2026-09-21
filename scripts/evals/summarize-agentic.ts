import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderAgenticScoreTokenPlot } from "../../lib/evals/agentic-score-token-plot";
import { summarizeAgenticTraces } from "../../lib/evals/agentic-aggregate";
import { AGENTIC_BENCHMARK_IDS } from "../../lib/evals/types";
import type { AgenticBenchmarkId, AgenticPairTrace } from "../../lib/evals/types";

const root = resolve("evals/runs/agentic-pilot");
const publicRoot = resolve("public/results");
const traces: AgenticPairTrace[] = [];
for (const benchmark of await readdir(root, { withFileTypes: true }).catch(() => [])) {
  if (!benchmark.isDirectory()) continue;
  for (const file of await readdir(resolve(root, benchmark.name)).catch(() => [])) {
    if (!file.endsWith(".json") || file === "summary.json") continue;
    const trace = JSON.parse(await readFile(resolve(root, benchmark.name, file), "utf8")) as AgenticPairTrace;
    if (
      AGENTIC_BENCHMARK_IDS.includes(trace.benchmark as AgenticBenchmarkId) &&
      trace.standard &&
      trace.dynamic
    ) traces.push(trace);
  }
}
if (!traces.length) throw new Error("No completed agentic traces found");
const summary = summarizeAgenticTraces(traces);
const plot = renderAgenticScoreTokenPlot(summary);
await mkdir(publicRoot, { recursive: true });
await writeFile(resolve(root, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(resolve(root, "score-vs-token.svg"), plot, "utf8");
await writeFile(resolve(publicRoot, "agentic-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(resolve(publicRoot, "agentic-score-vs-token.svg"), plot, "utf8");
console.log(`Summarized ${traces.length} paired traces across ${Object.keys(summary.byBenchmark).length} benchmarks.`);
console.log(`Updated ${resolve(publicRoot, "agentic-score-vs-token.svg")}`);
