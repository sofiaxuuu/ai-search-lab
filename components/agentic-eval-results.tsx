import Image from "next/image";
import type { AgenticSummary } from "@/lib/evals/agentic-aggregate";

const labels: Record<string, string> = {
  dsqa: "DSQA · F1",
  browsecomp: "BrowseComp",
  finsearchcomp: "FinSearchComp",
  livebrowsecomp: "LiveBrowseComp",
};

function percent(value: number, signed = false) {
  const amount = value * 100;
  return `${signed && amount > 0 ? "+" : ""}${amount.toFixed(1)}%`;
}

function points(value: number) {
  const amount = value * 100;
  return `${amount > 0 ? "+" : ""}${amount.toFixed(1)} pt`;
}

export function AgenticEvalResults({ summary }: { summary: AgenticSummary }) {
  return (
    <section className="agenticEvalSection" aria-labelledby="agentic-eval-title">
      <header className="localEvalIntro">
        <div>
          <p className="eyebrow">Our experiment · Agentic pilot</p>
          <h2 id="agentic-eval-title">What changes when the model can search again?</h2>
        </div>
        <p>
          Three paired questions from each of four public agentic benchmarks.
          The model could search up to four times, and each benchmark used its
          own scoring contract. Results remain exploratory at this sample size.
        </p>
      </header>

      <div className="localMetricStrip" aria-label="Agentic pilot highlights">
        <div><span>01 · Paired questions</span><strong>{summary.completedPairs}</strong><small>3 × 4 benchmarks</small></div>
        <div><span>02 · Model-token reduction</span><strong>{percent(summary.macro.modelTokenReduction)}</strong><small>Macro average</small></div>
        <div><span>03 · Score difference</span><strong>{points(summary.macro.scoreDelta)}</strong><small>Dynamic − Standard</small></div>
        <div><span>04 · Extra searches</span><strong>{summary.macro.meanSearchDelta.toFixed(1)}</strong><small>Mean Dynamic − Standard</small></div>
      </div>

      <figure className="localPlotCard agenticPlotCard">
        <header>
          <div>
            <span className="queryLabel">Local result · {summary.completedPairs} paired questions</span>
            <h3>Quality against observed model tokens</h3>
          </div>
          <a href="/results/agentic-score-vs-token.svg" target="_blank" rel="noreferrer">Open full size ↗</a>
        </header>
        <div className="localMarkerLegend" aria-label="Agentic chart marker legend">
          <div><i className="standardMarker" aria-hidden="true" /><span><strong>Standard baseline</strong><small>Diamond marker</small></span></div>
          <div><i className="dynamicMarker" aria-hidden="true" /><span><strong>Dynamic Highlights</strong><small>Circle marker</small></span></div>
        </div>
        <Image
          src="/results/agentic-score-vs-token.svg"
          alt="Local agentic benchmark score plotted against mean observed model tokens for Standard and Dynamic Highlights."
          width={1120}
          height={700}
          unoptimized
        />
        <div className="agenticTableWrap">
          <table className="agenticTable">
            <thead><tr><th>Benchmark</th><th>Score · S → D</th><th>Model tokens · S → D</th><th>Raw retrieval · S → D</th><th>Searches · S → D</th></tr></thead>
            <tbody>
              {Object.entries(summary.byBenchmark).map(([benchmark, result]) => (
                <tr key={benchmark}>
                  <th>{labels[benchmark] ?? benchmark}</th>
                  <td>{percent(result.standardScore)} → {percent(result.dynamicScore)}</td>
                  <td>{Math.round(result.standardModelTokens.mean).toLocaleString()} → {Math.round(result.dynamicModelTokens.mean).toLocaleString()}</td>
                  <td>{Math.round(result.standardRetrievalTokens.mean).toLocaleString()} → {Math.round(result.dynamicRetrievalTokens.mean).toLocaleString()}</td>
                  <td>{result.standardSearches.mean.toFixed(1)} → {result.dynamicSearches.mean.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <figcaption>
          Dynamic used {percent(summary.macro.modelTokenReduction)} fewer observed model tokens
          on a benchmark-macro average, with a {points(summary.macro.scoreDelta)} score
          difference. Raw retrieval tokens are shown separately and are not added
          again to model usage.
        </figcaption>
      </figure>
    </section>
  );
}
