import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RetrievalPair } from "../evals/types";

export async function loadPilotPairs() {
  const directory = resolve("evals/runs/simpleqa-retrieval-pilot/items");
  const files = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (name) => JSON.parse(await readFile(resolve(directory, name), "utf8")) as RetrievalPair),
  );
}
