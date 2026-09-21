import { discoverUrls, retrieveHighlights } from "./exa-client";
import { formatContext } from "./format-context";
import type { AgentSearchTrace, AgentTrace, HighlightMode } from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

/** Kept fixed across both arms. Change only with a new prompt-version label. */
export const AGENT_MODEL = "gpt-4o-mini-2024-07-18";
export const AGENT_PROMPT_VERSION = "paired-search-agent-v1";
export const AGENT_MAX_SEARCHES = 4;

const INSTRUCTIONS = `You are a web research agent. Answer the user's question accurately and concisely.
Use search_web when you need web evidence. You may search up to four times. After tool results,
either search again with a more specific query or give the final answer. Do not claim a fact unless
the tool results support it. Do not describe your hidden reasoning or the tool process.`;

type ResponseOutput = {
  type?: unknown;
  name?: unknown;
  call_id?: unknown;
  arguments?: unknown;
  content?: unknown;
};

type ResponsePayload = Record<string, unknown> & { output?: ResponseOutput[] };

export type DiscoveryCache = Map<string, { urls: string[]; latencyMs: number }>;

function outputText(payload: ResponsePayload) {
  return (payload.output ?? [])
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((part): part is { type: string; text: string } => {
      const value = part as { type?: unknown; text?: unknown };
      return value.type === "output_text" && typeof value.text === "string";
    })
    .map((part) => part.text)
    .join("")
    .trim();
}

function functionCalls(payload: ResponsePayload) {
  return (payload.output ?? []).filter((item) =>
    item.type === "function_call" && item.name === "search_web" &&
    typeof item.call_id === "string" && typeof item.arguments === "string",
  ) as Array<{ type: "function_call"; name: "search_web"; call_id: string; arguments: string }>;
}

function parseQuery(argumentsText: string) {
  try {
    const value = JSON.parse(argumentsText) as
      | string
      | { query?: unknown; queries?: unknown; search_query?: unknown; q?: unknown };
    const candidate = typeof value === "string"
      ? value
      : [value.query, value.search_query, value.q, ...(Array.isArray(value.queries) ? value.queries : [])]
          .find((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
    if (!candidate?.trim()) throw new Error("missing query");
    return candidate.trim().slice(0, 500);
  } catch {
    throw new Error("Agent called search_web with invalid arguments");
  }
}

async function callModel(apiKey: string, input: unknown[]) {
  const startedAt = performance.now();
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AGENT_MODEL,
      instructions: INSTRUCTIONS,
      input,
      tools: [{
        type: "function",
        name: "search_web",
        description: "Search the web and return relevant excerpts. Use focused search queries.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "Focused web search query" } },
          required: ["query"],
          additionalProperties: false,
        },
        strict: true,
      }],
      tool_choice: "auto",
      temperature: 0,
      max_output_tokens: 500,
      store: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json().catch(() => ({}))) as ResponsePayload;
  if (!response.ok) {
    const error = payload.error as { message?: unknown } | undefined;
    throw new Error(`OpenAI Responses API failed: ${typeof error?.message === "string" ? error.message : `HTTP ${response.status}`}`);
  }
  const usage = (payload.usage ?? {}) as Record<string, unknown>;
  return {
    payload,
    latencyMs,
    usage: {
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      totalTokens: Number(usage.total_tokens ?? 0),
    },
  };
}

export async function runPairedSearchAgent(options: {
  openaiApiKey: string;
  exaApiKey: string;
  question: string;
  mode: HighlightMode;
  discoveryCache: DiscoveryCache;
  maxSearches?: number;
}): Promise<AgentTrace> {
  const startedAt = performance.now();
  const maxSearches = options.maxSearches ?? AGENT_MAX_SEARCHES;
  const searches: AgentSearchTrace[] = [];
  const input: unknown[] = [{ role: "user", content: [{ type: "input_text", text: options.question }] }];
  let modelInputTokens = 0;
  let modelOutputTokens = 0;
  let modelTotalTokens = 0;

  for (let turn = 0; turn <= maxSearches; turn += 1) {
    const model = await callModel(options.openaiApiKey, input);
    modelInputTokens += model.usage.inputTokens;
    modelOutputTokens += model.usage.outputTokens;
    modelTotalTokens += model.usage.totalTokens;
    input.push(...(model.payload.output ?? []));
    const calls = functionCalls(model.payload);
    if (calls.length === 0) {
      const finalAnswer = outputText(model.payload);
      if (!finalAnswer) throw new Error("Agent produced neither a tool call nor a final answer");
      const retrievalTokens = searches.reduce(
        (sum, search) => sum + (search.retrieval?.metrics.retrievalTokens ?? 0),
        0,
      );
      return {
        mode: options.mode,
        model: AGENT_MODEL,
        promptVersion: AGENT_PROMPT_VERSION,
        maxSearches,
        finalAnswer,
        searches,
        usage: { modelInputTokens, modelOutputTokens, modelTotalTokens, retrievalTokens, totalObservedTokens: modelTotalTokens + retrievalTokens },
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }
    if (turn === maxSearches) throw new Error(`Agent exceeded its ${maxSearches}-search limit`);

    for (const call of calls) {
      let query = "[invalid search query]";
      try {
        query = parseQuery(call.arguments);
        let discovery = options.discoveryCache.get(query.toLocaleLowerCase("en-US"));
        if (!discovery) {
          const found = await discoverUrls(options.exaApiKey, query);
          discovery = { urls: found.urls, latencyMs: found.latencyMs };
          options.discoveryCache.set(query.toLocaleLowerCase("en-US"), discovery);
        }
        const retrieval = await retrieveHighlights(options.exaApiKey, query, discovery.urls, options.mode);
        searches.push({ query, urls: discovery.urls, discoveryLatencyMs: discovery.latencyMs, retrieval });
        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({ query, sources: formatContext(retrieval.response.excerpts) }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown search failure";
        const invalidArguments = message.includes("invalid arguments");
        searches.push({ query, urls: [], discoveryLatencyMs: 0, error: message });
        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify({
            query,
            error: invalidArguments
              ? "Invalid tool arguments. Call search_web again using exactly one non-empty string field: {\"query\":\"focused search query\"}."
              : "Search returned no usable results. Try a shorter or differently phrased query.",
          }),
        });
      }
    }
  }
  throw new Error("Unreachable agent state");
}
