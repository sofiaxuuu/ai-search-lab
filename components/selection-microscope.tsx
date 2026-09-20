"use client";

import { useMemo, useState } from "react";
import {
  approximateSharedSentence,
  charactersByUrl,
  splitSentences,
} from "@/lib/visualization/selection-compare";
import type { RetrievalArm, RetrievalPair } from "@/lib/evals/types";

function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}

function percentChange(standard: number, dynamic: number) {
  return standard ? ((dynamic - standard) / standard) * 100 : 0;
}

function EvidenceStack({
  arm,
  opposite,
}: {
  arm: RetrievalArm;
  opposite: RetrievalArm;
}) {
  const oppositeByUrl = useMemo(() => {
    const map = new Map<string, string>();
    for (const excerpt of opposite.response.excerpts) {
      map.set(excerpt.url, `${map.get(excerpt.url) ?? ""} ${excerpt.text}`);
    }
    return map;
  }, [opposite]);

  return (
    <article className={`selectionEvidence ${arm.mode}`}>
      <header>
        <div>
          <span className="queryLabel">{arm.mode === "standard" ? "Independent per page" : "Aware of all pages"}</span>
          <h3>{arm.mode === "standard" ? "Standard" : "Dynamic"} selection</h3>
        </div>
        <strong>{arm.metrics.returnedCharacters.toLocaleString()} chars</strong>
      </header>
      <div className="selectionLegend">
        <span><i className="sharedEvidence" /> Approx. shared evidence · plain</span>
        <span><i className="uniqueEvidence" /> Seen only in this mode · blue</span>
      </div>
      <div className="selectionExcerptList">
        {arm.response.excerpts.map((excerpt, index) => {
          const oppositeText = oppositeByUrl.get(excerpt.url) ?? "";
          return (
            <details key={excerpt.id} className="selectionExcerpt" open={index === 0}>
              <summary>
                <span>{domain(excerpt.url)}</span>
                <small>{excerpt.text.length.toLocaleString()} chars</small>
              </summary>
              <div className="sentenceList">
                {splitSentences(excerpt.text).map((sentence, sentenceIndex) => (
                  <p
                    className={approximateSharedSentence(sentence, oppositeText) ? "shared" : "unique"}
                    key={`${excerpt.id}-${sentenceIndex}`}
                  >
                    {sentence}
                  </p>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </article>
  );
}

export function SelectionMicroscope({ pairs }: { pairs: RetrievalPair[] }) {
  const ordered = useMemo(
    () => [...pairs].sort((left, right) => {
      const leftSaved = left.standard.metrics.returnedCharacters - left.dynamic.metrics.returnedCharacters;
      const rightSaved = right.standard.metrics.returnedCharacters - right.dynamic.metrics.returnedCharacters;
      return rightSaved - leftSaved;
    }),
    [pairs],
  );
  const [selectedId, setSelectedId] = useState(ordered[0]?.item.id ?? "");
  const pair = ordered.find((candidate) => candidate.item.id === selectedId) ?? ordered[0];
  if (!pair) return null;

  const standardAllocation = charactersByUrl(pair.standard.response.excerpts);
  const dynamicAllocation = charactersByUrl(pair.dynamic.response.excerpts);
  const sourceUrls = [...new Set([
    ...pair.standard.response.excerpts.map((excerpt) => excerpt.url),
    ...pair.dynamic.response.excerpts.map((excerpt) => excerpt.url),
  ])];
  const maxAllocation = Math.max(
    1,
    ...sourceUrls.flatMap((url) => [standardAllocation.get(url) ?? 0, dynamicAllocation.get(url) ?? 0]),
  );
  const delta = percentChange(
    pair.standard.metrics.returnedCharacters,
    pair.dynamic.metrics.returnedCharacters,
  );

  return (
    <section className="microscopeSection" id="selection-microscope">
      <header className="microscopeIntro">
        <div>
          <p className="eyebrow">Selection microscope · 10-question pilot</p>
          <h2>See where the context went</h2>
        </div>
        <p>Standard selects from every page independently. Dynamic sees the full result set and reallocates the shared context. These panels show the returned evidence; they do not expose Exa’s private model reasoning.</p>
      </header>

      <div className="questionControl">
        <label htmlFor="pilot-question">Question</label>
        <select id="pilot-question" value={pair.item.id} onChange={(event) => setSelectedId(event.target.value)}>
          {ordered.map((candidate) => (
            <option key={candidate.item.id} value={candidate.item.id}>{candidate.item.problem}</option>
          ))}
        </select>
        <div className={delta <= 0 ? "deltaChip saving" : "deltaChip growth"}>
          <strong>{delta > 0 ? "+" : ""}{Math.round(delta)}%</strong>
          <span>Dynamic context</span>
        </div>
      </div>

      <div className="selectionModel">
        <div><span>Standard</span><strong>Page 1 → excerpts</strong><strong>Page 2 → excerpts</strong><strong>Page 3 → excerpts</strong></div>
        <div className="modelArrow">→</div>
        <div className="jointModel"><span>Dynamic</span><strong>Page 1 + Page 2 + Page 3</strong><em>one shared selection pass</em></div>
      </div>

      <section className="allocationCompare">
        <header><span>Observed allocation by returned URL</span><span>Bar scale is shared across both modes</span></header>
        <div className="allocationColumnLabels"><span>Source</span><span>Standard</span><span>Dynamic</span></div>
        {sourceUrls.map((url, index) => {
          const standard = standardAllocation.get(url) ?? 0;
          const dynamic = dynamicAllocation.get(url) ?? 0;
          return (
            <div className="allocationCompareRow" key={url}>
              <div className="allocationSource"><b>{String(index + 1).padStart(2, "0")}</b><span>{domain(url)}</span></div>
              <div className="allocationModeBar">
                <i className="standardBar" style={{ width: `${(standard / maxAllocation) * 100}%` }} />
                <span>{standard ? standard.toLocaleString() : "omitted"}</span>
              </div>
              <div className="allocationModeBar">
                <i className="dynamicBar" style={{ width: `${(dynamic / maxAllocation) * 100}%` }} />
                <span>{dynamic ? dynamic.toLocaleString() : "omitted"}</span>
              </div>
            </div>
          );
        })}
      </section>

      <div className="selectionEvidenceGrid">
        <EvidenceStack arm={pair.standard} opposite={pair.dynamic} />
        <EvidenceStack arm={pair.dynamic} opposite={pair.standard} />
      </div>

      <div className="microscopeAnswer">
        <div><span>Reference</span><strong>{pair.item.answer}</strong></div>
        <div><span>Standard answer</span><strong>{pair.standard.answer?.text}</strong></div>
        <div><span>Dynamic answer</span><strong>{pair.dynamic.answer?.text}</strong></div>
      </div>
      <p className="overlapNote">“Shared” is an approximate text-overlap classification calculated by this app. Semantically equivalent paraphrases may appear as mode-only evidence.</p>
    </section>
  );
}
