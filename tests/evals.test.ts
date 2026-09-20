import { describe, expect, it } from "vitest";
import { formatContext } from "../lib/evals/format-context";
import { deterministicSample } from "../lib/evals/sampling";
import { exactMatch, normalizeAnswer, tokenF1 } from "../lib/evals/scoring";

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
