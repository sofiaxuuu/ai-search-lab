import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { deterministicSample } from "../../lib/evals/sampling";
import type { BenchmarkItem, DatasetSnapshot } from "../../lib/evals/types";

const SOURCE = "https://openaipublic.blob.core.windows.net/simple-evals/simple_qa_test_set.csv";
const SAMPLE_SIZE = 10;
const SEED = 42;

const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`SimpleQA download failed: HTTP ${response.status}`);
const csv = await response.text();
const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
const items: BenchmarkItem[] = rows.map((row, index) => {
  if (!row.problem || !row.answer) throw new Error(`Invalid SimpleQA row ${index + 2}`);
  return {
    id: `simpleqa-${String(index + 1).padStart(4, "0")}`,
    problem: row.problem,
    answer: row.answer,
    metadata: Object.fromEntries(
      Object.entries(row).filter(([key, value]) => key !== "problem" && key !== "answer" && value),
    ),
  };
});
const sample = deterministicSample(items, SAMPLE_SIZE, SEED, (item) => item.id);
const snapshot: DatasetSnapshot = {
  benchmark: "simpleqa",
  source: SOURCE,
  importedAt: new Date().toISOString(),
  seed: SEED,
  totalSourceItems: items.length,
  items: sample,
};

await mkdir(resolve("evals/datasets"), { recursive: true });
const output = resolve("evals/datasets/simpleqa-pilot.json");
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Saved ${sample.length} of ${items.length} SimpleQA items to ${output}`);
