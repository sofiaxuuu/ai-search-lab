import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API_URL = "https://api.exa.ai/contents";
const DYNAMIC_BETA = "dynamic-highlights-2026-08-28";
const query =
  "How do standard and Dynamic Highlights differ in context allocation and token efficiency?";
const urls = [
  "https://exa.ai/blog/dynamic-highlights",
  "https://exa.ai/docs/search/highlights",
];

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

function estimateTokens(characters) {
  return Math.ceil(characters / 4);
}

function normalizeResponse(payload) {
  const excerpts = (payload.results ?? []).flatMap((result, resultIndex) =>
    (result.highlights ?? []).map((text, highlightIndex) => ({
      id: `${resultIndex + 1}.${highlightIndex + 1}`,
      url: result.url ?? result.id,
      text,
    })),
  );
  const returnedCharacters = excerpts.reduce(
    (total, excerpt) => total + excerpt.text.length,
    0,
  );

  return {
    requestId: payload.requestId,
    excerpts,
    statuses: (payload.statuses ?? []).map((status) => ({
      url: status.id,
      status: status.status,
      ...(status.source ? { source: status.source } : {}),
    })),
    ...(typeof payload.costDollars?.total === "number"
      ? { costDollars: payload.costDollars.total }
      : {}),
    returnedCharacters,
    estimatedTokens: estimateTokens(returnedCharacters),
  };
}

async function retrieve(apiKey, mode) {
  const dynamic = mode === "dynamic";
  const request = {
    ids: urls,
    highlights: {
      query,
      ...(dynamic ? { dynamic: true } : {}),
    },
  };
  const startedAt = performance.now();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(dynamic ? { "Exa-Beta": DYNAMIC_BETA } : {}),
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : `HTTP ${response.status}`;
    throw new Error(`${mode} request failed: ${message}`);
  }

  return {
    mode,
    request: {
      ids: [...urls],
      highlights: { ...request.highlights },
      ...(dynamic ? { beta: DYNAMIC_BETA } : {}),
    },
    response: normalizeResponse(payload),
    metrics: {
      returnedCharacters: 0,
      estimatedTokens: 0,
      latencyMs,
      requiredFactStatus: {},
      duplicatePairs: [],
    },
  };
}

async function main() {
  const envPath = resolve(".env");
  const env = parseEnv(await readFile(envPath, "utf8"));
  const apiKey = process.env.EXA_API_KEY || env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is missing from the environment and .env");
  }

  // Keep request order explicit in the trace. Calls run sequentially so preview
  // errors are easy to attribute; their latency is observational, not a benchmark.
  const standard = await retrieve(apiKey, "standard");
  const dynamic = await retrieve(apiKey, "dynamic");
  for (const trace of [standard, dynamic]) {
    trace.metrics.returnedCharacters = trace.response.returnedCharacters;
    trace.metrics.estimatedTokens = trace.response.estimatedTokens;
    delete trace.response.returnedCharacters;
    delete trace.response.estimatedTokens;
  }
  const createdAt = new Date().toISOString();
  const run = {
    id: `fixed-url-feasibility-${createdAt.replaceAll(/[:.]/gu, "-")}`,
    createdAt,
    taskSnapshot: {
      id: "fixed-url-feasibility",
      title: "Fixed URL Dynamic Highlights feasibility",
      query,
      urls,
      facts: [],
    },
    sharedConfig: {
      query,
      urls,
      beta: DYNAMIC_BETA,
      endpoint: API_URL,
    },
    standard,
    dynamic,
  };

  await mkdir(resolve("traces/examples"), { recursive: true });
  const outputPath = resolve("traces/examples/fixed-url-feasibility.json");
  await writeFile(outputPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");

  console.log(`Saved scrubbed comparison to ${outputPath}`);
  console.log(
    `Standard: ${standard.response.excerpts.length} excerpts, ${standard.metrics.returnedCharacters} characters, ${standard.metrics.latencyMs} ms`,
  );
  console.log(
    `Dynamic: ${dynamic.response.excerpts.length} excerpts, ${dynamic.metrics.returnedCharacters} characters, ${dynamic.metrics.latencyMs} ms`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
