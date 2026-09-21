import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgenticSummary } from "../evals/agentic-aggregate";

export async function loadAgenticSummary() {
  return JSON.parse(
    await readFile(resolve("public/results/agentic-summary.json"), "utf8"),
  ) as AgenticSummary;
}
