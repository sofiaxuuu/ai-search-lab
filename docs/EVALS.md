# Evaluation protocol

This project will mimic the structure of Exa's Dynamic Highlights evaluation;
it will not present Exa's published scores as locally reproduced results.

## Experimental variable

For every paired run, hold constant the benchmark item, search query, ordered
URL/result set, answer model and version, prompt, temperature, tool schema,
turn budget, and grader. Change only the highlight configuration:

- Standard: `highlights: { query }`
- Dynamic: `highlights: { query, dynamic: true }` plus the current beta header

Record raw retrieval characters, tokenizer-derived retrieval tokens when an
answer model is selected, answer or agent tokens, latency, answer, citations,
score, and provider request IDs.

## Two tracks

### Single-turn

One search call supplies context to one fixed answer-model call. Run public
subsets of SimpleQA, MultiLoKo, FRAMES, and SealQA/SealQA-Hard. Exa does not
name the dataset behind "Long-context code QA," so any substitute must be
named and labeled as a proxy.

Score each mode at several context budgets. Start with a 25-question smoke
subset and expand only after the trace and grader have been manually audited.

### Agentic

A fixed agent loop can search repeatedly. Use public subsets of DeepSearchQA
(DSQA), BrowseComp, FinSearchComp, and LiveBrowseComp. Exa does not publish
enough detail to identify its exact WideSearch-en subset and evaluator, so it
must remain a documented proxy until that information is available.

Agentic runs must report total agent tokens, retrieval tokens, number of search
calls, latency, and task score. Because the public Exa Agent API does not expose
an experiment switch for its internal highlight mode, this repo should use its
own fixed agent loop rather than claim to reproduce Exa Agent's internal run.

## Reporting

- Pair Standard and Dynamic runs by benchmark item and random seed.
- Run the same sample order for both modes.
- Report mean score with a bootstrap confidence interval.
- Report median and interquartile range for token and latency measurements.
- Publish every failed request and grader error in the denominator policy.
- Keep Exa-published reference data visually separate from local results.
- Label pilot subsets and proxies prominently; do not compare them directly to
  Exa's full benchmark averages.

## Cost controls

Default commands should run a small deterministic subset. Full benchmark runs
must require an explicit flag, print an estimated request count before starting,
and write resumable item-level results so retries do not repeat completed work.

## Public references

- Exa Dynamic Highlights: https://exa.ai/blog/dynamic-highlights
- SimpleQA: https://github.com/openai/simple-evals
- MultiLoKo: https://github.com/facebookresearch/multiloko
- FRAMES: https://huggingface.co/datasets/google/frames-benchmark
- SealQA: https://huggingface.co/datasets/vtllms/sealqa
- BrowseComp: https://github.com/openai/simple-evals
- FinSearchComp: https://github.com/randomtutu/FinSearchComp
- LiveBrowseComp: https://huggingface.co/datasets/Forival/LiveBrowseComp
- Related open web-search evaluator:
  https://github.com/youdotcom-oss/web-search-api-evals
