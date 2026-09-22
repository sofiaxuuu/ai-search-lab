import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgenticInspectorBenchmark } from "../../lib/visualization/agentic-inspector-types";

const publicRoot = resolve("public/results");

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }))).flat();
}

const files = await filesUnder(publicRoot);
const contents = await Promise.all(files.map(async (path) => ({ path, text: await readFile(path, "utf8") })));
const credentialPattern = /(?:\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}|\bexa_[A-Za-z0-9_-]{16,}|\bBearer\s+[A-Za-z0-9._-]{12,}|\bresp_[A-Za-z0-9_-]{12,})/u;
const credentialHit = contents.find(({ text }) => credentialPattern.test(text));
if (credentialHit) throw new Error(`Credential-like value found in ${credentialHit.path}`);

const envText = await readFile(resolve(".env"), "utf8").catch(() => "");
for (const line of envText.split(/\r?\n/u)) {
  const match = line.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)\s*$/u);
  const value = match?.[1]?.replace(/^['"]|['"]$/gu, "").trim();
  if (!value || value.length < 8) continue;
  const leaked = contents.find(({ text }) => text.includes(value));
  if (leaked) throw new Error(`A local environment value appears in ${leaked.path}`);
}

const inspector = JSON.parse(
  await readFile(resolve(publicRoot, "agentic-inspector.json"), "utf8"),
) as AgenticInspectorBenchmark[];
for (const benchmark of inspector.filter((candidate) => candidate.protectedContent)) {
  for (const item of benchmark.items) {
    if (!item.question.startsWith("Protected benchmark item ")) throw new Error(`${benchmark.id}: question was not redacted`);
    if (item.referenceAnswer !== "Protected by the benchmark release") throw new Error(`${benchmark.id}: reference answer was not redacted`);
    for (const arm of [item.standard, item.dynamic]) {
      if (arm.answer !== "Protected answer") throw new Error(`${benchmark.id}: generated answer was not redacted`);
      for (const search of arm.searches) {
        if (!search.query.startsWith("Protected search query ")) throw new Error(`${benchmark.id}: query was not redacted`);
        for (const excerpt of search.excerpts) {
          if (excerpt.url || excerpt.text || excerpt.source !== "Protected source") {
            throw new Error(`${benchmark.id}: source content was not redacted`);
          }
        }
      }
    }
  }
}

console.log(`Public release audit passed for ${files.length} result files.`);
