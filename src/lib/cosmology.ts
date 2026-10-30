// Cosmology Intelligence engine: background cosmology, synthetic supernova
// inference (Metropolis MCMC), model comparison and a toy 2D N-body cosmic web.

export type ModelId = "flat-lcdm" | "curved-lcdm" | "wcdm";
export interface CosmoParams { H0: number; Om: number; Ol: number; w: number }

export const MODELS: Record<ModelId, { name: string; free: (keyof CosmoParams)[]; assumptions: string }> = {
  "flat-lcdm": { name: "Flat Λ-CDM", free: ["Om"], assumptions: "Ωk = 0, w = −1, ΩΛ = 1 − Ωm" },
  "curved-lcdm": { name: "Curved Λ-CDM", free: ["Om", "Ol"], assumptions: "w = −1, Ωk = 1 − Ωm − ΩΛ" },
  wcdm: { name: "Flat wCDM", free: ["Om", "w"], assumptions: "Ωk = 0, constant dark-energy equation of state w" },
};

const C = 299792.458; // km/s

export function normalize(model: ModelId, p: CosmoParams): CosmoParams {
  if (model === "flat-lcdm") return { ...p, Ol: 1 - p.Om, w: -1 };
  if (model === "wcdm") return { ...p, Ol: 1 - p.Om };
  return { ...p, w: -1 };
}

export function E(z: number, p: CosmoParams) {
  const a = 1 + z, Ok = 1 - p.Om - p.Ol;
  return Math.sqrt(p.Om * a ** 3 + Ok * a ** 2 + p.Ol * a ** (3 * (1 + p.w)));
}

/** Comoving distance in Mpc (Simpson integration). */
export function comovingDistance(z: number, p: CosmoParams, n = 200) {
  if (z <= 0) return 0;
  const h = z / n;
  let s = 1 / E(0, p) + 1 / E(z, p);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) / E(i * h, p);
  return (C / p.H0) * (s * h) / 3;
}

export function luminosityDistance(z: number, p: CosmoParams) {
  const Dc = comovingDistance(z, p), Ok = 1 - p.Om - p.Ol, DH = C / p.H0;
  let Dm = Dc;
  if (Ok > 1e-8) Dm = (DH / Math.sqrt(Ok)) * Math.sinh((Math.sqrt(Ok) * Dc) / DH);
  else if (Ok < -1e-8) Dm = (DH / Math.sqrt(-Ok)) * Math.sin((Math.sqrt(-Ok) * Dc) / DH);
  return (1 + z) * Dm;
}

export const distanceModulus = (z: number, p: CosmoParams) => 5 * Math.log10(luminosityDistance(z, p)) + 25;

/** Age of the universe in Gyr. */
export function age(p: CosmoParams, n = 2000) {
  // t0 = ∫0^1 da / (a H(a)); substitute to avoid singularity at a=0
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n, z = 1 / a - 1;
    s += 1 / (a * E(z, p)) / n;
  }
  return (s * 977.8) / p.H0;
}

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
}

export interface SN { z: number; mu: number; sigma: number }

/** DEMO DATA: synthetic Type Ia supernova distance moduli from a known truth. */
export function syntheticSurvey(truth: CosmoParams, n = 60, sigma = 0.15, seed = 7): SN[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const z = 0.02 + (1.5 * (i + r())) / n;
    return { z, mu: distanceModulus(z, truth) + sigma * gauss(r), sigma };
  });
}

export function chi2(data: SN[], p: CosmoParams) {
  return data.reduce((s, d) => s + ((d.mu - distanceModulus(d.z, p)) / d.sigma) ** 2, 0);
}

const PRIORS: Record<string, [number, number]> = { Om: [0.01, 1], Ol: [0, 1.5], w: [-2.5, 0] };

export interface Chain { samples: Record<string, number[]>; acceptance: number; best: CosmoParams; bestChi2: number }

export function mcmc(model: ModelId, data: SN[], steps = 3000, seed = 3): Chain {
  const r = rng(seed), free = MODELS[model].free;
  let cur = normalize(model, { H0: 70, Om: 0.5, Ol: 0.5, w: -1 });
  let curC = chi2(data, cur), best = cur, bestC = curC, acc = 0;
  const samples: Record<string, number[]> = Object.fromEntries(free.map((k) => [k, []]));
  const burn = Math.floor(steps / 4);
  for (let i = 0; i < steps; i++) {
    const prop = { ...cur };
    for (const k of free) prop[k] += 0.03 * gauss(r);
    const ok = free.every((k) => prop[k] >= PRIORS[k]![0] && prop[k] <= PRIORS[k]![1]);
    const np = normalize(model, prop);
    if (ok) {
      const c = chi2(data, np);
      if (Math.log(r()) < (curC - c) / 2) { cur = np; curC = c; acc++; }
      if (c < bestC) { best = np; bestC = c; }
    }
    if (i >= burn) for (const k of free) samples[k]!.push(cur[k]);
  }
  return { samples, acceptance: acc / steps, best, bestChi2: bestC };
}

export function stats(xs: number[]) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  return { mean: m, sd };
}

/** Bayesian information criterion: lower is preferred; penalizes extra parameters. */
export const bic = (chi: number, k: number, n: number) => chi + k * Math.log(n);

// ---------- Toy 2D N-body with cosmic-web classification ----------
export interface NBody { x: Float64Array; y: Float64Array; vx: Float64Array; vy: Float64Array; n: number }

export function initParticles(side = 20, amp = 0.02, seed = 11): NBody {
  const r = rng(seed), n = side * side;
  const b: NBody = { x: new Float64Array(n), y: new Float64Array(n), vx: new Float64Array(n), vy: new Float64Array(n), n };
  for (let i = 0; i < n; i++) {
    b.x[i] = ((i % side) + 0.5) / side + amp * gauss(r);
    b.y[i] = (Math.floor(i / side) + 0.5) / side + amp * gauss(r);
  }
  return b;
}

const wrap = (d: number) => d - Math.round(d);

/** Leapfrog step with softened direct-sum gravity in a periodic unit box. */
export function step(b: NBody, dt = 0.002, G = 0.0005, eps = 0.01) {
  const ax = new Float64Array(b.n), ay = new Float64Array(b.n);
  for (let i = 0; i < b.n; i++) for (let j = i + 1; j < b.n; j++) {
    const dx = wrap(b.x[j]! - b.x[i]!), dy = wrap(b.y[j]! - b.y[i]!);
    const inv = 1 / Math.pow(dx * dx + dy * dy + eps * eps, 1.5);
    ax[i]! += G * dx * inv; ay[i]! += G * dy * inv; ax[j]! -= G * dx * inv; ay[j]! -= G * dy * inv;
  }
  for (let i = 0; i < b.n; i++) {
    b.vx[i] = (b.vx[i]! + ax[i]! * dt) * 0.995; b.vy[i] = (b.vy[i]! + ay[i]! * dt) * 0.995;
    b.x[i] = (((b.x[i]! + b.vx[i]! * dt) % 1) + 1) % 1; b.y[i] = (((b.y[i]! + b.vy[i]! * dt) % 1) + 1) % 1;
  }
}

export type WebClass = "void" | "filament" | "cluster";
/** Grid density contrast δ and threshold classification. */
export function classifyWeb(b: NBody, g = 10) {
  const d = new Float64Array(g * g);
  for (let i = 0; i < b.n; i++) d[Math.min(g - 1, Math.floor(b.y[i]! * g)) * g + Math.min(g - 1, Math.floor(b.x[i]! * g))]! += 1;
  const mean = b.n / (g * g);
  const cells = Array.from(d, (c) => {
    const delta = c / mean - 1;
    const cls: WebClass = delta > 1 ? "cluster" : delta < -0.5 ? "void" : "filament";
    return { delta, cls };
  });
  const frac = (k: WebClass) => cells.filter((c) => c.cls === k).length / cells.length;
  const variance = cells.reduce((s, c) => s + c.delta ** 2, 0) / cells.length;
  return { cells, g, variance, fractions: { void: frac("void"), filament: frac("filament"), cluster: frac("cluster") } };
}
