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

### First local agentic pilot

Create deterministic 10-question local snapshots without making paid API calls:

`npm run eval:agentic:prepare`

This prepares DSQA, BrowseComp, FinSearchComp, and LiveBrowseComp. BrowseComp's
and LiveBrowseComp's protected questions are decrypted only into
`evals/datasets/generated/`, which is ignored by Git and must not be exported
to the app or published.

`npm run eval:agentic:dry -- --dataset=evals/datasets/generated/dsqa-10.json`
prints the upper request cap for one paired question. Add `--live` only after
reviewing it. The agent has one `search_web` tool and a four-search limit. Each
tool call discovers a URL set once and caches it by query, then retrieves the
same cached URLs with Standard or Dynamic Highlights. Thus the mode may change
what the agent searches next and whether it needs another search—an intended
agentic outcome—while a matching query sees identical candidate URLs.

Report these separately: (1) observed Responses API input/output tokens summed
over all agent turns, (2) exact formatted retrieval-context tokens returned by
Exa, and (3) search count. Use model tokens as the primary agent-efficiency
measure because retrieval text is already present in later model inputs. Older
traces retain `totalObservedTokens` as a diagnostic sum, but it must not be used
as a billing total or the primary chart axis because it adds retrieval tokens a
second time. Start with one question from each public agentic benchmark once
adapters are added; do not pool those scores with the existing single-turn suite.

DSQA traces also include precision, recall, and F1 from
`dsqa-list-f1-openai-proxy-v1`. The proxy uses structured item extraction and
one-to-one semantic matching, then computes the metrics deterministically in
code. It is useful for local partial-credit comparisons, but it is not the
official DSQA Gemini 2.5 Flash autorater and must remain labeled as a proxy.

The remaining agentic tracks use their own accuracy contracts. BrowseComp uses
its published strict semantic match criteria. FinSearchComp uses the system and
user judge templates shipped with each dataset row and parses `answer_score`.
LiveBrowseComp uses a clearly labeled BrowseComp-style exact-answer proxy
because its release does not include a separate grader implementation. All use
the fixed OpenAI grader model in this repo, so only BrowseComp is described as
benchmark-compatible; none are claimed as exact reproductions of unpublished
or differently modeled leaderboard evaluators.

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
