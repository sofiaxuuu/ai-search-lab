import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gradeDsqaF1 } from "../../lib/evals/openai-dsqa-f1-grader";
import type { AgenticPairTrace } from "../../lib/evals/types";

const input = resolve(process.argv[2] ?? "evals/runs/agentic-pilot/dsqa/dsqa-00744.json");
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");
const trace = JSON.parse(await readFile(input, "utf8")) as AgenticPairTrace;
if (trace.benchmark !== "dsqa") throw new Error(`Expected a DSQA trace, received ${trace.benchmark}`);
const [standard, dynamic] = await Promise.all([
  gradeDsqaF1(apiKey, trace.item, trace.standard.finalAnswer),
  gradeDsqaF1(apiKey, trace.item, trace.dynamic.finalAnswer),
]);
trace.dsqaF1Grades = { standard, dynamic };
await writeFile(input, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output: input,
  standard: { precision: standard.precision, recall: standard.recall, f1: standard.f1 },
  dynamic: { precision: dynamic.precision, recall: dynamic.recall, f1: dynamic.f1 },
}, null, 2));
