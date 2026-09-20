import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { answerWithOpenAI } from "../../lib/evals/openai-answer";
import type { RetrievalPair } from "../../lib/evals/types";

const input = process.argv[2] ?? "evals/runs/simpleqa-retrieval-pilot/items/simpleqa-2371.json";
const path = resolve(input);
const pair = JSON.parse(await readFile(path, "utf8")) as RetrievalPair;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

pair.standard.answer = await answerWithOpenAI(apiKey, pair.item, pair.standard.response.excerpts);
pair.dynamic.answer = await answerWithOpenAI(apiKey, pair.item, pair.dynamic.response.excerpts);
await writeFile(path, `${JSON.stringify(pair, null, 2)}\n`, "utf8");

console.log(`Saved paired answers to ${path}`);
console.log(`Reference: ${pair.item.answer}`);
console.log(`Standard: ${pair.standard.answer.text} (${pair.standard.answer.usage.totalTokens} tokens)`);
console.log(`Dynamic: ${pair.dynamic.answer.text} (${pair.dynamic.answer.usage.totalTokens} tokens)`);
