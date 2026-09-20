import { formatContext } from "./format-context";
import { exactMatch, tokenF1 } from "./scoring";
import type { AnswerTrace, BenchmarkItem, RetrievalExcerpt } from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const ANSWER_MODEL = "gpt-4o-mini-2024-07-18";
export const ANSWER_PROMPT_VERSION = "simpleqa-grounded-short-answer-v1";

const INSTRUCTIONS = `You answer factual questions using only the supplied source excerpts.
Return only the shortest answer that directly answers the question.
Do not explain your reasoning. If the excerpts do not support an answer, return exactly: Insufficient evidence`;

function extractOutputText(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item) => {
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .filter((part): part is { type: string; text: string } => {
      const candidate = part as { type?: unknown; text?: unknown };
      return candidate.type === "output_text" && typeof candidate.text === "string";
    })
    .map((part) => part.text)
    .join("")
    .trim();
}

export async function answerWithOpenAI(
  apiKey: string,
  item: BenchmarkItem,
  excerpts: RetrievalExcerpt[],
): Promise<AnswerTrace> {
  const input = `Question:\n${item.problem}\n\nSource excerpts:\n${formatContext(excerpts)}`;
  const startedAt = performance.now();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANSWER_MODEL,
      instructions: INSTRUCTIONS,
      input,
      temperature: 0,
      max_output_tokens: 100,
      store: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as { message?: unknown } | undefined;
    const message = typeof error?.message === "string" ? error.message : `HTTP ${response.status}`;
    throw new Error(`OpenAI Responses API failed: ${message}`);
  }
  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI response contained no output text");
  const usage = (payload.usage ?? {}) as Record<string, unknown>;

  return {
    provider: "openai",
    model: typeof payload.model === "string" ? payload.model : ANSWER_MODEL,
    responseId: String(payload.id ?? ""),
    promptVersion: ANSWER_PROMPT_VERSION,
    text,
    usage: {
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      totalTokens: Number(usage.total_tokens ?? 0),
    },
    latencyMs,
    provisionalGrade: {
      exactMatch: exactMatch(text, item.answer),
      tokenF1: tokenF1(text, item.answer),
      note: "debug-only-not-official-simpleqa-grade",
    },
  };
}
