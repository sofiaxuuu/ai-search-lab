import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SINGLE_TURN_SUITE } from "../../lib/evals/suite-config";
import type { BudgetSweepTrace, RetrievalArm, SingleTurnBenchmarkId } from "../../lib/evals/types";
import type {
  MicroscopeArm,
  MicroscopeItem,
  MicroscopeManifest,
} from "../../lib/visualization/microscope-types";

const runRoot = resolve("evals/runs/single-turn-suite");
const outputRoot = resolve("public/results/microscope");

function scrubArm(arm: RetrievalArm): MicroscopeArm {
  const grade = arm.answer?.grade ?? arm.answer?.simpleQAGrade;
  if (!arm.answer || arm.metrics.retrievalTokens === undefined) {
    throw new Error(`Incomplete visualization arm: ${arm.mode}`);
  }
  return {
    mode: arm.mode,
    excerpts: arm.response.excerpts,
    returnedCharacters: arm.metrics.returnedCharacters,
    retrievalTokens: arm.metrics.retrievalTokens,
    answer: arm.answer.text,
    ...(grade ? { grade: { label: grade.label, score: grade.score } } : {}),
  };
}

await mkdir(outputRoot, { recursive: true });
const benchmarks: MicroscopeManifest["benchmarks"] = [];

for (const benchmark of Object.keys(SINGLE_TURN_SUITE) as SingleTurnBenchmarkId[]) {
  const itemsDirectory = resolve(runRoot, benchmark, "items");
  const files = (await readdir(itemsDirectory)).filter((name) => name.endsWith(".json")).sort();
  const items: MicroscopeItem[] = [];
  for (const file of files) {
    const trace = JSON.parse(await readFile(resolve(itemsDirectory, file), "utf8")) as BudgetSweepTrace;
    const dynamicByConfig = Object.fromEntries(
      Object.entries(trace.dynamicByConfig).map(([config, arm]) => [config, scrubArm(arm)]),
    );
    items.push({
      benchmark,
      item: {
        id: trace.item.id,
        problem: trace.item.problem,
        answer: trace.item.answer,
      },
      standard: scrubArm(trace.standard),
      dynamicByConfig,
    });
  }
  const path = `/results/microscope/${benchmark}.json`;
  await writeFile(resolve(outputRoot, `${benchmark}.json`), `${JSON.stringify(items)}\n`, "utf8");
  benchmarks.push({ id: benchmark, name: SINGLE_TURN_SUITE[benchmark].name, count: items.length, path });
}

const manifest: MicroscopeManifest = {
  schemaVersion: 1,
  totalQuestions: benchmarks.reduce((sum, benchmark) => sum + benchmark.count, 0),
  defaultBenchmark: "simpleqa",
  defaultDynamicConfig: "medium",
  benchmarks,
};
await writeFile(resolve(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Exported ${manifest.totalQuestions} scrubbed questions across ${benchmarks.length} benchmark files.`);
