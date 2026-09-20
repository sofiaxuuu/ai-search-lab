import type { SingleTurnBenchmarkId } from "./types";

export const REQUESTED_INTERNAL_STYLE_BUDGETS = [3000, 6000, 12000, 24000] as const;
export const PUBLIC_DYNAMIC_CONFIGS = [
  { id: "default", label: "Default" },
  { id: "low", label: "Low", verbosity: "low" },
  { id: "medium", label: "Medium", verbosity: "medium" },
  { id: "high", label: "High", verbosity: "high" },
] as const;
export const DATASET_SAMPLE_SEED = 20260920;

export const SINGLE_TURN_SUITE: Record<
  SingleTurnBenchmarkId,
  { name: string; sampleSize: number; source: string; note?: string }
> = {
  simpleqa: {
    name: "SimpleQA",
    sampleSize: 10,
    source: "https://openaipublic.blob.core.windows.net/simple-evals/simple_qa_test_set.csv",
  },
  multiloko: {
    name: "MultiLoKo",
    sampleSize: 10,
    source: "https://github.com/facebookresearch/multiloko",
    note: "Read from the maintainers' locally extracted, password-protected archive.",
  },
  frames: {
    name: "FRAMES",
    sampleSize: 10,
    source: "https://huggingface.co/datasets/google/frames-benchmark",
  },
  sealqa: {
    name: "SealQA (SEAL-0)",
    sampleSize: 10,
    source: "https://huggingface.co/datasets/vtllms/sealqa",
  },
  "sealqa-hard": {
    name: "SealQA-Hard",
    sampleSize: 10,
    source: "https://huggingface.co/datasets/vtllms/sealqa",
  },
  "sweqa-code-proxy": {
    name: "SWE-QA (public proxy for Exa's unspecified long-context code QA)",
    sampleSize: 10,
    source: "https://huggingface.co/datasets/swe-qa/SWE-QA-Benchmark",
    note: "This is our public proxy. It is not Exa's undisclosed code benchmark.",
  },
};
