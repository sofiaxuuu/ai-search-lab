import type {
  BenchmarkItem,
  SimpleQAGradeLabel,
  SimpleQAGradeTrace,
} from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const SIMPLEQA_GRADER_MODEL = "gpt-4o-mini-2024-07-18";
export const SIMPLEQA_GRADER_PROMPT_VERSION = "openai-simpleqa-three-way-v1" as const;

const LABELS: Record<string, SimpleQAGradeLabel> = {
  A: "CORRECT",
  B: "INCORRECT",
  C: "NOT_ATTEMPTED",
};

export function parseSimpleQAGrade(output: string): SimpleQAGradeLabel {
  const match = output.trim().match(/\b([ABC])\b/u);
  return match ? LABELS[match[1]] : "NOT_ATTEMPTED";
}

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

function buildGraderPrompt(item: BenchmarkItem, predictedAnswer: string) {
  return `Your job is to look at a question, a gold target, and a predicted answer, and then assign a grade of either CORRECT, INCORRECT, or NOT_ATTEMPTED.

The predicted answer is CORRECT if it fully contains the important information in the gold target and does not contain contradictory information. Relevant extra information is allowed.

The predicted answer is INCORRECT if it contradicts the gold target, gives a different answer, or contains a factual error relevant to the question.

The predicted answer is NOT_ATTEMPTED if it does not provide an answer, says the evidence is insufficient, or only gives general information without committing to an answer.

Question: ${item.problem}

Gold target: ${item.answer}

Predicted answer: ${predictedAnswer}

Return exactly one letter with no other text:
A = CORRECT
B = INCORRECT
C = NOT_ATTEMPTED`;
}

export async function gradeSimpleQA(
  apiKey: string,
  item: BenchmarkItem,
  predictedAnswer: string,
): Promise<SimpleQAGradeTrace> {
  const startedAt = performance.now();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SIMPLEQA_GRADER_MODEL,
      input: buildGraderPrompt(item, predictedAnswer),
      temperature: 0,
      max_output_tokens: 16,
      store: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as { message?: unknown } | undefined;
    const message = typeof error?.message === "string" ? error.message : `HTTP ${response.status}`;
    throw new Error(`OpenAI SimpleQA grader failed: ${message}`);
  }
  const rawOutput = extractOutputText(payload);
  const label = parseSimpleQAGrade(rawOutput);
  const usage = (payload.usage ?? {}) as Record<string, unknown>;

  return {
    provider: "openai",
    model: typeof payload.model === "string" ? payload.model : SIMPLEQA_GRADER_MODEL,
    responseId: String(payload.id ?? ""),
    promptVersion: SIMPLEQA_GRADER_PROMPT_VERSION,
    rawOutput,
    label,
    score: label === "CORRECT" ? 1 : 0,
    usage: {
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      totalTokens: Number(usage.total_tokens ?? 0),
    },
    latencyMs,
  };
}
