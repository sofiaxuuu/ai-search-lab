# Local single-turn benchmark suite

This suite is our reproduction of the experiment shape in Exa's Dynamic
Highlights post. It does not reproduce Exa's private samples, answer prompts,
grader models, or unspecified code benchmark.

## Pre-registered protocol

- Dataset sample seed: `20260920`
- Default learning sample: 10 questions per benchmark
- Search discovery: one Exa Auto search per question, frozen to 10 ordered URLs
- Standard arm: provider-default Standard Highlights
- Dynamic arms: public API configurations `default`, `low`, `medium`, and `high`
- Answer model: `gpt-4o-mini-2024-07-18`, temperature 0
- Retrieval tokenizer: `js-tiktoken@1.0.21`, `o200k_base`
- Token-counted text: the exact formatted source context sent to the answer model,
  including source labels and URLs
- Confidence interval: 10,000 paired question-level bootstrap resamples, percentile
  95% interval, seed `20260920`

The 10-item default keeps the first six-benchmark run affordable. It is an
exploratory learning sample, not a statistical guarantee. Each Dynamic result is paired with the same
question, frozen URL list, answer model, and grader as Standard.

The originally proposed character sweep (`3000`, `6000`, `12000`, `24000`)
cannot be sent to the public API. Exa's OpenAPI specification says
`highlights.dynamic` is incompatible with `maxCharacters`, whose public maximum
is also 10,000. The public Dynamic control is `verbosity: low | medium | high`;
each preset applies one shared budget across the result set, but Exa tunes and
may change its exact size. We include the default Dynamic configuration as the
fourth arm and use measured retrieval tokens as the plot's x-axis.

## Dataset adapters

| Local ID | Public source | Adapter behavior |
|---|---|---|
| `simpleqa` | OpenAI SimpleQA | Reads `problem` and `answer` from the official CSV. |
| `multiloko` | Meta MultiLoKo | Reads every language's `dev.jsonl` from the locally extracted official archive and preserves all acceptable `targets`. |
| `frames` | Google FRAMES | Reads `Prompt`, `Answer`, reasoning type, and reference Wikipedia links from the pinned TSV. |
| `sealqa` | SealQA `seal_0` | Reads question, answer, reference URLs, freshness, type, year, and topic through the Hugging Face dataset server. |
| `sealqa-hard` | SealQA `seal_hard` | Uses the same schema as SEAL-0 but remains a separate sample and result series. |
| `sweqa-code-proxy` | SWE-QA | Clearly named public proxy for Exa's unspecified long-context code-QA dataset. Reads repository-level questions and reference answers from the pinned public JSONL. |

Generated snapshots are local and ignored by git. This avoids republishing
MultiLoKo data, whose maintainers intentionally password-protect the archive to
reduce accidental training contamination.

## Prepare deterministic samples

Prepare the five remotely readable datasets:

```bash
npm run eval:prepare
```

MultiLoKo must first be obtained and extracted according to its official README.
Then prepare its sample with:

```bash
npm run eval:prepare -- \
  --benchmark=multiloko \
  --multiloko-root=/absolute/path/to/benchmark_data
```

Override the common sample size when learning or estimating cost:

```bash
npm run eval:prepare -- --benchmark=frames --sample-size=25
```

## Inspect cost before running

The runner is resumable and saves after each stage. A dry run makes no API calls:

```bash
npm run eval:sweep:dry -- \
  --dataset=evals/datasets/generated/frames-10.json
```

For 10 questions, the maximum per benchmark is 10 Search calls, 50 Contents
calls, 50 answer calls, and 50 grader calls. Across all six benchmarks that is
60 Search, 300 Contents, 300 answer, and 300 grader calls. Use `--limit=1` for a
complete smoke test.

Run the selected snapshot only after reviewing the dry-run count:

```bash
npm run eval:sweep -- \
  --dataset=evals/datasets/generated/frames-10.json \
  --limit=1
```

Remove `--limit=1` to resume through the full snapshot. Run each benchmark
snapshot separately so failures and spend stay isolated.

## Summarize and plot

```bash
npm run eval:sweep:summarize
```

This writes:

- `evals/runs/single-turn-suite/summary.json`
- `evals/runs/single-turn-suite/score-vs-token.svg`
- `public/results/score-vs-token.svg` for the app
- `public/results/microscope/*.json` for the grouped 60-question microscope

Each configuration reports the paired score difference, paired retrieval-token
difference, relative token reduction, and 95% bootstrap intervals. The pooled
result weights every sampled question equally. Report it as a local result:

> Across our selected public benchmark subsets, Dynamic used X% fewer retrieval
> tokens with a Y-point score difference.

## Comparability limits

SimpleQA uses the implemented SimpleQA-compatible three-way grader. The other
adapters use the same frozen reference-answer three-way judge so the suite has a
uniform local accuracy metric. This is deliberately our protocol; it is not a
claim to reproduce every benchmark's official evaluator. SWE-QA is our public
proxy, and Standard uses its current provider defaults while Dynamic uses the
four public configurations described above.
