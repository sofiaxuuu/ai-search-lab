import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  adaptBrowseComp,
  adaptDeepSearchQA,
  adaptFinSearchComp,
  adaptLiveBrowseComp,
  AGENTIC_ADAPTER_VERSION,
} from "../../lib/evals/benchmark-adapters";
import { AGENTIC_SAMPLE_SEED, AGENTIC_SUITE } from "../../lib/evals/agentic-suite-config";
import { deterministicSample } from "../../lib/evals/sampling";
import type { AgenticBenchmarkId, AgenticDatasetSnapshot, BenchmarkItem } from "../../lib/evals/types";

const OUTPUT_DIR = resolve("evals/datasets/generated");

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function downloadText(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response.text();
}

function adapt(benchmark: AgenticBenchmarkId, text: string): BenchmarkItem[] {
  switch (benchmark) {
    case "dsqa": return adaptDeepSearchQA(text);
    case "browsecomp": return adaptBrowseComp(text);
    case "finsearchcomp": return adaptFinSearchComp(text);
    case "livebrowsecomp": return adaptLiveBrowseComp(text);
  }
}

const requested = argument("benchmark");
if (requested && !(requested in AGENTIC_SUITE)) throw new Error(`Unknown agentic benchmark: ${requested}`);
const benchmarks = requested
  ? [requested as AgenticBenchmarkId]
  : Object.keys(AGENTIC_SUITE) as AgenticBenchmarkId[];

await mkdir(OUTPUT_DIR, { recursive: true });
for (const benchmark of benchmarks) {
  const config = AGENTIC_SUITE[benchmark];
  const allItems = adapt(benchmark, await downloadText(config.download));
  const requestedSize = Number(argument("sample-size") ?? config.sampleSize);
  const sampleSize = Math.min(requestedSize, allItems.length);
  const items = deterministicSample(allItems, sampleSize, AGENTIC_SAMPLE_SEED, (item) => item.id);
  const snapshot: AgenticDatasetSnapshot = {
    schemaVersion: 1,
    benchmark,
    benchmarkName: config.name,
    source: config.source,
    adapterVersion: AGENTIC_ADAPTER_VERSION,
    importedAt: new Date().toISOString(),
    seed: AGENTIC_SAMPLE_SEED,
    totalSourceItems: allItems.length,
    items,
  };
  const output = resolve(OUTPUT_DIR, `${benchmark}-${sampleSize}.json`);
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`${config.name}: saved ${sampleSize}/${allItems.length} items to ${output}`);
}
