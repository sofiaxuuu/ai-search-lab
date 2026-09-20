import { EvalReference } from "@/components/eval-reference";
import { exaPublishedAgentic, exaPublishedSingleTurn } from "@/lib/evals/catalog";
import { loadMicroscopeData } from "@/lib/data/load-microscope";
import { SelectionMicroscope } from "@/components/selection-microscope";
import { LocalEvalResults } from "@/components/local-eval-results";

export default async function Home() {
  const microscope = await loadMicroscopeData();

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandMark">DH</span><span>Dynamic Highlights Inspector</span></div>
        <div className="runState"><span className="statusDot" /> 60-question eval</div>
      </header>

      <SelectionMicroscope {...microscope} />

      <LocalEvalResults />

      <EvalReference singleTurn={exaPublishedSingleTurn} agentic={exaPublishedAgentic} />
    </main>
  );
}
