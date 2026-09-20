const ARTICLES = new Set(["a", "an", "the"]);

export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .filter((token) => token && !ARTICLES.has(token))
    .join(" ");
}

export function exactMatch(prediction: string, reference: string) {
  return Number(normalizeAnswer(prediction) === normalizeAnswer(reference));
}

export function tokenF1(prediction: string, reference: string) {
  const predicted = normalizeAnswer(prediction).split(" ").filter(Boolean);
  const expected = normalizeAnswer(reference).split(" ").filter(Boolean);
  if (predicted.length === 0 || expected.length === 0) {
    return predicted.length === expected.length ? 1 : 0;
  }

  const remaining = new Map<string, number>();
  for (const token of expected) remaining.set(token, (remaining.get(token) ?? 0) + 1);
  let overlap = 0;
  for (const token of predicted) {
    const count = remaining.get(token) ?? 0;
    if (count > 0) {
      overlap += 1;
      remaining.set(token, count - 1);
    }
  }
  if (overlap === 0) return 0;
  const precision = overlap / predicted.length;
  const recall = overlap / expected.length;
  return (2 * precision * recall) / (precision + recall);
}
