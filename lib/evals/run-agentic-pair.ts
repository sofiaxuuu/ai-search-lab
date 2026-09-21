import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { gradeAgenticPair } from "./agentic-grading";
import { runPairedSearchAgent, type DiscoveryCache } from "./agent-loop";
import type {
  AgenticBenchmarkId,
  AgenticPairTrace,
  BenchmarkItem,
} from "./types";

export async function runAndSaveAgenticPair(options: {
  openaiApiKey: string;
  exaApiKey: string;
  benchmark: AgenticBenchmarkId;
  item: BenchmarkItem;
  output: string;
  discoveryCache?: DiscoveryCache;
}) {
  const discoveryCache = options.discoveryCache ?? new Map();
  const standard = await runPairedSearchAgent({
    openaiApiKey: options.openaiApiKey,
    exaApiKey: options.exaApiKey,
    question: options.item.problem,
    mode: "standard",
    discoveryCache,
  });
  const dynamic = await runPairedSearchAgent({
    openaiApiKey: options.openaiApiKey,
    exaApiKey: options.exaApiKey,
    question: options.item.problem,
    mode: "dynamic",
    discoveryCache,
  });
  const grading = await gradeAgenticPair(
    options.openaiApiKey,
    options.benchmark,
    options.item,
    standard.finalAnswer,
    dynamic.finalAnswer,
  );
  const trace: AgenticPairTrace = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    benchmark: options.benchmark,
    item: options.item,
    standard,
    dynamic,
    ...grading,
  };
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
  return trace;
}
