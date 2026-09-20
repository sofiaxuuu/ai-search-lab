import type { DiscoveryTrace, HighlightMode, RetrievalArm } from "./types";

const API_BASE = "https://api.exa.ai";
const DYNAMIC_BETA = "dynamic-highlights-2026-08-28";

async function postExa(
  path: string,
  apiKey: string,
  body: Record<string, unknown>,
  beta?: string,
) {
  const startedAt = performance.now();
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(beta ? { "Exa-Beta": beta } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.message === "string" ? payload.message : `HTTP ${response.status}`;
    throw new Error(`Exa ${path} failed: ${message}`);
  }
  return { payload, latencyMs };
}

export async function discoverUrls(
  apiKey: string,
  question: string,
  numResults = 10,
): Promise<DiscoveryTrace> {
  const { payload, latencyMs } = await postExa("/search", apiKey, {
    query: question,
    type: "auto",
    numResults,
  });
  const results = Array.isArray(payload.results) ? payload.results : [];
  const urls = results
    .map((result) => (result as { url?: unknown }).url)
    .filter((url): url is string => typeof url === "string");
  if (urls.length === 0) throw new Error("Exa Search returned no URLs");
  return {
    query: question,
    urls,
    requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
    latencyMs,
  };
}

export async function retrieveHighlights(
  apiKey: string,
  question: string,
  urls: string[],
  mode: HighlightMode,
): Promise<RetrievalArm> {
  const dynamic = mode === "dynamic";
  const highlights = { query: question, ...(dynamic ? { dynamic: true as const } : {}) };
  const { payload, latencyMs } = await postExa(
    "/contents",
    apiKey,
    { ids: urls, highlights },
    dynamic ? DYNAMIC_BETA : undefined,
  );
  const results = Array.isArray(payload.results) ? payload.results : [];
  const excerpts = results.flatMap((rawResult, resultIndex) => {
    const result = rawResult as { url?: unknown; id?: unknown; highlights?: unknown };
    const url = typeof result.url === "string" ? result.url : String(result.id ?? "");
    const passages = Array.isArray(result.highlights) ? result.highlights : [];
    return passages
      .filter((text): text is string => typeof text === "string")
      .map((text, excerptIndex) => ({ id: `${resultIndex + 1}.${excerptIndex + 1}`, url, text }));
  });
  const returnedCharacters = excerpts.reduce((sum, excerpt) => sum + excerpt.text.length, 0);
  const rawStatuses = Array.isArray(payload.statuses) ? payload.statuses : [];
  const statuses = rawStatuses.map((rawStatus) => {
    const status = rawStatus as { id?: unknown; status?: unknown; source?: unknown };
    return {
      url: String(status.id ?? ""),
      status: String(status.status ?? "unknown"),
      ...(typeof status.source === "string" ? { source: status.source } : {}),
    };
  });
  const cost = payload.costDollars as { total?: unknown } | undefined;

  return {
    mode,
    request: {
      ids: [...urls],
      highlights,
      ...(dynamic ? { beta: DYNAMIC_BETA } : {}),
    },
    response: {
      requestId: typeof payload.requestId === "string" ? payload.requestId : undefined,
      excerpts,
      statuses,
      ...(typeof cost?.total === "number" ? { costDollars: cost.total } : {}),
    },
    metrics: {
      returnedCharacters,
      estimatedTokens: Math.ceil(returnedCharacters / 4),
      latencyMs,
    },
  };
}
