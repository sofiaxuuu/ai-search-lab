import type { RetrievalExcerpt } from "../evals/types";

const STOP_WORDS = new Set([
  "about", "after", "also", "been", "before", "being", "between", "could", "does",
  "from", "have", "into", "more", "most", "only", "other", "over", "same", "such",
  "than", "that", "their", "them", "then", "there", "these", "they", "this", "those",
  "through", "under", "very", "were", "what", "when", "where", "which", "while", "with",
  "would", "your",
]);

function meaningfulTokens(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => token.length > 3 && !STOP_WORDS.has(token)) ?? [];
}

export function splitSentences(value: string) {
  return value
    .replace(/\s+/gu, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}])/u)
    .filter(Boolean);
}

export function approximateSharedSentence(sentence: string, oppositeText: string) {
  const normalizedSentence = sentence.toLocaleLowerCase("en-US").replace(/\s+/gu, " ").trim();
  const normalizedOpposite = oppositeText.toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
  if (normalizedSentence.length >= 30 && normalizedOpposite.includes(normalizedSentence)) return true;

  const sentenceTokens = new Set(meaningfulTokens(sentence));
  if (sentenceTokens.size < 3) return false;
  const oppositeTokens = new Set(meaningfulTokens(oppositeText));
  const overlap = [...sentenceTokens].filter((token) => oppositeTokens.has(token)).length;
  return overlap / sentenceTokens.size >= 0.7;
}

export function charactersByUrl(excerpts: RetrievalExcerpt[]) {
  const result = new Map<string, number>();
  for (const excerpt of excerpts) {
    result.set(excerpt.url, (result.get(excerpt.url) ?? 0) + excerpt.text.length);
  }
  return result;
}
