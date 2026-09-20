# SimpleQA retrieval pilot findings

Run date: September 20, 2026

This is a 10-item learning pilot, not a statistically reliable benchmark.
Standard and Dynamic Highlights used the same question, ordered URLs, answer
model snapshot, answer prompt, grader snapshot, and grader prompt per item.

## Automated result

| Metric | Standard | Dynamic |
|---|---:|---:|
| SimpleQA-compatible accuracy | 90% | 90% |
| Mean returned characters | 7,925.5 | 3,638.8 |
| Mean answer-model input tokens | 2,310.8 | 1,219.8 |

Dynamic preserved the automated score while returning 54.1% fewer characters
on average and using 47.2% fewer answer-model input tokens. It returned fewer
characters on 8 of 10 questions and more on 2 of 10.

There were no mode-specific wins or regressions: both modes were graded correct
on nine items and incorrect on the same one item.

## Manual-review finding

The single item graded incorrect asks for the half-life of radon-224 in hours.
The reference is `1.8`; Standard answered `1.783 hours` and Dynamic answered
`1.783333333333 h`. Both were labeled `INCORRECT` by the fixed mini grader.

Those values round to the reference answer, so the automated 90% accuracy may
understate performance. Keep the raw automated label for reproducibility, but
flag this item for manual adjudication or a stronger grader before publishing a
benchmark claim. This is an example of grader error rather than evidence that
either highlight mode lost the answer.

## Interpretation limits

- Ten questions are too few for a general quality claim.
- The deterministic sample is a learning subset, not an official benchmark split.
- Retrieval token counts in the trace are estimates; answer input tokens are
  provider-reported actual counts and include instructions plus the question.
- Latency from one run per arm is observational.
- The grader is SimpleQA-compatible but uses a grader model snapshot chosen by
  this project because the original reported grader version is unspecified.
