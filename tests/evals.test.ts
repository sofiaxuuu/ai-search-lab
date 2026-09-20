import { describe, expect, it } from "vitest";
import { formatContext } from "../lib/evals/format-context";
import { deterministicSample } from "../lib/evals/sampling";
import { exactMatch, normalizeAnswer, tokenF1 } from "../lib/evals/scoring";
import { parseSimpleQAGrade } from "../lib/evals/openai-simpleqa-grader";
import { summarizePairs } from "../lib/evals/aggregate";
import type { RetrievalPair } from "../lib/evals/types";
import { approximateSharedSentence, charactersByUrl, splitSentences } from "../lib/visualization/selection-compare";
import {
  adaptFrames,
  adaptMultiLoKoRows,
  adaptSealQARows,
  adaptSimpleQA,
  adaptSweQAJsonl,
} from "../lib/evals/benchmark-adapters";
import { pairedBootstrapCI } from "../lib/evals/bootstrap";
import { countRetrievalTokens, RETRIEVAL_TOKENIZER } from "../lib/evals/retrieval-tokenizer";

describe("deterministic sampling", () => {
  it("returns the same identities for the same seed", () => {
    const items = Array.from({ length: 20 }, (_, id) => ({ id }));
    const first = deterministicSample(items, 5, 42, (item) => String(item.id));
    const second = deterministicSample(items, 5, 42, (item) => String(item.id));
    expect(first).toEqual(second);
    expect(new Set(first.map((item) => item.id)).size).toBe(5);
  });
});

describe("local scorers", () => {
  it("normalizes case, punctuation, and English articles", () => {
    expect(normalizeAnswer("The Eiffel Tower! ")).toBe("eiffel tower");
    expect(exactMatch("Eiffel Tower", "the Eiffel Tower.")).toBe(1);
  });

  it("counts duplicate token overlap correctly", () => {
    expect(tokenF1("red red blue", "red blue blue")).toBeCloseTo(2 / 3);
  });
});

describe("context formatting", () => {
  it("uses stable source numbers and includes URLs", () => {
    const text = formatContext([
      { id: "1.1", url: "https://a.example", text: " First fact. " },
      { id: "2.1", url: "https://b.example", text: "Second fact." },
    ]);
    expect(text).toContain("[SOURCE 1]\nURL: https://a.example\nEXCERPT:\nFirst fact.");
    expect(text).toContain("[SOURCE 2]\nURL: https://b.example");
  });
});

describe("SimpleQA grader output parsing", () => {
  it("maps the official A/B/C choices", () => {
    expect(parseSimpleQAGrade("A")).toBe("CORRECT");
    expect(parseSimpleQAGrade("B")).toBe("INCORRECT");
    expect(parseSimpleQAGrade("C")).toBe("NOT_ATTEMPTED");
  });

  it("fails closed when the grader output is malformed", () => {
    expect(parseSimpleQAGrade("I cannot decide")).toBe("NOT_ATTEMPTED");
  });
});

describe("paired aggregation", () => {
  it("keeps accuracy and context deltas paired by item", () => {
    const arm = (mode: "standard" | "dynamic", chars: number, score: 0 | 1) => ({
      mode,
      request: { ids: ["https://example.com"], highlights: { query: "q", ...(mode === "dynamic" ? { dynamic: true as const } : {}) } },
      response: { excerpts: [], statuses: [] },
      metrics: { returnedCharacters: chars, estimatedTokens: Math.ceil(chars / 4), latencyMs: 1 },
      answer: {
        provider: "openai" as const,
        model: "fixed",
        responseId: mode,
        promptVersion: "v1",
        text: "answer",
        usage: { inputTokens: chars, outputTokens: 1, totalTokens: chars + 1 },
        latencyMs: 1,
        provisionalGrade: { exactMatch: score, tokenF1: score, note: "debug-only-not-official-simpleqa-grade" as const },
        simpleQAGrade: {
          provider: "openai" as const,
          model: "grader",
          responseId: `grade-${mode}`,
          promptVersion: "openai-simpleqa-three-way-v1" as const,
          rawOutput: score ? "A" : "B",
          label: score ? "CORRECT" as const : "INCORRECT" as const,
          score,
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          latencyMs: 1,
        },
      },
    });
    const pair = {
      schemaVersion: 1,
      createdAt: "2026-09-20T00:00:00.000Z",
      benchmark: "simpleqa",
      item: { id: "one", problem: "q", answer: "a" },
      discovery: { query: "q", urls: ["https://example.com"], latencyMs: 1 },
      standard: arm("standard", 100, 0),
      dynamic: arm("dynamic", 80, 1),
    } satisfies RetrievalPair;
    const summary = summarizePairs([pair], 1);
    expect(summary.scores.accuracyDelta).toBe(1);
    expect(summary.context.meanCharacterDelta).toBe(-20);
    expect(summary.scores.dynamicOnlyCorrect).toBe(1);
  });
});

describe("selection comparison", () => {
  it("identifies exact and high-coverage evidence overlap", () => {
    const opposite = "The Benjamin Franklin Medal was awarded to John McCarthy in 2002.";
    expect(approximateSharedSentence(opposite, opposite)).toBe(true);
    expect(approximateSharedSentence("A completely unrelated sentence about weather patterns.", opposite)).toBe(false);
  });

  it("splits readable sentences and totals allocation by URL", () => {
    expect(splitSentences("First fact. Second fact!")).toEqual(["First fact.", "Second fact!"]);
    expect(charactersByUrl([
      { id: "1", url: "https://a.example", text: "1234" },
      { id: "2", url: "https://a.example", text: "56" },
    ]).get("https://a.example")).toBe(6);
  });
});

describe("single-turn benchmark adapters", () => {
  it("normalizes each public benchmark into the shared item contract", () => {
    expect(adaptSimpleQA("problem,answer\nWho?,Alice\n")[0]).toMatchObject({
      problem: "Who?",
      answer: "Alice",
    });
    expect(adaptMultiLoKoRows([{
      question: "Quand?",
      targets: ["1999", "en 1999"],
      id: "Article",
      output_type: "year",
    }], "fr")[0]).toMatchObject({
      answer: "1999",
      acceptableAnswers: ["1999", "en 1999"],
      metadata: { language: "fr" },
    });
    expect(adaptFrames("\tPrompt\tAnswer\treasoning_types\twiki_links\n0\tWhy?\tBecause\tmulti\t[]\n")[0]).toMatchObject({
      problem: "Why?",
      answer: "Because",
    });
    expect(adaptSealQARows([{ row_idx: 4, row: {
      question: "What?",
      answer: "That",
      urls: ["https://example.com"],
    } }], "sealqa-hard")[0]).toMatchObject({
      id: "sealqa-hard-00005",
      answer: "That",
    });
    expect(adaptSweQAJsonl('{"question":"How?","answer":"Carefully"}\n')[0]).toMatchObject({
      id: "sweqa-code-proxy-00001",
      answer: "Carefully",
    });
  });
});

describe("fixed retrieval tokenizer", () => {
  it("counts the exact formatted context with the pinned encoding", () => {
    expect(RETRIEVAL_TOKENIZER).toMatchObject({
      libraryVersion: "1.0.21",
      encoding: "o200k_base",
      countedText: "formatted-retrieval-context",
    });
    expect(countRetrievalTokens([
      { id: "1", url: "https://a.example", text: "First fact." },
    ])).toBe(19);
  });
});

describe("paired bootstrap", () => {
  it("resamples paired question deltas deterministically", () => {
    const rows = [{ standard: 1, dynamic: 1 }, { standard: 0, dynamic: 1 }];
    const statistic = (sample: typeof rows) =>
      sample.reduce((sum, row) => sum + row.dynamic - row.standard, 0) / sample.length;
    const first = pairedBootstrapCI(rows, statistic, { iterations: 500, seed: 7 });
    const second = pairedBootstrapCI(rows, statistic, { iterations: 500, seed: 7 });
    expect(first).toEqual(second);
    expect(first.low).toBe(0);
    expect(first.high).toBe(1);
  });
});
