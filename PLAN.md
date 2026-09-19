# Exa Dynamic Highlights Inspector — Build Plan

**Goal:** Build a cloneable Exa demo that makes Dynamic Highlights inspectable: a developer runs the same research task and fixed URL set through Standard Highlights and Dynamic Highlights, then sees exactly what evidence each mode returns and what trade-off it produces.

## Why this is the right v1

The larger **AI Search Lab** idea is intellectually strong but too broad for a first portfolio artifact. It combines a multi-provider comparison, evaluation harness, app, articles, and video.

This v1 is deliberately narrower:

> **Given the same query and URLs, does Dynamic Highlights preserve the required evidence while reducing the context passed to an agent versus standard per-document highlights?**

It demonstrates the specific DevRel capabilities Exa is screening for: a demo developers can clone, rigorous AI/retrieval understanding, clear explanation, and useful product feedback.

Exa describes Dynamic Highlights as a research-preview feature that selects relevant content across the URL set rather than treating each page independently.[1] The demo should test that product claim rather than repeat it.

## Product concept

### Name
**Dynamic Highlights Inspector**

### One-sentence pitch
A retrieval microscope for comparing the context an agent receives from Exa Standard Highlights and Dynamic Highlights.

### User flow

1. Choose one of three seeded multi-source research tasks.
2. Inspect its committed, scrubbed comparison run immediately—no API key required.
3. Optionally click **Run live comparison** when the server has an Exa API key configured.
4. The live app sends the identical query and URL set through two Exa configurations:
   - Standard Highlights
   - Dynamic Highlights
5. Inspect the returned evidence side by side.
6. Open a trace to see scrubbed request settings, URLs, excerpts, latency, character/token estimate, fact coverage, and duplicate-content signals.

Custom query + URL input and answer generation are post-v1 additions. The first release should make its full argument through inspectable evidence rather than a generated answer.

### Visual center

The main view is a side-by-side **context budget** panel:

- returned excerpts with source URL/domain and character count;
- a source-allocation bar showing how much returned context each URL received;
- an omitted-sources strip;
- predeclared required facts marked `present`, `missing`, or `ambiguous`;
- duplicate/redundant excerpt flags;
- latency and a clearly labeled token estimate.

The important question is: **What did the agent actually get to read?**

## Guardrails: what the demo does and does not test

### It tests
- **Evidence selection** across a fixed query and URL set.
- Whether required facts and qualifications survive the selection process.
- Context-size, redundancy, and latency trade-offs.

### It does not test in v1
- Search discovery or ranking quality.
- “Exa vs. Google” or a generic search API leaderboard.
- A universal answer-quality claim based only on fewer tokens.
- A time-sensitive live-web benchmark.

This distinction is essential: Dynamic Highlights is an evidence-selection primitive, not a ranking test.

## Seeded task set

Start with **three** hand-authored tasks. For each task, use 4–6 stable URLs and define 3–5 required atomic facts *before* observing either mode’s output.

| Task | What it reveals |
|---|---|
| Multi-source fact synthesis | Whether several necessary facts survive across several sources |
| Redundancy stress test | Whether repeated facts crowd out a unique required exception |
| Long-document nuance test | Whether short selection loses chronology, qualification, or table-adjacent detail |

Each fact must store:

```ts
type TaskFixture = {
  id: string;
  title: string;
  query: string;
  urls: string[];
  facts: Array<{
    id: string;
    claim: string;
    evidence: Array<{
      sourceUrl: string;
      supportingPassage: string;
    }>;
    matchTerms?: string[][];
  }>;
};
```

Deterministic matching may propose a fact status, but every published finding must be manually reviewed. The trace must show which excerpt and matching rule produced a `present` result. Cases that cannot be resolved transparently remain `ambiguous`.

A negative, ambiguous, or tied outcome is a **good** result for the portfolio project. It proves intellectual honesty.

## Trace contract

Save only scrubbed, reproducible traces—never credentials.

```ts
type ComparisonRun = {
  id: string;
  createdAt: string;
  taskSnapshot: TaskFixture;
  sharedConfig: {
    query: string;
    urls: string[];
    maxAgeHours?: number;
    apiVersion?: string;
    beta?: string;
  };
  standard: RetrievalTrace;
  dynamic: RetrievalTrace;
};

type RetrievalTrace = {
  mode: "standard" | "dynamic";
  request: Record<string, unknown>; // allowlisted fields only
  response: {
    requestId?: string;
    excerpts: Array<{ id: string; url: string; text: string }>;
    statuses: Array<{ url: string; status: string; source?: string }>;
    costDollars?: number;
  };
  metrics: {
    returnedCharacters: number;
    estimatedTokens: number;
    latencyMs: number;
    requiredFactStatus: Record<string, "present" | "missing" | "ambiguous">;
    duplicatePairs: Array<{
      leftExcerptId: string;
      rightExcerptId: string;
      score: number;
      method: "normalized-shingles";
    }>;
  };
};
```

If a token figure is derived from characters, label it explicitly as an estimate—not billable API usage.

Latency is observational for an individual run. Any published latency comparison must use multiple interleaved trials and report a median and range.

## Lean technical architecture

**Stack:** Next.js + TypeScript + Tailwind, Exa SDK/direct server-side API client, Vitest, Playwright, JSON fixtures. Deploy to Vercel after the local flow works.

```text
exa-dynamic-highlights-inspector/
  app/
    page.tsx
    api/compare/route.ts
  components/
    task-picker.tsx
    comparison-panel.tsx
    context-allocation-bar.tsx
    evidence-excerpt.tsx
    facts-coverage-table.tsx
    trace-drawer.tsx
    how-it-works.tsx
  lib/
    exa.ts
    compare.ts
    evaluation.ts
    duplicate-detection.ts
    token-estimate.ts
    trace.ts
    types.ts
  data/tasks/
    multi-source-synthesis.json
    redundancy-exception.json
    long-document-nuance.json
  traces/examples/
  tests/
  e2e/
  .env.example
  README.md
```

All Exa calls must occur server-side. `EXA_API_KEY` must never reach browser JavaScript or downloaded trace JSON.

The deployed app opens committed recorded runs by default. Live reruns are available only when the server has `EXA_API_KEY` configured. The live endpoint must enforce seeded task IDs, input-size limits, timeouts, and rate limits so a public deployment cannot become an unrestricted proxy for the owner's API key.

## Build sequence

**Feasibility result (September 16, 2026):** confirmed. The Contents API accepted the same explicit URL array for Standard and Dynamic Highlights, and Dynamic returned the documented `results[].highlights` shape when sent `dynamic: true` with the preview beta header. The first scrubbed run is stored in `traces/examples/fixed-url-feasibility.json`.

### 1. Fixed-URL API feasibility spike
- Verify that Dynamic Highlights works with the Contents API for an explicit URL set.
- Confirm the required beta header or SDK constant against current Exa documentation.
- Save one scrubbed Standard response and one scrubbed Dynamic response.
- If Dynamic Highlights only works through Search, revise the fixed-URL experiment before building the UI.

**Verify:** both modes receive the same ordered URL array and produce the documented `results[].highlights` response shape.

### 2. Static, cloneable shell
- Initialize a minimal TypeScript Next.js app.
- Add `.env.example` with `EXA_API_KEY=`.
- Add a static task picker, recorded comparison state, and “How it works” panel.
- Document local startup and source links.

**Verify:** `npm run lint && npm run build`

### 3. Contracts, fixtures, and evaluation utilities
- Add runtime-validated task, provider-response, trace, and comparison-run schemas.
- Implement deterministic character-based token estimation.
- Implement reviewable required-fact matching and normalized shingle duplicate detection.
- Add Vitest coverage before live API work.

**Verify:** `npm test -- --run`

### 4. Recorded vertical slice
- Build one task end to end from the scrubbed responses created during the feasibility spike.
- Render evidence, source allocation, fact status, duplication, and the full scrubbed trace.
- Make the recorded run usable without an API key or network request.

**Verify:** a browser test loads and inspects the recorded comparison with no environment variables configured.

### 5. Pre-register the three task fixtures
- Select stable source URLs.
- Save access dates, required facts, source URLs, and literal support passages.
- Review that each fact is actually sufficient to answer the task.
- Commit fixtures before comparing modes.

**Verify:** parse every fixture in tests; require source and support-passage metadata.

### 6. Exa comparison route
- Introduce an injectable Exa-client interface so tests use recorded responses.
- Ensure Standard and Dynamic calls receive the exact same query and URL array.
- Keep the different mode configuration isolated in `lib/exa.ts`.
- Verify current Dynamic Highlights preview requirements against Exa docs immediately before the first live run.[2]
- Redact all authorization information by construction.
- Accept seeded task IDs rather than arbitrary URLs in the deployed v1 endpoint.
- Add request timeout, input limits, rate limiting, and structured preview-access errors.

**Verify:** recorded-response unit tests plus `npm run build`.

### 7. Complete comparison UI
- Render two evidence contexts side by side.
- Add allocation bars, omitted-source view, facts table, and trace drawer.
- Include loading, rate-limit, unavailable-preview, and error states.
- Allow scrubbed trace download/copy.
- Keep the committed recorded run visible after a live-run failure.

**Verify:** Playwright test confirms seeded comparison and no secret in HTML or exported trace.

### 8. Publish real evidence
- Run each seeded task in both modes.
- Commit scrubbed raw traces, timestamp/config metadata, and a findings table.
- Record at least one limitation or ambiguous result.
- Create a 3–5 minute walkthrough: problem → identical URLs → two contexts → trace → limitation → clone/run instructions.

**Verify:** `npm test -- --run && npm run lint && npm run build && npx playwright test`

## Acceptance criteria

- A developer can clone the repo and inspect all committed example comparisons without an API key.
- After setting `EXA_API_KEY`, a developer can optionally rerun a seeded comparison live.
- Query and URL set remain constant and are visibly displayed.
- Raw/scrubbed evidence and configuration are visible—not only a polished model answer.
- At least one limitation, tie, or failure condition is published.
- The README labels Dynamic Highlights as a research preview and points to current Exa docs.[1][2]
- The app has both a trace and a concise “How it works” section, matching the inspectable-explanation pattern in Exa’s existing demo catalog.[3]
- No secret, invented benchmark result, or unsupported “best search API” claim is included.

## After v1

1. Add advanced custom query + URL input with appropriate deployment controls.
2. Add an optional controlled answer layer using the same model, version, temperature, and prompt for both contexts.
3. Add a full-text baseline using the same Exa URLs.
4. Add custom task import/export for workshops.
5. Add one adjacent-provider adapter only if it maintains a fair layer-specific comparison.
6. Publish the technical case study: **Does Dynamic Highlights Preserve the Evidence an Agent Needs?**
7. Reuse the same trace in a short demo/video: **“Your agent cannot cite evidence it never received.”**

## Benchmark expansion

After the fixed-URL inspector is stable, add an evaluation lab modeled on Exa's published two-track protocol:

- **Single-turn:** SimpleQA, a clearly named long-context code QA proxy, MultiLoKo, FRAMES, and SealQA + SealQA-Hard.
- **Agentic:** DeepSearchQA (DSQA), BrowseComp, FinSearchComp, a clearly named WideSearch-en proxy, and LiveBrowseComp.

The answer model, prompts, search settings, result set, grader, and sample order must remain fixed within every paired comparison. Only the highlight mode changes. Exa-published chart values are reference data and must never be presented as locally reproduced results. Start with small deterministic public subsets, store item-level resumable traces, and require an explicit flag for costly full runs. See `docs/EVALS.md` for the protocol.

## Sources

[1] https://exa.ai/blog/dynamic-highlights
[2] https://exa.ai/docs/reference/contents-api-guide
[3] https://demos.exa.ai
