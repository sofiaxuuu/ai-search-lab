import { EvalReference } from "@/components/eval-reference";
import { exaPublishedAgentic, exaPublishedSingleTurn } from "@/lib/evals/catalog";
import { loadPilotPairs } from "@/lib/data/load-pilot";
import { SelectionMicroscope } from "@/components/selection-microscope";

export default async function Home() {
  const pilotPairs = await loadPilotPairs();

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandMark">DH</span><span>Dynamic Highlights Inspector</span></div>
        <div className="runState"><span className="statusDot" /> 10-question pilot</div>
      </header>

      <SelectionMicroscope pairs={pilotPairs} />

      <EvalReference singleTurn={exaPublishedSingleTurn} agentic={exaPublishedAgentic} />
    </main>
  );
}
