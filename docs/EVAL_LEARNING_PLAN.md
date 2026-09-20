# Eval learning plan

This sequence builds one auditable evaluation before scaling to a benchmark.
Each lesson leaves a working artifact in the repository.

## Lesson 1: dataset and deterministic sample

Import the public SimpleQA CSV, validate the required fields, and select the
same items every time from a fixed seed. The pilot uses 10 items so mistakes
are cheap to inspect.

**Artifact:** `evals/datasets/simpleqa-pilot.json`

## Lesson 2: freeze search discovery

For each question, call Exa Search once without contents and save the ordered
URLs. Standard and Dynamic Highlights must receive those same URLs; otherwise
the experiment also measures ranking variance.

**Artifact:** an item-level retrieval trace under `evals/runs/`.

## Lesson 3: paired retrieval

Send the frozen URL list to Contents twice. The only intended difference is
`dynamic: true` and its required beta header. Normalize both responses into the
same excerpt shape and count the actual returned characters.

**Artifact:** Standard and Dynamic arms in the same JSON record.

## Lesson 4: fixed answer model

Add one provider adapter. Use one exact model version, prompt, temperature, and
output limit for both contexts. Record provider token usage rather than relying
on a character estimate.

**Artifact:** two answers and their model usage attached to each retrieval pair.

## Lesson 5: grading

Begin with normalized exact match and token F1 to debug the pipeline. For the
reported SimpleQA score, reproduce its three-way grader: `CORRECT`, `INCORRECT`,
or `NOT_ATTEMPTED`. Keep the grader model and prompt frozen and hidden from the
answering model.

**Artifact:** raw grader output, parsed label, and score for both arms.

## Lesson 6: aggregation

Compute paired score and token differences per item, then aggregate mean score,
median tokens, failure rate, and bootstrap confidence intervals. Inspect every
regression before increasing the sample.

**Artifact:** a summary JSON and local-results chart.

## Lesson 7: scale deliberately

Move from 10 to 25, then 100 items. Add resumability and concurrency limits
before a full run. Add FRAMES or SealQA only after the SimpleQA trace is easy to
audit without reading source code.

The multi-benchmark implementation and pre-registered budget sweep now live in
[`docs/SINGLE_TURN_SUITE.md`](./SINGLE_TURN_SUITE.md). Keep the 10-item pilot as
the learning artifact; use the new suite for larger local claims.

## Commands

```bash
# Download and deterministically sample 10 official SimpleQA items.
npm run eval:import-simpleqa

# Print the calls and files a one-item run would create; spends nothing.
npm run eval:retrieval:dry

# Run one live discovery + paired retrieval using EXA_API_KEY from .env.
npm run eval:retrieval:one

# Prove that the saved pair kept the intended controls fixed.
npm run eval:audit

# Generate both answers with one fixed OpenAI model and prompt.
npm run eval:answer:one

# Grade both answers with the fixed three-way SimpleQA grader.
npm run eval:grade:one

# Run or resume the complete 10-item pilot, saving after every stage.
npm run eval:pilot

# Rebuild the summary from saved item traces without making API calls.
npm run eval:summarize

# Test deterministic sampling, formatting, and local scorers.
npm test
```

The live retrieval command does not call an answer model or grader yet. That is
intentional: first verify that each pair has identical questions and URLs and
only the highlight configuration differs.
