# Dynamic Highlights Inspector

An inspectable comparison of the evidence Exa Standard Highlights and Dynamic
Highlights return for the same query and ordered URL set.

The first implementation milestone proves that Dynamic Highlights works with
explicit URLs through Exa's Contents API. A scrubbed result is committed at
`traces/examples/fixed-url-feasibility.json` and can be inspected without an
API key.

## Run the inspector

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The initial comparison is rendered entirely from
the committed scrubbed trace, so browsing it does not call Exa or require a
credential.

The page also includes Exa's published single-turn and agentic benchmark points
as a visual reference. Those points are separate from local results; this
repository has not reproduced those scores.

The **Selection microscope** uses the 10 local pilot traces to show source
allocation and returned excerpts side by side. Choose a question to see which
URLs received less context or were omitted by Dynamic Highlights. Sentence
colors show approximate text overlap computed by this app, not Exa's private
model reasoning.

## Where code lives

- `app/` — Next.js routes and the global stylesheet. `page.tsx` assembles the
  home page.
- `components/` — reusable pieces of the page, such as the side-by-side
  selection microscope and Exa reference charts.
- `lib/data/` — code that reads saved experiment files for the page.
- `lib/visualization/` — calculations used only to display evidence and charts.
- `lib/evals/` — benchmark data types, Exa/OpenAI API calls, scorers, and
  aggregation logic used by evaluation scripts.
- `scripts/evals/` — commands that import data, run paired evaluations, and
  summarize their results.
- `evals/datasets/` — the sampled SimpleQA questions.
- `evals/runs/` — saved question-by-question results and summaries.
- `traces/examples/` — a small standalone Exa API example used by the top
  comparison panel.
- `docs/` — evaluation protocol and beginner learning roadmap.

An easy rule: **page assembly is in `app/`, page pieces are in `components/`,
display calculations are in `lib/visualization/`, and benchmark mechanics are
in `lib/evals/`.**

## Run the feasibility probe

Requires Node.js 18 or newer.

1. Copy `.env.example` to `.env` and add an Exa API key.
2. Run `node scripts/probe-exa.mjs`.

The probe makes one Standard request and one Dynamic request using the same
query and ordered URL list. It writes only allowlisted request and response
fields; credentials are never written to the trace.

Dynamic Highlights is currently a research preview. The probe sends the
required `Exa-Beta: dynamic-highlights-2026-08-28` header only for the Dynamic
request.

## Current finding

The fixed-URL integration is feasible. In the first recorded run both URLs
succeeded in both modes. Dynamic Highlights returned more context in that run
(6,339 characters versus 5,165), reinforcing that the inspector should expose
the evidence and tradeoffs rather than assume Dynamic always returns less.

See [PLAN.md](./PLAN.md) for the product scope and build sequence.

## Evaluation expansion

The next layer mimics Exa's paired evaluation design across public benchmark
subsets. Standard and Dynamic runs use the same questions, search results,
answer model, prompts, and grader. Only the highlight mode changes.

See [docs/EVALS.md](./docs/EVALS.md) for the benchmark list, experimental
controls, reporting rules, and cost controls.

If you are learning evals, follow [docs/EVAL_LEARNING_PLAN.md](./docs/EVAL_LEARNING_PLAN.md).
It begins with a deterministic 10-item SimpleQA sample and one paired retrieval
trace before introducing answer models or LLM graders.
The larger single-turn reproduction protocol, dataset adapters, four-configuration
sweep, fixed tokenizer, paired bootstrap intervals, and local SVG plot workflow
are documented in [`docs/SINGLE_TURN_SUITE.md`](docs/SINGLE_TURN_SUITE.md).
