import type { AgenticBenchmarkId } from "./types";

export const AGENTIC_SAMPLE_SEED = 20260920;

export const AGENTIC_SUITE: Record<
  AgenticBenchmarkId,
  { name: string; sampleSize: 10; source: string; download: string; note?: string }
> = {
  dsqa: {
    name: "DeepSearchQA (DSQA)",
    sampleSize: 10,
    source: "https://huggingface.co/datasets/google/deepsearchqa",
    download: "https://huggingface.co/datasets/google/deepsearchqa/resolve/main/DSQA-full.csv",
    note: "The official metric uses a Gemini 2.5 Flash autorater; our first pilot grade is provisional.",
  },
  browsecomp: {
    name: "BrowseComp",
    sampleSize: 10,
    source: "https://github.com/openai/simple-evals",
    download: "https://openaipublic.blob.core.windows.net/simple-evals/browse_comp_test_set.csv",
    note: "Questions and answers are decrypted only into the ignored local snapshot and must not be published.",
  },
  finsearchcomp: {
    name: "FinSearchComp",
    sampleSize: 10,
    source: "https://github.com/randomtutu/FinSearchComp",
    download: "https://raw.githubusercontent.com/randomtutu/FinSearchComp/main/data/finsearchcomp_data.json",
  },
  livebrowsecomp: {
    name: "LiveBrowseComp",
    sampleSize: 10,
    source: "https://huggingface.co/datasets/Forival/LiveBrowseComp",
    download: "https://huggingface.co/datasets/Forival/LiveBrowseComp/resolve/main/LiveBrowseComp.jsonl",
    note: "Questions and answers are decrypted only into the ignored local snapshot and must not be published.",
  },
};
