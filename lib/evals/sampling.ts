import { createHash } from "node:crypto";

export function deterministicSample<T>(
  items: T[],
  count: number,
  seed: number,
  identity: (item: T) => string,
) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Sample count must be a positive integer");
  }
  if (count > items.length) {
    throw new Error(`Cannot sample ${count} items from ${items.length}`);
  }

  return [...items]
    .sort((left, right) => {
      const leftHash = createHash("sha256").update(`${seed}:${identity(left)}`).digest("hex");
      const rightHash = createHash("sha256").update(`${seed}:${identity(right)}`).digest("hex");
      return leftHash.localeCompare(rightHash);
    })
    .slice(0, count);
}
