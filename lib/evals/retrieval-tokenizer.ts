import { getEncoding } from "js-tiktoken";
import { formatContext } from "./format-context";
import type { RetrievalExcerpt, TokenizerDescriptor } from "./types";

export const RETRIEVAL_TOKENIZER: TokenizerDescriptor = {
  library: "js-tiktoken",
  libraryVersion: "1.0.21",
  encoding: "o200k_base",
  countedText: "formatted-retrieval-context",
};

const encoding = getEncoding(RETRIEVAL_TOKENIZER.encoding);

export function countRetrievalTokens(excerpts: RetrievalExcerpt[]): number {
  return encoding.encode(formatContext(excerpts)).length;
}
