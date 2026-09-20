import type { BudgetSweepSummary } from "./sweep-aggregate";

const COLORS = ["#ef5a3c", "#276ef1", "#16856b", "#a35bd6", "#d18b00", "#586174"];

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/gu, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  })[character] ?? character);
}

export function renderScoreTokenPlot(summary: BudgetSweepSummary) {
  const series = Object.entries(summary.byBenchmark)
    .map(([benchmark, points]) => ({
      benchmark,
      points: points.filter((point) => point.completedItems > 0 && "dynamicScore" in point),
    }))
    .filter((entry) => entry.points.length);
  if (!series.length) throw new Error("No completed sweep points are available to plot");

  const allPoints = series.flatMap((entry) => entry.points);
  const maxTokens = Math.max(...allPoints.flatMap((point) => [
    point.standardMeanRetrievalTokens,
    point.dynamicMeanRetrievalTokens,
  ])) * 1.08;
  const width = 1120;
  const height = 700;
  const margin = { left: 88, right: 230, top: 60, bottom: 82 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = (tokens: number) => margin.left + (tokens / maxTokens) * plotWidth;
  const y = (score: number) => margin.top + (1 - score) * plotHeight;
  const grid = Array.from({ length: 6 }, (_, index) => {
    const score = index / 5;
    const py = y(score);
    return `<line x1="${margin.left}" y1="${py}" x2="${margin.left + plotWidth}" y2="${py}" stroke="#d9dde5"/><text x="${margin.left - 14}" y="${py + 5}" text-anchor="end">${Math.round(score * 100)}%</text>`;
  }).join("");

  const marks = series.map((entry, seriesIndex) => {
    const color = COLORS[seriesIndex % COLORS.length];
    const first = entry.points[0];
    const standard = `<rect x="${x(first.standardMeanRetrievalTokens) - 6}" y="${y(first.standardScore) - 6}" width="12" height="12" fill="${color}" transform="rotate(45 ${x(first.standardMeanRetrievalTokens)} ${y(first.standardScore)})"><title>${escapeXml(entry.benchmark)} Standard</title></rect>`;
    const dynamicPoints = [...entry.points].sort(
      (left, right) => left.dynamicMeanRetrievalTokens - right.dynamicMeanRetrievalTokens,
    );
    const path = dynamicPoints.map((point, index) => `${index ? "L" : "M"}${x(point.dynamicMeanRetrievalTokens)},${y(point.dynamicScore)}`).join(" ");
    const dynamic = dynamicPoints.map((point) => `<g><circle cx="${x(point.dynamicMeanRetrievalTokens)}" cy="${y(point.dynamicScore)}" r="6" fill="${color}"><title>${escapeXml(entry.benchmark)} Dynamic ${point.config}: ${(point.dynamicScore * 100).toFixed(1)}%, ${point.dynamicMeanRetrievalTokens.toFixed(0)} tokens</title></circle><text x="${x(point.dynamicMeanRetrievalTokens) + 8}" y="${y(point.dynamicScore) - 8}" fill="${color}" font-size="11">${escapeXml(point.config)}</text></g>`).join("");
    return `<path d="${path}" fill="none" stroke="${color}" stroke-width="2" opacity="0.72"/>${standard}${dynamic}`;
  }).join("");

  const legendX = margin.left + plotWidth + 28;
  const legend = series.map((entry, index) => `<g transform="translate(${legendX},${margin.top + index * 30})"><circle r="6" fill="${COLORS[index % COLORS.length]}"/><text x="14" y="5">${escapeXml(entry.benchmark)}</text></g>`).join("");
  const markerKeyY = margin.top + series.length * 30 + 24;
  const markerKey = `<g transform="translate(${legendX - 14},${markerKeyY})"><rect x="0" y="0" width="205" height="108" rx="5" fill="#ffffff" stroke="#c8ced5"/><text x="14" y="22" font-size="11" font-weight="700" letter-spacing="1">MARKER KEY</text><rect x="17" y="40" width="12" height="12" fill="#586174" transform="rotate(45 23 46)"/><text x="42" y="45" font-size="12" font-weight="700">Standard baseline</text><text x="42" y="59" font-size="10" fill="#586174">Diamond</text><circle cx="23" cy="79" r="7" fill="#586174"/><text x="42" y="78" font-size="12" font-weight="700">Dynamic configuration</text><text x="42" y="93" font-size="10" fill="#586174">Circle · Default / Low / Medium / High</text></g>`;
  const xTicks = Array.from({ length: 6 }, (_, index) => {
    const tokens = (maxTokens * index) / 5;
    const px = x(tokens);
    return `<line x1="${px}" y1="${margin.top}" x2="${px}" y2="${margin.top + plotHeight}" stroke="#eef0f4"/><text x="${px}" y="${margin.top + plotHeight + 28}" text-anchor="middle">${Math.round(tokens)}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">Single-turn score versus retrieval tokens</title><desc id="desc">Local benchmark results. Diamonds are Standard baselines; labeled circles are Dynamic configurations.</desc><rect width="100%" height="100%" fill="#fbfaf7"/><g font-family="ui-sans-serif,system-ui,sans-serif" fill="#20242c"><text x="${margin.left}" y="34" font-size="24" font-weight="700">Local single-turn score vs. retrieval tokens</text>${grid}${xTicks}<line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" stroke="#20242c"/><line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" stroke="#20242c"/>${marks}${legend}${markerKey}<text x="${margin.left + plotWidth / 2}" y="${height - 22}" text-anchor="middle" font-size="15">Mean formatted retrieval-context tokens (o200k_base)</text><text transform="translate(24 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle" font-size="15">Accuracy</text></g></svg>`;
}
