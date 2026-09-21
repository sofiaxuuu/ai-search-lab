import type { BenchmarkItem, DsqaF1GradeTrace, DsqaMatch } from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export const DSQA_F1_GRADER_MODEL = "gpt-4o-mini-2024-07-18";
export const DSQA_F1_PROMPT_VERSION = "dsqa-list-f1-openai-proxy-v1" as const;

type MatchPayload = {
  reference_items: string[];
  predicted_items: string[];
  matched_pairs: Array<{ reference_item: string; predicted_item: string }>;
};

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

function key(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function uniqueNonEmpty(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = key(value);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function computeDsqaF1(
  referenceItemsInput: string[],
  predictedItemsInput: string[],
  proposedMatches: DsqaMatch[],
) {
  const referenceItems = uniqueNonEmpty(referenceItemsInput);
  const predictedItems = uniqueNonEmpty(predictedItemsInput);
  const referenceByKey = new Map(referenceItems.map((item) => [key(item), item]));
  const predictedByKey = new Map(predictedItems.map((item) => [key(item), item]));
  const usedReferences = new Set<string>();
  const usedPredictions = new Set<string>();
  const matches: DsqaMatch[] = [];

  for (const proposed of proposedMatches) {
    const referenceKey = key(proposed.referenceItem);
    const predictedKey = key(proposed.predictedItem);
    if (!referenceByKey.has(referenceKey) || !predictedByKey.has(predictedKey)) continue;
    if (usedReferences.has(referenceKey) || usedPredictions.has(predictedKey)) continue;
    usedReferences.add(referenceKey);
    usedPredictions.add(predictedKey);
    matches.push({
      referenceItem: referenceByKey.get(referenceKey)!,
      predictedItem: predictedByKey.get(predictedKey)!,
    });
  }

  const truePositives = matches.length;
  const falsePositives = Math.max(0, predictedItems.length - truePositives);
  const falseNegatives = Math.max(0, referenceItems.length - truePositives);
  const precision = predictedItems.length ? truePositives / predictedItems.length : 0;
  const recall = referenceItems.length ? truePositives / referenceItems.length : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    referenceItems,
    predictedItems,
    matches,
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1,
  };
}

export async function gradeDsqaF1(
  apiKey: string,
  item: BenchmarkItem,
  predictedAnswer: string,
): Promise<DsqaF1GradeTrace> {
  const startedAt = performance.now();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DSQA_F1_GRADER_MODEL,
      instructions: `Evaluate a DeepSearchQA answer as a set of answer items.
Extract the atomic items from the gold answer and predicted answer. Ignore explanation, citations,
ordering, and harmless formatting differences. Match items one-to-one only when they express the
same entity, value, or fact. Do not match a merely related or partially correct item.`,
      input: `Question:\n${item.problem}\n\nGold answer:\n${item.answer}\n\nPredicted answer:\n${predictedAnswer}`,
      text: {
        format: {
          type: "json_schema",
          name: "dsqa_item_matches",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reference_items: { type: "array", items: { type: "string" } },
              predicted_items: { type: "array", items: { type: "string" } },
              matched_pairs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    reference_item: { type: "string" },
                    predicted_item: { type: "string" },
                  },
                  required: ["reference_item", "predicted_item"],
                  additionalProperties: false,
                },
              },
            },
            required: ["reference_items", "predicted_items", "matched_pairs"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0,
      max_output_tokens: 2000,
      store: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error as { message?: unknown } | undefined;
    throw new Error(`OpenAI DSQA F1 grader failed: ${typeof error?.message === "string" ? error.message : `HTTP ${response.status}`}`);
  }
  const rawOutput = extractOutputText(payload);
  if (!rawOutput) throw new Error("OpenAI DSQA F1 grader returned no output text");
  const parsed = JSON.parse(rawOutput) as MatchPayload;
  const metrics = computeDsqaF1(
    parsed.reference_items,
    parsed.predicted_items,
    parsed.matched_pairs.map((match) => ({
      referenceItem: match.reference_item,
      predictedItem: match.predicted_item,
    })),
  );
  const usage = (payload.usage ?? {}) as Record<string, unknown>;
  return {
    provider: "openai",
    model: typeof payload.model === "string" ? payload.model : DSQA_F1_GRADER_MODEL,
    responseId: String(payload.id ?? ""),
    promptVersion: DSQA_F1_PROMPT_VERSION,
    evaluator: "local-openai-proxy",
    ...metrics,
    usage: {
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      totalTokens: Number(usage.total_tokens ?? 0),
    },
    latencyMs,
  };
}
