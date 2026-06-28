// Pure, framework-agnostic model for the AGI-timeline distribution.
// No React / DOM here — safe to unit-test and reuse from the worker if needed.

export const MIN_YEAR = 2026;
export const MAX_YEAR = 2200;

export interface DistPoint {
  year: number;
  p: number; // cumulative probability AGI has arrived by `year`, 0..1
}

export interface Increment {
  label: string;
  p: number; // probability mass in this interval
  never?: boolean;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Sort points by year and force the cumulative curve to be non-decreasing. */
export function normalize(points: DistPoint[]): DistPoint[] {
  const sorted = [...points].sort((a, b) => a.year - b.year);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].p < sorted[i - 1].p) sorted[i] = { ...sorted[i], p: sorted[i - 1].p };
  }
  return sorted;
}

/** Set point `i`'s probability, pushing neighbours so the curve stays monotonic. */
export function setProbAt(points: DistPoint[], i: number, p: number): DistPoint[] {
  const next = points.map((pt, j) => (j === i ? { ...pt, p: clamp(p, 0, 1) } : pt));
  for (let j = i + 1; j < next.length; j++) if (next[j].p < next[i].p) next[j] = { ...next[j], p: next[i].p };
  for (let j = i - 1; j >= 0; j--) if (next[j].p > next[i].p) next[j] = { ...next[j], p: next[i].p };
  return next;
}

/**
 * Move point `i` to a new year (kept unique, clamped, re-sorted).
 * Returns the new array plus the index the moved point now lives at.
 */
export function setYearAt(
  points: DistPoint[],
  i: number,
  year: number,
  minYear: number,
  maxYear: number,
): { points: DistPoint[]; index: number } {
  let y = clamp(Math.round(year), minYear, maxYear);
  while (points.some((pt, j) => j !== i && pt.year === y)) y += 1;
  const next = normalize(points.map((pt, j) => (j === i ? { ...pt, year: y } : pt)));
  return { points: next, index: next.findIndex((pt) => pt.year === y) };
}

/** Interpolate cumulative probability at an arbitrary year from the anchors. */
export function probAt(points: DistPoint[], year: number): number {
  if (points.length === 0) return 0;
  if (year <= points[0].year) return points[0].p;
  for (let i = 1; i < points.length; i++) {
    if (year <= points[i].year) {
      const t = (year - points[i - 1].year) / (points[i].year - points[i - 1].year);
      return points[i - 1].p + t * (points[i].p - points[i - 1].p);
    }
  }
  return points[points.length - 1].p;
}

/**
 * Insert a new anchor after `afterIndex`, with probability interpolated from the
 * current curve so the shape doesn't jump. Returns the new array + the new index.
 */
export function insertYear(
  points: DistPoint[],
  afterIndex: number,
  minYear: number,
  maxYear: number,
): { points: DistPoint[]; index: number } {
  const i = afterIndex >= 0 ? afterIndex : points.length - 1;
  let year =
    i < points.length - 1
      ? Math.round((points[i].year + points[i + 1].year) / 2)
      : points[points.length - 1].year + 10;
  year = clamp(year, minYear, maxYear);
  while (points.some((pt) => pt.year === year)) year += 1;
  const next = normalize([...points, { year, p: probAt(points, year) }]);
  return { points: next, index: next.findIndex((pt) => pt.year === year) };
}

/** Force a curve to start at (minYear, 0) — AGI hasn't happened yet, so probability is 0 today. */
export function anchorAtZero(points: DistPoint[], minYear: number): DistPoint[] {
  if (points.length === 0) return points;
  if (points[0].year > minYear) return [{ year: minYear, p: 0 }, ...points];
  return [{ ...points[0], p: 0 }, ...points.slice(1)];
}

/** Remove a point (no-op below 2 points so a curve always remains). */
export function removeAt(points: DistPoint[], i: number): DistPoint[] {
  if (points.length <= 2) return points;
  return points.filter((_, j) => j !== i);
}

/** Per-interval probability mass (the implied "PDF"), including the trailing "never" tail. */
export function increments(points: DistPoint[]): Increment[] {
  const out: Increment[] = [];
  let prev = 0;
  points.forEach((pt, i) => {
    out.push({ label: i === 0 ? `≤${pt.year}` : `${points[i - 1].year}–${pt.year}`, p: Math.max(0, pt.p - prev) });
    prev = pt.p;
  });
  out.push({ label: "never", p: Math.max(0, 1 - (points[points.length - 1]?.p ?? 0)), never: true });
  return out;
}
