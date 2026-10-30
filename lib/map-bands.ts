export type MapBand = 0 | 1 | 2 | 3 | 4;

/** Share of the busiest state. Zero stays pale so an empty state is obvious. */
export function bandFor(count: number, max: number): MapBand {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
