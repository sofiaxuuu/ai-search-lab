"use client";

import { useMemo, useState } from "react";
import type {
  AgenticInspectorArm,
  AgenticInspectorBenchmark,
  AgenticInspectorSearch,
} from "@/lib/visualization/agentic-inspector-types";
import { approximateSharedSentence, splitSentences } from "@/lib/visualization/selection-compare";

function domain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./u, ""); } catch { return url; }
}

function delta(standard: number, dynamic: number) {
  return standard ? (dynamic - standard) / standard : 0;
}

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function SearchCard({ search, mode, oppositeByUrl, protectedContent }: {
  search: AgenticInspectorSearch;
  mode: "standard" | "dynamic";
  oppositeByUrl: Map<string, string>;
  protectedContent: boolean;
}) {
  const maxCharacters = Math.max(1, ...search.excerpts.map((excerpt) => excerpt.characters));
  return (
    <details className={`agentSearchCard ${mode}`} open={search.turn === 1}>
      <summary>
        <span>Search {search.turn}</span>
        <strong>{search.query}</strong>
        <small>{search.retrievalTokens.toLocaleString()} tokens</small>
      </summary>
      <div className="agentSearchAllocation">
        {search.excerpts.map((excerpt, index) => (
          <div className="agentSearchSource" key={`${search.turn}-${excerpt.id}`}>
            <div><b>{String(index + 1).padStart(2, "0")}</b><span title={excerpt.url}>{excerpt.url ? domain(excerpt.url) : `${excerpt.source} ${String(index + 1).padStart(2, "0")}`}</span><small>{excerpt.characters.toLocaleString()} chars · {excerpt.tokens.toLocaleString()} tokens</small></div>
            <i><span style={{ width: `${excerpt.characters / maxCharacters * 100}%` }} /></i>
            {!protectedContent && excerpt.text ? <details className="agentSearchExcerpt">
              <summary>Inspect returned evidence</summary>
              <div className="agentSearchEvidence sentenceList">
                {splitSentences(excerpt.text).map((sentence, sentenceIndex) => (
                  <p
                    className={approximateSharedSentence(sentence, oppositeByUrl.get(excerpt.url ?? "") ?? "") ? "shared" : "unique"}
                    key={`${excerpt.id}-${sentenceIndex}`}
                  >{sentence}</p>
                ))}
              </div>
              {excerpt.url ? <a href={excerpt.url} target="_blank" rel="noreferrer">Open source ↗</a> : null}
            </details> : null}
          </div>
        ))}
      </div>
    </details>
  );
}

function ArmColumn({ mode, arm, opposite, protectedContent }: { mode: "standard" | "dynamic"; arm: AgenticInspectorArm; opposite: AgenticInspectorArm; protectedContent: boolean }) {
  const oppositeByUrl = useMemo(() => {
    const map = new Map<string, string>();
    for (const search of opposite.searches) {
      for (const excerpt of search.excerpts) {
        if (excerpt.url && excerpt.text) map.set(excerpt.url, `${map.get(excerpt.url) ?? ""} ${excerpt.text}`);
      }
    }
    return map;
  }, [opposite]);
  return (
    <article className={`agentTraceArm ${mode}`}>
      <header><span>{mode === "standard" ? "Standard Highlights" : "Dynamic Highlights"}</span><strong>{arm.searches.length} searches</strong></header>
      <div className="agentTraceMetrics">
        <div><span>Model tokens</span><strong>{arm.modelTokens.toLocaleString()}</strong></div>
        <div><span>Raw retrieval</span><strong>{arm.retrievalTokens.toLocaleString()}</strong></div>
        <div><span>Score</span><strong>{(arm.score * 100).toFixed(0)}%</strong></div>
      </div>
      {!protectedContent ? <div className="selectionLegend">
        <span><i className="sharedEvidence" /> Approx. shared evidence · plain</span>
        <span><i className="uniqueEvidence" /> Seen only in this mode · blue</span>
      </div> : null}
      <div className="agentSearchList">
        {arm.searches.map((search) => <SearchCard key={search.turn} search={search} mode={mode} oppositeByUrl={oppositeByUrl} protectedContent={protectedContent} />)}
      </div>
    </article>
  );
}

export function AgenticTraceInspector({ benchmarks }: { benchmarks: AgenticInspectorBenchmark[] }) {
  const [benchmarkId, setBenchmarkId] = useState(benchmarks[0]?.id ?? "");
  const benchmark = benchmarks.find((candidate) => candidate.id === benchmarkId) ?? benchmarks[0];
  const items = benchmark?.items ?? [];
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const item = items.find((candidate) => candidate.id === selectedId) ?? items[0];
  if (!item) return null;
  const modelDelta = delta(item.standard.modelTokens, item.dynamic.modelTokens);
  const retrievalDelta = delta(item.standard.retrievalTokens, item.dynamic.retrievalTokens);

  return (
    <section className="agentInspectorSection" id="agentic-inspector" aria-labelledby="agent-inspector-title">
      <header className="localEvalIntro">
        <div><p className="eyebrow">Agentic failure microscope · {benchmark.name}</p><h2 id="agent-inspector-title">Follow every search and excerpt</h2></div>
        <p>Choose a benchmark and recorded question. Compare each search, context allocation, answer, and score across Standard and Dynamic Highlights.</p>
      </header>

      <div className="agentInspectorControl">
        <div className="microscopeField">
          <label htmlFor="agent-inspector-benchmark">Benchmark source</label>
          <select id="agent-inspector-benchmark" value={benchmark.id} onChange={(event) => {
            const next = benchmarks.find((candidate) => candidate.id === event.target.value);
            setBenchmarkId(event.target.value);
            setSelectedId(next?.items[0]?.id ?? "");
          }}>
            {benchmarks.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.items.length}</option>)}
          </select>
        </div>
        <div className="microscopeField">
          <label htmlFor="agent-inspector-question">Recorded question</label>
          <select id="agent-inspector-question" value={item.id} onChange={(event) => setSelectedId(event.target.value)}>
            {items.map((candidate, index) => <option value={candidate.id} key={candidate.id}>{String(index + 1).padStart(2, "0")} · {candidate.question}</option>)}
          </select>
        </div>
        <div className={`deltaChip ${modelDelta <= 0 ? "saving" : "growth"}`}><strong>{signedPercent(modelDelta)}</strong><span>Dynamic model tokens</span></div>
        <div className={`deltaChip ${retrievalDelta <= 0 ? "saving" : "growth"}`}><strong>{signedPercent(retrievalDelta)}</strong><span>Dynamic retrieval tokens</span></div>
      </div>

      {benchmark.protectedContent ? <div className="protectedTraceNote"><strong>Protected benchmark content</strong><span>Question text, search queries, answers, URLs, and excerpts are redacted. Token allocation, search counts, and scores remain visible.</span></div> : null}

      <div className="agentInspectorAnswers">
        <div><span>Reference answer</span><strong>{item.referenceAnswer}</strong></div>
        <div><span>Standard answer · score {(item.standard.score * 100).toFixed(0)}%</span><strong>{item.standard.answer}</strong></div>
        <div><span>Dynamic answer · score {(item.dynamic.score * 100).toFixed(0)}%</span><strong>{item.dynamic.answer}</strong></div>
      </div>

      <div className="agentTraceGrid">
        <ArmColumn mode="standard" arm={item.standard} opposite={item.dynamic} protectedContent={benchmark.protectedContent} />
        <ArmColumn mode="dynamic" arm={item.dynamic} opposite={item.standard} protectedContent={benchmark.protectedContent} />
      </div>
      <p className="overlapNote">{benchmark.protectedContent ? "Protected releases show allocation measurements without disclosing benchmark content." : "Blue marks evidence that does not approximately match text returned from the same URL in the other mode."} Per-source token counts are diagnostic and may not sum exactly to the full formatted search context.</p>
    </section>
  );
}
