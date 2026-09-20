import type { RetrievalExcerpt } from "./types";

export function formatContext(excerpts: RetrievalExcerpt[]) {
  return excerpts
    .map(
      (excerpt, index) =>
        `[SOURCE ${index + 1}]\nURL: ${excerpt.url}\nEXCERPT:\n${excerpt.text.trim()}`,
    )
    .join("\n\n");
}
