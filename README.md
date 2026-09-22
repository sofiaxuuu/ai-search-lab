# Dynamic Highlights Inspector

An interactive, reproducible evaluation of how Exa Standard Highlights and
Dynamic Highlights change the evidence and token budget seen by an answer
model or search agent.

The app opens on recorded runs, so exploring the results requires no API key
and makes no paid requests. It includes question-level evidence inspectors,
paired score-versus-token plots, benchmark-specific grading, and the exact
search/context allocation behind each agentic run.

> This is an independent local reproduction, not Exa's internal evaluation.

## Results

| Track | Sample | Dynamic result | Quality result |
| --- | ---: | ---: | ---: |
| Single turn | 60 questions across 6 public benchmarks | **63.7% fewer retrieval tokens** at Dynamic Medium | **+6.7 points**; paired bootstrap 95% CI **+1.7 to +13.3** |
| Agentic pilot | 12 pairs across 4 benchmarks | **10.8% fewer observed model tokens** | **−4.4 points** |

The single-turn result was consistent enough to support a useful local finding:
Dynamic Medium reduced context substantially without reducing aggregate score
on this selected sample. The agentic result was more variable. BrowseComp and
LiveBrowseComp preserved score while reducing tokens, DSQA saved tokens but lost
partial-credit F1 on one influential question, and FinSearchComp used more
tokens without improving score.

That variance is why this project includes a **failure microscope**. It shows
searches, per-source allocation, exact returned excerpts, answers, scores, and
model usage instead of presenting only an aggregate chart.

## What the app lets you inspect

- **60-question selection microscope:** Standard versus four Dynamic
  configurations across SimpleQA, MultiLoKo, FRAMES, SealQA, SealQA-Hard, and a
  clearly labeled SWE-QA code proxy.
- **Single-turn score-versus-token plot:** paired benchmark outcomes with a
  fixed `o200k_base` tokenizer and bootstrap confidence interval.
- **Agentic score-versus-token plot:** observed model tokens, raw retrieval
  tokens, and search counts reported separately.
- **Agentic failure microscope:** all 12 recorded DSQA, BrowseComp,
  FinSearchComp, and LiveBrowseComp pairs. Public benchmark evidence is shown
  side by side with blue difference highlighting.
- **Exa-published reference figures:** visually separated from this project's
  local measurements.

BrowseComp and LiveBrowseComp evaluation content is protected by their release
format. The public artifact preserves scores and allocation measurements while
redacting question text, queries, answers, URLs, and excerpts.

## Experimental design

Every comparison is paired. Both arms use the same benchmark item, answer
model, prompt version, and grading contract. In single-turn runs they also use
the same frozen URL set. In agentic runs, matching queries share discovered
URLs, while later searches may diverge because the agent reacts to the evidence
it receives.

The agentic loop uses `gpt-4o-mini-2024-07-18`, a four-search maximum, and
benchmark-specific graders. It is our own fixed tool-using loop because Exa's
public Agent API does not expose an internal highlight-mode switch. DSQA and
some other graders are explicitly labeled local OpenAI proxies where the exact
official evaluator is unavailable.

Token accounting is intentionally separated:

- **Observed model tokens:** Responses API input plus output tokens summed over
  every turn. This is the primary agentic efficiency axis.
- **Raw retrieval tokens:** exact formatted context returned by Exa, counted
  with pinned `o200k_base`.
- **Searches:** successful agent search calls per question.

Retrieval tokens are not added to model tokens in the headline metric because
retrieval text already appears in later model inputs.

Full protocols, caveats, data sources, and grader contracts are documented in
[docs/EVALS.md](docs/EVALS.md) and
[docs/SINGLE_TURN_SUITE.md](docs/SINGLE_TURN_SUITE.md).

## Run the recorded app

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Recorded mode requires no `.env` file and makes
no Exa or OpenAI requests.

Validate the project with:

```bash
npm test
npm run lint
npm run build
npm run audit:public
```

## Reproduce the evaluations

Copy `.env.example` to `.env` and add `EXA_API_KEY` and `OPENAI_API_KEY` only
for live evaluation commands. Generated datasets and raw run traces are ignored
by Git.

Prepare deterministic benchmark snapshots:

```bash
npm run eval:prepare
npm run eval:agentic:prepare
```

Review request caps before spending money:

```bash
npm run eval:sweep:dry
npm run eval:agentic:batch:dry -- --limit=3
```

Run and summarize:

```bash
npm run eval:sweep
npm run eval:sweep:summarize
npm run eval:microscope:export

npm run eval:agentic:batch -- --limit=3
npm run eval:agentic:summarize
```

The batch runner is resumable and skips completed pairs. Start with one question
or one benchmark before expanding a paid run.

## Repository map

- `app/` — Next.js page assembly and styling
- `components/` — plots, result summaries, and evidence inspectors
- `lib/evals/` — API clients, agent loop, graders, token accounting, and aggregation
- `lib/visualization/` — display-only comparison utilities and view contracts
- `scripts/evals/` — deterministic import, execution, grading, and export commands
- `public/results/` — curated public artifacts used by recorded mode
- `evals/runs/` — ignored raw traces and local summaries
- `docs/` — protocols and the learning-oriented evaluation guide

## Limitations

- The 12-pair agentic run is exploratory and too small for a broad product claim.
- The benchmark mix and agent implementation differ from Exa's internal eval.
- Agentic search paths can diverge after the first evidence response.
- Grader-model and answer-model choices affect measured quality.
- Dynamic Highlights was a research preview during these runs, and its behavior
  may change.
- Public benchmark subsets do not represent every search workload.

The strongest conclusion is scoped: Dynamic Highlights was highly
token-efficient in this single-turn sample, while agentic efficiency and quality
varied enough by task to require trace-level inspection.

## Data and secret handling

API credentials are read only from local environment variables and are never
written to result files. Public JSON is generated through allowlisted view
contracts. Protected benchmark text is redacted before export. Before a public
release, run the tests, production build, secret scan, and protected-content
audit described in [docs/EVALS.md](docs/EVALS.md).

The original product scope and future experiments are tracked in
[PLAN.md](PLAN.md).
