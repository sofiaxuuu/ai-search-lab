const headlineMetrics = [
  { label: "Questions", value: "60", detail: "10 × 6 benchmarks" },
  { label: "Evaluated arms", value: "300", detail: "Standard + 4 Dynamic" },
  { label: "Token reduction", value: "63.7%", detail: "Dynamic Medium" },
  { label: "Score difference", value: "+6.7 pt", detail: "95% CI +1.7 to +13.3" },
];

export function LocalEvalResults() {
  return (
    <section className="localEvalSection" id="single-turn-results" aria-labelledby="local-eval-title">
      <header className="localEvalIntro">
        <div>
          <p className="eyebrow">Our experiment · Recorded run</p>
          <h2 id="local-eval-title">What happened in our 60-question test</h2>
        </div>
        <p>
          We sampled 10 questions from each of six public benchmarks, froze the
          same URLs for every arm, and measured the exact formatted retrieval
          context with the pinned <code>o200k_base</code> tokenizer.
        </p>
      </header>

      <div className="localMetricStrip" aria-label="Local experiment highlights">
        {headlineMetrics.map((metric, index) => (
          <div key={metric.label}>
            <span>{String(index + 1).padStart(2, "0")} · {metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </div>
        ))}
      </div>

      <figure className="localPlotCard">
        <header>
          <div>
            <span className="queryLabel">Local result · 60 paired questions</span>
            <h3>Accuracy versus retrieval tokens</h3>
          </div>
          <a href="/results/score-vs-token.svg" target="_blank" rel="noreferrer">
            Open full size ↗
          </a>
        </header>
        <div className="localMarkerLegend" aria-label="Chart marker legend">
          <div>
            <i className="standardMarker" aria-hidden="true" />
            <span><strong>Standard baseline</strong><small>Diamond marker</small></span>
          </div>
          <div>
            <i className="dynamicMarker" aria-hidden="true" />
            <span><strong>Dynamic configurations</strong><small>Circles labeled Default, Low, Medium, High</small></span>
          </div>
        </div>
        <Image
          src="/results/score-vs-token.svg"
          alt="Local single-turn benchmark accuracy plotted against mean retrieval tokens for Standard Highlights and four Dynamic Highlight configurations across six benchmarks."
          width={1120}
          height={700}
          unoptimized
        />
        <figcaption>
          Diamonds show Standard. Circles show Dynamic Default, Low, Medium,
          and High at their measured token counts. Dynamic Medium produced the
          clearest pooled tradeoff: 63.7% fewer tokens and a +6.7-point score
          difference. This is an exploratory local reproduction with 10
          questions per benchmark, not Exa&apos;s internal evaluation.
        </figcaption>
      </figure>
    </section>
  );
}
import Image from "next/image";
