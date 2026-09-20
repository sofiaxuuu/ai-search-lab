import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  MicroscopeItem,
  MicroscopeManifest,
} from "../visualization/microscope-types";

export async function loadMicroscopeData() {
  const root = resolve("public/results/microscope");
  const manifest = JSON.parse(
    await readFile(resolve(root, "manifest.json"), "utf8"),
  ) as MicroscopeManifest;
  const initialItems = JSON.parse(
    await readFile(resolve(root, `${manifest.defaultBenchmark}.json`), "utf8"),
  ) as MicroscopeItem[];
  return { manifest, initialItems };
}
