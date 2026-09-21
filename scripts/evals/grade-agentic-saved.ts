import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gradeAgenticPair } from "../../lib/evals/agentic-grading";
import { AGENTIC_BENCHMARK_IDS } from "../../lib/evals/types";
import type { AgenticBenchmarkId, AgenticPairTrace } from "../../lib/evals/types";

const defaults = [
  "evals/runs/agentic-pilot/browsecomp/browsecomp-00506.json",
  "evals/runs/agentic-pilot/finsearchcomp/(T2)Simple_Historical_Lookup_064.json",
  "evals/runs/agentic-pilot/livebrowsecomp/228.json",
];
const paths = process.argv.slice(2).length ? process.argv.slice(2) : defaults;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

for (const inputPath of paths) {
  const path = resolve(inputPath);
  const trace = JSON.parse(await readFile(path, "utf8")) as AgenticPairTrace;
  if (!AGENTIC_BENCHMARK_IDS.includes(trace.benchmark as AgenticBenchmarkId)) {
    throw new Error(`Unknown agentic benchmark: ${trace.benchmark}`);
  }
  const grading = await gradeAgenticPair(
    apiKey,
    trace.benchmark as AgenticBenchmarkId,
    trace.item,
    trace.standard.finalAnswer,
    trace.dynamic.finalAnswer,
  );
  Object.assign(trace, grading);
  await writeFile(path, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
  const standard = "dsqaF1Grades" in grading
    ? grading.dsqaF1Grades.standard.f1
    : grading.benchmarkGrades.standard.score;
  const dynamic = "dsqaF1Grades" in grading
    ? grading.dsqaF1Grades.dynamic.f1
    : grading.benchmarkGrades.dynamic.score;
  console.log(JSON.stringify({ benchmark: trace.benchmark, output: path, standard, dynamic }));
}
