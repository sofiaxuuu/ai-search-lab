import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gradeSimpleQA } from "../../lib/evals/openai-simpleqa-grader";
import type { RetrievalPair } from "../../lib/evals/types";

const input = process.argv[2] ?? "evals/runs/simpleqa-retrieval-pilot/items/simpleqa-2371.json";
const path = resolve(input);
const pair = JSON.parse(await readFile(path, "utf8")) as RetrievalPair;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");
if (!pair.standard.answer || !pair.dynamic.answer) {
  throw new Error("Both answers are required; run eval:answer:one first");
}

pair.standard.answer.simpleQAGrade = await gradeSimpleQA(
  apiKey,
  pair.item,
  pair.standard.answer.text,
);
pair.dynamic.answer.simpleQAGrade = await gradeSimpleQA(
  apiKey,
  pair.item,
  pair.dynamic.answer.text,
);
await writeFile(path, `${JSON.stringify(pair, null, 2)}\n`, "utf8");

console.log(`Saved SimpleQA grades to ${path}`);
console.log(`Standard: ${pair.standard.answer.simpleQAGrade.label}`);
console.log(`Dynamic: ${pair.dynamic.answer.simpleQAGrade.label}`);
