"use client";

import { useEffect, useMemo, useState } from "react";
import { approximateSharedSentence, charactersByUrl, splitSentences } from "@/lib/visualization/selection-compare";
import type { MicroscopeArm, MicroscopeItem, MicroscopeManifest } from "@/lib/visualization/microscope-types";

const DYNAMIC_CONFIGS = ["default", "low", "medium", "high"] as const;

function domain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./u, ""); } catch { return url; }
}

function percentChange(standard: number, dynamic: number) {
  return standard ? ((dynamic - standard) / standard) * 100 : 0;
}

function gradeClass(label?: string) {
  if (label === "CORRECT") return "correct";
  if (label === "INCORRECT") return "incorrect";
  return "notAttempted";
}

function EvidenceStack({ arm, opposite, config }: { arm: MicroscopeArm; opposite: MicroscopeArm; config?: string }) {
  const oppositeByUrl = useMemo(() => {
    const map = new Map<string, string>();
    for (const excerpt of opposite.excerpts) map.set(excerpt.url, `${map.get(excerpt.url) ?? ""} ${excerpt.text}`);
    return map;
  }, [opposite]);

  return (
    <article className={`selectionEvidence ${arm.mode}`}>
      <header>
        <div>
          <span className="queryLabel">{arm.mode === "standard" ? "Independent per page" : `Aware of all pages · ${config}`}</span>
          <h3>{arm.mode === "standard" ? "Standard" : "Dynamic"} selection</h3>
        </div>
        <div className="selectionSize"><strong>{arm.retrievalTokens.toLocaleString()} tokens</strong><small>{arm.returnedCharacters.toLocaleString()} chars</small></div>
      </header>
      <div className="selectionLegend">
        <span><i className="sharedEvidence" /> Approx. shared evidence · plain</span>
        <span><i className="uniqueEvidence" /> Seen only in this mode · blue</span>
      </div>
      <div className="selectionExcerptList">
        {arm.excerpts.map((excerpt, index) => {
          const oppositeText = oppositeByUrl.get(excerpt.url) ?? "";
          return (
            <details key={excerpt.id} className="selectionExcerpt" open={index === 0}>
              <summary><span>{domain(excerpt.url)}</span><small>{excerpt.text.length.toLocaleString()} chars</small></summary>
              <div className="sentenceList">
                {splitSentences(excerpt.text).map((sentence, sentenceIndex) => (
                  <p className={approximateSharedSentence(sentence, oppositeText) ? "shared" : "unique"} key={`${excerpt.id}-${sentenceIndex}`}>{sentence}</p>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </article>
  );
}

export function SelectionMicroscope({ manifest, initialItems }: { manifest: MicroscopeManifest; initialItems: MicroscopeItem[] }) {
  const [benchmarkId, setBenchmarkId] = useState(manifest.defaultBenchmark);
  const [dynamicConfig, setDynamicConfig] = useState<string>(manifest.defaultDynamicConfig);
  const [selectedId, setSelectedId] = useState(initialItems[0]?.item.id ?? "");
  const [groups, setGroups] = useState<Record<string, MicroscopeItem[]>>({ [manifest.defaultBenchmark]: initialItems });
  const [loadError, setLoadError] = useState("");
  const items = useMemo(() => groups[benchmarkId] ?? [], [benchmarkId, groups]);

  useEffect(() => {
    if (groups[benchmarkId]) return;
    const benchmark = manifest.benchmarks.find((candidate) => candidate.id === benchmarkId);
    if (!benchmark) return;
    const controller = new AbortController();
    fetch(benchmark.path, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<MicroscopeItem[]>;
      })
      .then((loaded) => setGroups((current) => ({ ...current, [benchmarkId]: loaded })))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setLoadError(error.message);
      });
    return () => controller.abort();
  }, [benchmarkId, groups, manifest.benchmarks]);

  const ordered = useMemo(() => [...items].sort((left, right) => {
    const leftDynamic = left.dynamicByConfig[dynamicConfig];
    const rightDynamic = right.dynamicByConfig[dynamicConfig];
    const leftSaved = leftDynamic ? left.standard.retrievalTokens - leftDynamic.retrievalTokens : 0;
    const rightSaved = rightDynamic ? right.standard.retrievalTokens - rightDynamic.retrievalTokens : 0;
    return rightSaved - leftSaved;
  }), [dynamicConfig, items]);

  const pair = ordered.find((candidate) => candidate.item.id === selectedId) ?? ordered[0];
  const benchmark = manifest.benchmarks.find((candidate) => candidate.id === benchmarkId);
  const dynamic = pair?.dynamicByConfig[dynamicConfig];
  const delta = pair && dynamic ? percentChange(pair.standard.retrievalTokens, dynamic.retrievalTokens) : 0;

  return (
    <section className="microscopeSection" id="selection-microscope">
      <header className="microscopeIntro">
        <div><p className="eyebrow">Selection microscope · {manifest.totalQuestions}-question suite</p><h2>See where the context went</h2></div>
        <p>Choose a benchmark, question, and Dynamic configuration. Standard and Dynamic use the same frozen URLs. These panels show returned evidence; they do not expose Exa’s private model reasoning.</p>
      </header>

      <div className="microscopeControls">
        <div className="microscopeField">
          <label htmlFor="microscope-benchmark">Benchmark source</label>
          <select id="microscope-benchmark" value={benchmarkId} onChange={(event) => { setLoadError(""); setBenchmarkId(event.target.value as MicroscopeManifest["defaultBenchmark"]); setSelectedId(""); }}>
            {manifest.benchmarks.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.count}</option>)}
          </select>
        </div>
        <div className="microscopeField">
          <label htmlFor="microscope-config">Dynamic configuration</label>
          <select id="microscope-config" value={dynamicConfig} onChange={(event) => setDynamicConfig(event.target.value)}>
            {DYNAMIC_CONFIGS.map((config) => <option key={config} value={config}>{config[0].toUpperCase() + config.slice(1)}</option>)}
          </select>
        </div>
        <div className="microscopeField questionField">
          <label htmlFor="microscope-question">Question · {benchmark?.name}</label>
          <select id="microscope-question" value={pair?.item.id ?? ""} disabled={!pair} onChange={(event) => setSelectedId(event.target.value)}>
            {ordered.map((candidate, index) => <option key={candidate.item.id} value={candidate.item.id}>{String(index + 1).padStart(2, "0")} · {candidate.item.problem}</option>)}
          </select>
        </div>
        {pair && dynamic ? (
          <div className={delta <= 0 ? "deltaChip saving" : "deltaChip growth"}><strong>{delta > 0 ? "+" : ""}{Math.round(delta)}%</strong><span>Dynamic retrieval tokens</span></div>
        ) : <div className="microscopeLoading">{loadError || "Loading benchmark…"}</div>}
      </div>

      {pair && dynamic ? <MicroscopeComparison key={`${pair.item.id}-${dynamicConfig}`} pair={pair} dynamic={dynamic} config={dynamicConfig} /> : null}
    </section>
  );
}

function MicroscopeComparison({ pair, dynamic, config }: { pair: MicroscopeItem; dynamic: MicroscopeArm; config: string }) {
  const standardAllocation = charactersByUrl(pair.standard.excerpts);
  const dynamicAllocation = charactersByUrl(dynamic.excerpts);
  const sourceUrls = [...new Set([...pair.standard.excerpts.map((excerpt) => excerpt.url), ...dynamic.excerpts.map((excerpt) => excerpt.url)])];
  const maxAllocation = Math.max(1, ...sourceUrls.flatMap((url) => [standardAllocation.get(url) ?? 0, dynamicAllocation.get(url) ?? 0]));

  return <>
    <div className="selectionModel">
      <div><span>Standard</span><strong>Page 1 → excerpts</strong><strong>Page 2 → excerpts</strong><strong>Page 3 → excerpts</strong></div>
      <div className="modelArrow">→</div>
      <div className="jointModel"><span>Dynamic · {config}</span><strong>Page 1 + Page 2 + Page 3</strong><em>one shared selection pass</em></div>
    </div>
    <section className="allocationCompare">
      <header><span>Observed allocation by returned URL</span><span>Bar scale is shared across both modes</span></header>
      <div className="allocationColumnLabels"><span>Source</span><span>Standard</span><span>Dynamic · {config}</span></div>
      {sourceUrls.map((url, index) => {
        const standard = standardAllocation.get(url) ?? 0;
        const dynamicCharacters = dynamicAllocation.get(url) ?? 0;
        return (
          <div className="allocationCompareRow" key={url}>
            <div className="allocationSource"><b>{String(index + 1).padStart(2, "0")}</b><span>{domain(url)}</span></div>
            <div className="allocationModeBar"><i className="standardBar" style={{ width: `${(standard / maxAllocation) * 100}%` }} /><span>{standard ? standard.toLocaleString() : "omitted"}</span></div>
            <div className="allocationModeBar"><i className="dynamicBar" style={{ width: `${(dynamicCharacters / maxAllocation) * 100}%` }} /><span>{dynamicCharacters ? dynamicCharacters.toLocaleString() : "omitted"}</span></div>
          </div>
        );
      })}
    </section>
    <div className="selectionEvidenceGrid">
      <EvidenceStack arm={pair.standard} opposite={dynamic} />
      <EvidenceStack arm={dynamic} opposite={pair.standard} config={config} />
    </div>
    <div className="microscopeAnswer">
      <div><span>Reference</span><strong>{pair.item.answer}</strong></div>
      <div><span>Standard answer</span><b className={`gradeBadge ${gradeClass(pair.standard.grade?.label)}`}>{pair.standard.grade?.label ?? "Ungraded"}</b><strong>{pair.standard.answer}</strong></div>
      <div><span>Dynamic answer · {config}</span><b className={`gradeBadge ${gradeClass(dynamic.grade?.label)}`}>{dynamic.grade?.label ?? "Ungraded"}</b><strong>{dynamic.answer}</strong></div>
    </div>
    <p className="overlapNote">“Shared” is an approximate text-overlap classification calculated by this app. Semantically equivalent paraphrases may appear as mode-only evidence.</p>
  </>;
}
