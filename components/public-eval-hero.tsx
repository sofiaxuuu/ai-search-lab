export function PublicEvalHero() {
  return (
    <section className="publicEvalHero" aria-labelledby="public-eval-title">
      <div className="heroCopy">
        <p className="eyebrow">Independent paired evaluation · Recorded runs</p>
        <h1 id="public-eval-title">What does an agent lose when search context gets smaller?</h1>
        <p>
          Compare Exa Standard and Dynamic Highlights across 60 single-turn
          questions and 12 agentic pairs. Inspect the exact evidence, token
          allocation, searches, answers, and scores behind every public result.
        </p>
        <div className="heroActions">
          <a className="primaryAction" href="#single-turn-results">See single-turn results</a>
          <a href="#agentic-results">See agentic results</a>
          <a href="https://github.com/sofiaxuuu/ai-search-lab" target="_blank" rel="noreferrer">View source ↗</a>
        </div>
      </div>

      <div className="heroFindingGrid" aria-label="Headline local findings">
        <article><span>Single turn</span><strong>−63.7%</strong><p>retrieval tokens at Dynamic Medium</p></article>
        <article><span>Single turn</span><strong>+6.7 pt</strong><p>score difference across 60 questions</p></article>
        <article><span>Agentic pilot</span><strong>−10.8%</strong><p>observed model tokens across 12 pairs</p></article>
        <article className="cautionFinding"><span>Agentic pilot</span><strong>−4.4 pt</strong><p>score difference; exploratory sample</p></article>
      </div>

      <details className="runManifest">
        <summary>Run manifest and interpretation limits</summary>
        <div>
          <dl>
            <dt>Single-turn sample</dt><dd>10 questions × 6 public benchmarks</dd>
            <dt>Agentic sample</dt><dd>3 questions × 4 benchmarks</dd>
            <dt>Agent model</dt><dd>gpt-4o-mini-2024-07-18</dd>
            <dt>Agent limit</dt><dd>4 searches per arm</dd>
            <dt>Tokenizer</dt><dd>o200k_base via js-tiktoken 1.0.21</dd>
            <dt>Agentic run</dt><dd>September 21, 2026</dd>
          </dl>
          <p>This is our reproduction using a fixed local agent loop and public benchmark subsets. It does not reproduce Exa Agent or Exa&apos;s private datasets.</p>
        </div>
      </details>
    </section>
  );
}
