export type ConfidenceInterval = {
  level: 0.95;
  low: number;
  high: number;
  iterations: number;
  seed: number;
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], proportion: number) {
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function pairedBootstrapCI<T>(
  rows: T[],
  statistic: (sample: T[]) => number,
  options: { iterations?: number; seed?: number } = {},
): ConfidenceInterval {
  if (!rows.length) throw new Error("Bootstrap requires at least one paired row");
  const iterations = options.iterations ?? 10_000;
  const seed = options.seed ?? 20260920;
  const random = mulberry32(seed);
  const estimates = Array.from({ length: iterations }, () => {
    const sample = Array.from({ length: rows.length }, () => rows[Math.floor(random() * rows.length)]);
    return statistic(sample);
  }).sort((left, right) => left - right);
  return {
    level: 0.95,
    low: percentile(estimates, 0.025),
    high: percentile(estimates, 0.975),
    iterations,
    seed,
  };
}
