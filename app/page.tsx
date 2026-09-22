import { EvalReference } from "@/components/eval-reference";
import { exaPublishedAgentic, exaPublishedSingleTurn } from "@/lib/evals/catalog";
import { loadMicroscopeData } from "@/lib/data/load-microscope";
import { SelectionMicroscope } from "@/components/selection-microscope";
import { LocalEvalResults } from "@/components/local-eval-results";
import { AgenticEvalResults } from "@/components/agentic-eval-results";
import { loadAgenticSummary } from "@/lib/data/load-agentic-summary";
import { AgenticTraceInspector } from "@/components/agentic-finsearch-inspector";
import { loadAgenticInspector } from "@/lib/data/load-agentic-inspector";

export default async function Home() {
  const microscope = await loadMicroscopeData();
  const agenticSummary = await loadAgenticSummary();
  const agenticInspector = await loadAgenticInspector();

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandMark">DH</span><span>Dynamic Highlights Inspector</span></div>
        <div className="runState"><span className="statusDot" /> 60 single-turn + 12 agentic</div>
      </header>

      <SelectionMicroscope {...microscope} />

      <LocalEvalResults />

      <AgenticEvalResults summary={agenticSummary} />

      <AgenticTraceInspector benchmarks={agenticInspector} />

      <EvalReference singleTurn={exaPublishedSingleTurn} agentic={exaPublishedAgentic} />
    </main>
  );
}
