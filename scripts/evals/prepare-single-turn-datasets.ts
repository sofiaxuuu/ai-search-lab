import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  adaptFrames,
  adaptMultiLoKoRows,
  adaptSealQARows,
  adaptSimpleQA,
  adaptSweQAJsonl,
  BENCHMARK_ADAPTER_VERSION,
} from "../../lib/evals/benchmark-adapters";
import { deterministicSample } from "../../lib/evals/sampling";
import {
  DATASET_SAMPLE_SEED,
  SINGLE_TURN_SUITE,
} from "../../lib/evals/suite-config";
import type {
  BenchmarkItem,
  DatasetSnapshot,
  SingleTurnBenchmarkId,
} from "../../lib/evals/types";

const OUTPUT_DIR = resolve("evals/datasets/generated");
const FRAMES_REVISION = "58d9fb6330f3ab1316d1eca12e5e8ef23dcc22ef";
const SWEQA_REVISION = "f048f07";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

async function downloadText(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response.text();
}

async function loadMultiLoKo(root: string): Promise<BenchmarkItem[]> {
  const files: string[] = [];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      if (entry.isFile() && entry.name === "dev.jsonl") files.push(path);
    }
  }
  await visit(root);
  files.sort();
  if (!files.length) throw new Error(`No MultiLoKo dev.jsonl files found under ${root}`);

  const items: BenchmarkItem[] = [];
  for (const file of files) {
    const language = basename(dirname(file));
    const rows = (await readFile(file, "utf8"))
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    items.push(...adaptMultiLoKoRows(rows, language, items.length));
  }
  return items;
}

async function loadSealQA(config: "seal_0" | "seal_hard") {
  const rows: Array<{ row_idx?: unknown; row?: unknown }> = [];
  for (let offset = 0; ; offset += 100) {
    const url = new URL("https://datasets-server.huggingface.co/rows");
    url.searchParams.set("dataset", "vtllms/sealqa");
    url.searchParams.set("config", config);
    url.searchParams.set("split", "test");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("length", "100");
    const payload = JSON.parse(await downloadText(url.toString())) as {
      rows?: Array<{ row_idx?: unknown; row?: unknown }>;
      num_rows_total?: number;
    };
    rows.push(...(payload.rows ?? []));
    if (rows.length >= (payload.num_rows_total ?? rows.length)) break;
  }
  return adaptSealQARows(rows, config === "seal_0" ? "sealqa" : "sealqa-hard");
}

async function loadBenchmark(benchmark: SingleTurnBenchmarkId) {
  switch (benchmark) {
    case "simpleqa":
      return adaptSimpleQA(await downloadText(SINGLE_TURN_SUITE.simpleqa.source));
    case "frames":
      return adaptFrames(
        await downloadText(
          `https://huggingface.co/datasets/google/frames-benchmark/resolve/${FRAMES_REVISION}/test.tsv`,
        ),
      );
    case "sealqa":
      return loadSealQA("seal_0");
    case "sealqa-hard":
      return loadSealQA("seal_hard");
    case "sweqa-code-proxy":
      return adaptSweQAJsonl(
        await downloadText(
          `https://huggingface.co/datasets/swe-qa/SWE-QA-Benchmark/resolve/${SWEQA_REVISION}/default.jsonl`,
        ),
      );
    case "multiloko": {
      const root = argument("multiloko-root") ?? process.env.MULTILOKO_ROOT;
      if (!root) {
        throw new Error(
          "MultiLoKo requires --multiloko-root=/path/to/extracted/benchmark_data (or MULTILOKO_ROOT).",
        );
      }
      return loadMultiLoKo(resolve(root));
    }
  }
}

function sourceRevision(benchmark: SingleTurnBenchmarkId) {
  if (benchmark === "frames") return FRAMES_REVISION;
  if (benchmark === "sweqa-code-proxy") return SWEQA_REVISION;
  return undefined;
}

const requested = argument("benchmark");
const benchmarks = requested
  ? [requested as SingleTurnBenchmarkId]
  : (Object.keys(SINGLE_TURN_SUITE).filter((id) => id !== "multiloko") as SingleTurnBenchmarkId[]);

await mkdir(OUTPUT_DIR, { recursive: true });
for (const benchmark of benchmarks) {
  const config = SINGLE_TURN_SUITE[benchmark];
  if (!config) throw new Error(`Unknown benchmark: ${benchmark}`);
  const allItems = await loadBenchmark(benchmark);
  const requestedSize = Number(argument("sample-size") ?? config.sampleSize);
  const sampleSize = Math.min(requestedSize, allItems.length);
  const items = deterministicSample(allItems, sampleSize, DATASET_SAMPLE_SEED, (item) => item.id);
  const snapshot: DatasetSnapshot = {
    schemaVersion: 2,
    benchmark,
    benchmarkName: config.name,
    source: config.source,
    ...(sourceRevision(benchmark) ? { sourceRevision: sourceRevision(benchmark) } : {}),
    adapterVersion: BENCHMARK_ADAPTER_VERSION,
    importedAt: new Date().toISOString(),
    seed: DATASET_SAMPLE_SEED,
    totalSourceItems: allItems.length,
    items,
  };
  const output = resolve(OUTPUT_DIR, `${benchmark}-${sampleSize}.json`);
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`${config.name}: saved ${sampleSize}/${allItems.length} items to ${output}`);
}
