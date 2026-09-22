import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgenticInspectorBenchmark } from "../visualization/agentic-inspector-types";

export async function loadAgenticInspector() {
  return JSON.parse(
    await readFile(resolve("public/results/agentic-inspector.json"), "utf8"),
  ) as AgenticInspectorBenchmark[];
}
