import type { AgenticSummary } from "./agentic-aggregate";

const LABELS: Record<string, string> = {
  dsqa: "DSQA (F1)",
  browsecomp: "BrowseComp",
  finsearchcomp: "FinSearchComp",
  livebrowsecomp: "LiveBrowseComp",
};
const COLORS = ["#2456d9", "#ef5a3c", "#347058", "#8b5cf6"];

function escapeXml(value: string) {
  return value.replace(/[<>&"']/gu, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
}

export function renderAgenticScoreTokenPlot(summary: AgenticSummary) {
  const width = 1120;
  const height = 700;
  const margin = { left: 82, right: 52, top: 92, bottom: 84 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const entries = Object.entries(summary.byBenchmark);
  const maxTokens = Math.max(...entries.flatMap(([, value]) => [value.standardModelTokens.mean, value.dynamicModelTokens.mean])) * 1.12;
  const x = (value: number) => margin.left + value / maxTokens * plotWidth;
  const y = (value: number) => margin.top + (1 - value) * plotHeight;
  const xTicks = Array.from({ length: 6 }, (_, index) => {
    const value = maxTokens * index / 5;
    const position = x(value);
    return `<line x1="${position}" y1="${margin.top}" x2="${position}" y2="${margin.top + plotHeight}" stroke="#d9ded7"/><text x="${position}" y="${margin.top + plotHeight + 26}" text-anchor="middle" font-size="12" fill="#626a64">${Math.round(value / 1000)}k</text>`;
  }).join("");
  const yTicks = Array.from({ length: 6 }, (_, index) => {
    const value = index / 5;
    const position = y(value);
    return `<line x1="${margin.left}" y1="${position}" x2="${margin.left + plotWidth}" y2="${position}" stroke="#d9ded7"/><text x="${margin.left - 14}" y="${position + 4}" text-anchor="end" font-size="12" fill="#626a64">${Math.round(value * 100)}%</text>`;
  }).join("");
  const marks = entries.map(([benchmark, value], index) => {
    const color = COLORS[index % COLORS.length];
    const sx = x(value.standardModelTokens.mean);
    const sy = y(value.standardScore);
    const dx = x(value.dynamicModelTokens.mean);
    const dy = y(value.dynamicScore);
    const label = escapeXml(`${LABELS[benchmark] ?? benchmark} · n=${value.completedItems}`);
    return `<g><line x1="${sx}" y1="${sy}" x2="${dx}" y2="${dy}" stroke="${color}" stroke-width="2" opacity=".55"/><rect x="${sx - 6}" y="${sy - 6}" width="12" height="12" fill="${color}" transform="rotate(45 ${sx} ${sy})"/><circle cx="${dx}" cy="${dy}" r="7" fill="${color}"/><text x="${Math.min(sx, dx) + 10}" y="${Math.min(sy, dy) - 12}" fill="${color}" font-size="13" font-weight="700">${label}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Local agentic score versus observed model tokens</title><desc id="desc">Diamonds show Standard Highlights and circles show Dynamic Highlights for four agentic benchmark pilots.</desc><rect width="100%" height="100%" fill="#fbfaf7"/><g font-family="ui-sans-serif,system-ui,sans-serif"><text x="${margin.left}" y="38" font-size="24" font-weight="700" fill="#20242c">Local agentic score vs. observed model tokens</text><text x="${margin.left}" y="64" font-size="13" fill="#626a64">Diamond = Standard · Circle = Dynamic · lines pair the same benchmark sample</text>${xTicks}${yTicks}<line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#20242c"/><line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#20242c"/>${marks}<text x="${margin.left + plotWidth / 2}" y="${height - 24}" text-anchor="middle" font-size="15" fill="#20242c">Observed model tokens per question</text><text transform="translate(24 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle" font-size="15" fill="#20242c">Benchmark score</text></g></svg>`;
}
