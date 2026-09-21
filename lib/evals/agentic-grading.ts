import { gradeDsqaF1 } from "./openai-dsqa-f1-grader";
import {
  gradeBrowseComp,
  gradeFinSearchComp,
  gradeLiveBrowseComp,
} from "./openai-agentic-graders";
import type {
  AgenticBenchmarkGradeTrace,
  AgenticBenchmarkId,
  BenchmarkItem,
  DsqaF1GradeTrace,
} from "./types";

export async function gradeAgenticPair(
  apiKey: string,
  benchmark: AgenticBenchmarkId,
  item: BenchmarkItem,
  standardAnswer: string,
  dynamicAnswer: string,
): Promise<
  | { dsqaF1Grades: { standard: DsqaF1GradeTrace; dynamic: DsqaF1GradeTrace } }
  | { benchmarkGrades: { standard: AgenticBenchmarkGradeTrace; dynamic: AgenticBenchmarkGradeTrace } }
> {
  if (benchmark === "dsqa") {
    const [standard, dynamic] = await Promise.all([
      gradeDsqaF1(apiKey, item, standardAnswer),
      gradeDsqaF1(apiKey, item, dynamicAnswer),
    ]);
    return { dsqaF1Grades: { standard, dynamic } };
  }
  const grade = benchmark === "browsecomp"
    ? gradeBrowseComp
    : benchmark === "finsearchcomp"
      ? gradeFinSearchComp
      : gradeLiveBrowseComp;
  const [standard, dynamic] = await Promise.all([
    grade(apiKey, item, standardAnswer),
    grade(apiKey, item, dynamicAnswer),
  ]);
  return { benchmarkGrades: { standard, dynamic } };
}
