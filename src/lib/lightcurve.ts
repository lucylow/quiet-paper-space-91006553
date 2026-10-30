/**
 * Transit light-curve simulation and detection — pure functions, no React.
 * Extracted from the route component so the logic is testable and reusable
 * by future backend adapters.
 */

export interface LightCurvePoint {
  t: number;
  f: number;
}

export interface LightCurveParams {
  period: number;
  radius: number;
  noise: number;
  days?: number;
  samples?: number;
  transitDuration?: number;
  seed?: number;
}

export interface LightCurveResult {
  points: LightCurvePoint[];
  depth: number;
  snr: number;
  detected: boolean;
  dipStarts: number[];
  recoveredPeriod: number | null;
}

/** Deterministic LCG so simulations are reproducible per parameter set. */
export function createRng(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
}

export function simulateLightCurve({
  period,
  radius,
  noise,
  days = 15,
  samples = 400,
  transitDuration = 0.15,
  seed = 7,
}: LightCurveParams): LightCurveResult {
  const rnd = createRng(seed);
  const depth = radius * radius;

  const points: LightCurvePoint[] = Array.from({ length: samples }, (_, i) => {
    const t = (i / samples) * days;
    const phase = (t % period) / period;
    const inTransit = phase < transitDuration / period;
    return { t, f: 1 - (inTransit ? depth : 0) + rnd() * noise };
  });

  const dipStarts = findDipStarts(points, depth);
  const recoveredPeriod = recoverPeriod(dipStarts);
  const snr = depth / noise;

  return {
    points,
    depth,
    snr,
    detected: snr > 3,
    dipStarts,
    recoveredPeriod,
  };
}

/** Start times of contiguous below-half-depth segments. */
export function findDipStarts(points: LightCurvePoint[], depth: number): number[] {
  const starts: number[] = [];
  let inDip = false;
  for (const p of points) {
    const low = p.f < 1 - depth / 2;
    if (low && !inDip) starts.push(p.t);
    inDip = low;
  }
  return starts;
}

/** Mean gap between consecutive dips, ignoring sub-day artifacts. */
export function recoverPeriod(dipStarts: number[]): number | null {
  const gaps = dipStarts
    .slice(1)
    .map((t, i) => t - (dipStarts[i] ?? 0))
    .filter((g) => g > 0.5);
  return gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
}

export function lightCurveToCsv(points: LightCurvePoint[]): string {
  return "time,flux\n" + points.map((p) => `${p.t.toFixed(4)},${p.f.toFixed(6)}`).join("\n");
}
