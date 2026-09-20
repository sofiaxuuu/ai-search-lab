import type { PublishedPoint } from "@/lib/evals/catalog";

function ReferencePlot({
  title,
  points,
  tokenUnit,
  maxTokens,
  minScore,
}: {
  title: string;
  points: PublishedPoint[];
  tokenUnit: string;
  maxTokens: number;
  minScore: number;
}) {
  const width = 760;
  const height = 430;
  const left = 70;
  const right = 24;
  const top = 34;
  const bottom = 50;
  const x = (value: number) => left + (value / maxTokens) * (width - left - right);
  const y = (score: number) => top + ((100 - score) / (100 - minScore)) * (height - top - bottom);

  return (
    <article className="evalPlotCard">
      <header>
        <div><span className="queryLabel">Exa-published reference</span><h3>{title}</h3></div>
        <a href="https://exa.ai/blog/dynamic-highlights" target="_blank" rel="noreferrer">Source ↗</a>
      </header>
      <svg className="evalPlot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: score versus tokens per query`}>
        {[minScore, minScore + (100 - minScore) / 2, 100].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="chartGrid" />
            <text x={left - 12} y={y(tick) + 4} textAnchor="end" className="chartTick">{Math.round(tick)}</text>
          </g>
        ))}
        {[0, .25, .5, .75, 1].map((fraction) => (
          <g key={fraction}>
            <line x1={x(maxTokens * fraction)} x2={x(maxTokens * fraction)} y1={top} y2={height - bottom} className="chartGrid" />
            <text x={x(maxTokens * fraction)} y={height - 24} textAnchor="middle" className="chartTick">{Math.round(maxTokens * fraction)}</text>
          </g>
        ))}
        {points.map((point) => (
          <g key={point.benchmark}>
            <line x1={x(point.dynamic.tokensK)} y1={y(point.dynamic.score)} x2={x(point.standard.tokensK)} y2={y(point.standard.score)} className="chartConnector" />
            <circle cx={x(point.standard.tokensK)} cy={y(point.standard.score)} r="8" className="standardPoint" />
            <rect x={x(point.dynamic.tokensK) - 7} y={y(point.dynamic.score) - 7} width="14" height="14" className="dynamicPoint" />
            <text x={x(point.dynamic.tokensK) - 10} y={y(point.dynamic.score) - 12} textAnchor="end" className="chartLabel">{point.benchmark}</text>
            <text x={x(point.dynamic.tokensK)} y={y(point.dynamic.score) + 24} textAnchor="middle" className="chartValue">{point.dynamic.score}</text>
            <text x={x(point.standard.tokensK)} y={y(point.standard.score) + 24} textAnchor="middle" className="chartValue">{point.standard.score}</text>
          </g>
        ))}
        <text x={(left + width - right) / 2} y={height - 3} textAnchor="middle" className="axisLabel">{tokenUnit}</text>
        <text x="17" y={height / 2} textAnchor="middle" transform={`rotate(-90 17 ${height / 2})`} className="axisLabel">Score</text>
      </svg>
      <div className="plotLegend"><span><i className="dynamicLegend" /> Dynamic</span><span><i className="standardLegend" /> Standard</span></div>
      <p className="plotCaveat">Scores are transcribed from Exa’s chart. Token coordinates are approximate because exact per-benchmark token values were not published as data.</p>
    </article>
  );
}

export function EvalReference({ singleTurn, agentic }: { singleTurn: PublishedPoint[]; agentic: PublishedPoint[] }) {
  return (
    <section className="evalSection" id="evals">
      <header className="evalIntro">
        <div>
          <p className="eyebrow">Exa-published reference</p>
          <h2>Quality against context cost</h2>
        </div>
        <p>Compare our local 60-question result above with Exa’s published single-turn and agentic figures. These reference points come from Exa’s evaluation and are separate from our local run.</p>
      </header>
      <div className="protocolStrip" aria-label="Evaluation protocol">
        <div><strong>01</strong><span>Same benchmark question</span></div>
        <div><strong>02</strong><span>Same search results</span></div>
        <div><strong>03</strong><span>Swap highlight mode</span></div>
        <div><strong>04</strong><span>Score answer + tokens</span></div>
      </div>
      <div className="evalPlotGrid">
        <ReferencePlot title="Single-turn evals" points={singleTurn} tokenUnit="Retrieval tokens / query (k)" maxTokens={5} minScore={25} />
        <ReferencePlot title="Agentic evals" points={agentic} tokenUnit="Agent tokens / query (k)" maxTokens={700} minScore={45} />
      </div>
    </section>
  );
}
