import recordedRun from "@/traces/examples/fixed-url-feasibility.json";
import { EvalReference } from "@/components/eval-reference";
import { exaPublishedAgentic, exaPublishedSingleTurn } from "@/lib/evals/catalog";

type Excerpt = { id: string; url: string; text: string };
type Trace = {
  mode: "standard" | "dynamic";
  request: Record<string, unknown>;
  response: {
    requestId?: string;
    excerpts: Excerpt[];
    statuses: Array<{ url: string; status: string; source?: string }>;
    costDollars?: number;
  };
  metrics: {
    returnedCharacters: number;
    estimatedTokens: number;
    latencyMs: number;
  };
};

const run = recordedRun as typeof recordedRun & {
  standard: Trace;
  dynamic: Trace;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function domain(url: string) {
  return new URL(url).hostname.replace(/^www\./u, "");
}

function sourceAllocation(trace: Trace) {
  const total = trace.metrics.returnedCharacters;
  const byUrl = new Map<string, number>();
  for (const excerpt of trace.response.excerpts) {
    byUrl.set(excerpt.url, (byUrl.get(excerpt.url) ?? 0) + excerpt.text.length);
  }
  return run.sharedConfig.urls.map((url) => ({
    url,
    characters: byUrl.get(url) ?? 0,
    percent: total ? ((byUrl.get(url) ?? 0) / total) * 100 : 0,
  }));
}

function AllocationBar({ trace }: { trace: Trace }) {
  const allocation = sourceAllocation(trace);
  return (
    <div className="allocation" aria-label={`${trace.mode} source allocation`}>
      <div className="allocationBar">
        {allocation.map((source, index) => (
          <span
            className={`allocationSegment source${index + 1}`}
            key={source.url}
            style={{ width: `${source.percent}%` }}
            title={`${domain(source.url)}: ${source.characters.toLocaleString()} characters`}
          />
        ))}
      </div>
      <div className="legend">
        {allocation.map((source, index) => (
          <div key={source.url} className="legendItem">
            <span className={`legendDot source${index + 1}`} />
            <span>{domain(source.url)}</span>
            <strong>{Math.round(source.percent)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceColumn({ trace }: { trace: Trace }) {
  const isDynamic = trace.mode === "dynamic";
  return (
    <article className={`modePanel ${isDynamic ? "dynamic" : "standard"}`}>
      <header className="modeHeader">
        <div>
          <p className="eyebrow">{isDynamic ? "Cross-source selection" : "Per-document selection"}</p>
          <h2>{isDynamic ? "Dynamic" : "Standard"} Highlights</h2>
        </div>
        <span className="modeBadge">Recorded</span>
      </header>

      <div className="metricGrid">
        <div><span>Context</span><strong>{compactNumber(trace.metrics.returnedCharacters)} chars</strong></div>
        <div><span>Token estimate</span><strong>≈ {compactNumber(trace.metrics.estimatedTokens)}</strong></div>
        <div><span>Latency</span><strong>{trace.metrics.latencyMs.toLocaleString()} ms</strong></div>
      </div>

      <section className="allocationSection">
        <div className="sectionLabel"><span>Source allocation</span><span>{trace.response.excerpts.length} excerpts</span></div>
        <AllocationBar trace={trace} />
      </section>

      <section className="evidenceList" aria-label={`${trace.mode} evidence`}>
        {trace.response.excerpts.map((excerpt, index) => (
          <details className="excerpt" key={excerpt.id} open={index === 0}>
            <summary>
              <span className={`excerptIndex source${run.sharedConfig.urls.indexOf(excerpt.url) + 1}`}>{excerpt.id}</span>
              <span className="excerptSource">{domain(excerpt.url)}</span>
              <span className="excerptSize">{excerpt.text.length.toLocaleString()} chars</span>
            </summary>
            <p>{excerpt.text}</p>
            <a href={excerpt.url} target="_blank" rel="noreferrer">Open source ↗</a>
          </details>
        ))}
      </section>

      <details className="traceDetails">
        <summary>Inspect scrubbed trace</summary>
        <pre>{JSON.stringify({ request: trace.request, response: trace.response, metrics: trace.metrics }, null, 2)}</pre>
      </details>
    </article>
  );
}

export default function Home() {
  const standardChars = run.standard.metrics.returnedCharacters;
  const dynamicChars = run.dynamic.metrics.returnedCharacters;
  const difference = ((dynamicChars - standardChars) / standardChars) * 100;

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandMark">DH</span><span>Dynamic Highlights Inspector</span></div>
        <div className="runState"><span className="statusDot" /> Recorded run</div>
      </header>

      <section className="workspaceIntro">
        <div>
          <p className="eyebrow">Retrieval microscope · Fixed URL experiment</p>
          <h1>What did the agent actually get to read?</h1>
          <p className="introText">The same query and ordered URL set went through both modes. Expand the excerpts and inspect the exact context each returned.</p>
        </div>
        <button className="liveButton" disabled title="The live route is added in the next milestone">
          Run live comparison
          <span>Requires configured server</span>
        </button>
      </section>

      <section className="queryCard">
        <div className="queryNumber">01</div>
        <div className="queryBody">
          <span className="queryLabel">Research query</span>
          <p>{run.sharedConfig.query}</p>
          <div className="urlList">
            {run.sharedConfig.urls.map((url, index) => (
              <span key={url}><i className={`legendDot source${index + 1}`} />{domain(url)}</span>
            ))}
          </div>
        </div>
        <div className="finding">
          <span>Observed context delta</span>
          <strong>+{Math.round(difference)}%</strong>
          <small>Dynamic returned more in this run</small>
        </div>
      </section>

      <section className="comparisonGrid">
        <EvidenceColumn trace={run.standard} />
        <EvidenceColumn trace={run.dynamic} />
      </section>

      <section className="methodNote">
        <span>Method note</span>
        <p>This is one recorded observation, not a latency benchmark or universal quality claim. Character-based token figures use a transparent 4:1 estimate.</p>
        <time dateTime={run.createdAt}>Captured {new Date(run.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</time>
      </section>

      <EvalReference singleTurn={exaPublishedSingleTurn} agentic={exaPublishedAgentic} />
    </main>
  );
}
