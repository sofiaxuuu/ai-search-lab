import type {
  AgenticAccuracyGradeTrace,
  BenchmarkItem,
  FinSearchCompGradeTrace,
} from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const AGENTIC_GRADER_MODEL = "gpt-4o-mini-2024-07-18";

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

function usage(payload: Record<string, unknown>) {
  const value = (payload.usage ?? {}) as Record<string, unknown>;
  return {
    inputTokens: Number(value.input_tokens ?? 0),
    outputTokens: Number(value.output_tokens ?? 0),
    totalTokens: Number(value.total_tokens ?? 0),
  };
}

async function postResponse(apiKey: string, body: Record<string, unknown>) {
  const startedAt = performance.now();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: AGENTIC_GRADER_MODEL, temperature: 0, store: false, ...body }),
    signal: AbortSignal.timeout(90_000),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as { message?: unknown } | undefined;
    throw new Error(`OpenAI agentic grader failed: ${typeof error?.message === "string" ? error.message : `HTTP ${response.status}`}`);
  }
  return { payload, latencyMs };
}

async function gradeExactAnswer(
  apiKey: string,
  item: BenchmarkItem,
  predictedAnswer: string,
  benchmark: "browsecomp" | "livebrowsecomp",
): Promise<AgenticAccuracyGradeTrace> {
  const promptVersion = benchmark === "browsecomp"
    ? "browsecomp-compatible-openai-v1" as const
    : "livebrowsecomp-exact-answer-openai-proxy-v1" as const;
  const { payload, latencyMs } = await postResponse(apiKey, {
    instructions: `Judge whether a response correctly answers a benchmark question using the supplied reference answer.
Extract the response's final answer. Mark it correct only when it is semantically equivalent to the reference answer.
Allow harmless wording differences and a small margin of error for numerical answers. Mark ambiguity,
contradiction, a materially incomplete answer, or no committed answer as incorrect. Do not solve the question yourself.`,
    input: `Question:\n${item.problem}\n\nReference answer:\n${item.answer}\n\nResponse:\n${predictedAnswer}`,
    text: {
      format: {
        type: "json_schema",
        name: `${benchmark}_grade`,
        strict: true,
        schema: {
          type: "object",
          properties: {
            extracted_answer: { type: "string" },
            reasoning: { type: "string" },
            correct: { type: "boolean" },
          },
          required: ["extracted_answer", "reasoning", "correct"],
          additionalProperties: false,
        },
      },
    },
    max_output_tokens: 300,
  });
  const parsed = JSON.parse(extractOutputText(payload)) as {
    extracted_answer: string;
    reasoning: string;
    correct: boolean;
  };
  return {
    provider: "openai",
    model: typeof payload.model === "string" ? payload.model : AGENTIC_GRADER_MODEL,
    responseId: String(payload.id ?? ""),
    promptVersion,
    evaluator: benchmark === "browsecomp" ? "benchmark-compatible-openai" : "local-openai-proxy",
    extractedAnswer: parsed.extracted_answer,
    reasoning: parsed.reasoning,
    correct: parsed.correct,
    score: parsed.correct ? 1 : 0,
    usage: usage(payload),
    latencyMs,
  };
}

export function gradeBrowseComp(apiKey: string, item: BenchmarkItem, predictedAnswer: string) {
  return gradeExactAnswer(apiKey, item, predictedAnswer, "browsecomp");
}

export function gradeLiveBrowseComp(apiKey: string, item: BenchmarkItem, predictedAnswer: string) {
  return gradeExactAnswer(apiKey, item, predictedAnswer, "livebrowsecomp");
}

export function parseFinSearchCompScore(output: string) {
  const fenced = output.match(/```json\s*(\{[\s\S]*?\})\s*```/u)?.[1];
  const candidate = fenced ?? output.match(/\{[\s\S]*\}/u)?.[0];
  if (!candidate) throw new Error("FinSearchComp judge returned no JSON object");
  const parsed = JSON.parse(candidate) as { answer_score?: unknown };
  const nested = parsed.answer_score;
  const score = Array.isArray(nested) && Array.isArray(nested[0]) ? Number(nested[0][0]) : Number(nested);
  if (!Number.isFinite(score)) throw new Error("FinSearchComp judge returned an invalid answer_score");
  return score;
}

function fillFinSearchTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, value),
    template,
  );
}

export async function gradeFinSearchComp(
  apiKey: string,
  item: BenchmarkItem,
  predictedAnswer: string,
): Promise<FinSearchCompGradeTrace> {
  const metadata = item.metadata ?? {};
  const systemPrompt = typeof metadata.judgeSystemPrompt === "string" ? metadata.judgeSystemPrompt : "";
  const template = typeof metadata.judgePromptTemplate === "string" ? metadata.judgePromptTemplate : "";
  if (!systemPrompt || !template) throw new Error("FinSearchComp item is missing its official judge prompts");
  const input = fillFinSearchTemplate(template, {
    prompt: item.problem,
    response_reference: item.answer,
    ground_truth: typeof metadata.groundTruth === "string" ? metadata.groundTruth : item.answer,
    response: predictedAnswer,
  });
  const { payload, latencyMs } = await postResponse(apiKey, {
    instructions: systemPrompt,
    input,
    max_output_tokens: 1000,
  });
  const rawOutput = extractOutputText(payload);
  return {
    provider: "openai",
    model: typeof payload.model === "string" ? payload.model : AGENTIC_GRADER_MODEL,
    responseId: String(payload.id ?? ""),
    promptVersion: "finsearchcomp-row-judge-openai-proxy-v1",
    evaluator: "benchmark-prompt-openai-proxy",
    rawOutput,
    score: parseFinSearchCompScore(rawOutput),
    usage: usage(payload),
    latencyMs,
  };
}
