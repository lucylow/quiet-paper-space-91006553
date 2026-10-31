// @ts-nocheck -- dense numeric array code; behaviour covered by src/test/plasma.test.ts
/** W.O.O.H.O.O. Plasma Intelligence engine — SI units, browser-side, deterministic. */

export const C = { e: 1.602176634e-19, me: 9.1093837e-31, mp: 1.67262192e-27, eps0: 8.8541878128e-12, mu0: 1.25663706212e-6, kB: 1.380649e-23, c: 2.99792458e8 };
const eV = C.e;

/* ---------- Plasma state parameters ---------- */
export interface PlasmaState { n: number; Te: number; Ti: number; B: number; A: number } // n m^-3, T eV, B tesla, ion mass number
export function plasmaParams(p: PlasmaState) {
  const mi = p.A * C.mp;
  const debye = Math.sqrt((C.eps0 * p.Te * eV) / (p.n * C.e ** 2));
  const wpe = Math.sqrt((p.n * C.e ** 2) / (C.eps0 * C.me));
  const wpi = Math.sqrt((p.n * C.e ** 2) / (C.eps0 * mi));
  const wce = (C.e * p.B) / C.me, wci = (C.e * p.B) / mi;
  const vte = Math.sqrt((p.Te * eV) / C.me), vti = Math.sqrt((p.Ti * eV) / mi);
  const rhoE = vte / wce, rhoI = vti / wci;
  const pressure = p.n * (p.Te + p.Ti) * eV;
  const beta = pressure / (p.B ** 2 / (2 * C.mu0));
  const vA = p.B / Math.sqrt(C.mu0 * p.n * mi);
  const cs = Math.sqrt((p.Te * eV) / mi);
  const ND = (4 / 3) * Math.PI * p.n * debye ** 3;
  const lnL = Math.max(2, 24 - Math.log(Math.sqrt(p.n * 1e-6) / p.Te));
  const nuEI = 2.91e-12 * p.n * lnL * p.Te ** -1.5; // NRL formulary (n in m^-3 → 2.91e-6 cm^-3)
  return { debye, wpe, wpi, wce, wci, fpe: wpe / (2 * Math.PI), vte, vti, rhoE, rhoI, beta, vA, cs, ND, lnL, nuEI, pressure, ideal: ND > 1 };
}

export const PRESETS: { name: string; s: PlasmaState }[] = [
  { name: "Tokamak core (ITER-like)", s: { n: 1e20, Te: 10000, Ti: 10000, B: 5.3, A: 2.5 } },
  { name: "Solar corona", s: { n: 1e15, Te: 100, Ti: 100, B: 1e-3, A: 1 } },
  { name: "Solar wind @1 AU", s: { n: 5e6, Te: 10, Ti: 10, B: 5e-9, A: 1 } },
  { name: "Earth ionosphere", s: { n: 1e12, Te: 0.1, Ti: 0.1, B: 5e-5, A: 16 } },
  { name: "Lab glow discharge", s: { n: 1e16, Te: 2, Ti: 0.03, B: 0.01, A: 40 } },
];

/* ---------- Boris particle pusher ---------- */
export type V3 = [number, number, number];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function borisOrbit(q: number, m: number, E: V3, B: V3, v0: V3, dt: number, steps: number) {
  let x: V3 = [0, 0, 0], v: V3 = [...v0];
  const path: V3[] = [x];
  for (let i = 0; i < steps; i++) {
    const h = (q * dt) / (2 * m);
    const vm: V3 = v.map((c, k) => c + h * E[k]) as V3;
    const t: V3 = B.map((b) => h * b) as V3, t2 = t[0] ** 2 + t[1] ** 2 + t[2] ** 2;
    const vp = vm.map((c, k) => c + cross(vm, t)[k]) as V3;
    const s: V3 = t.map((c) => (2 * c) / (1 + t2)) as V3;
    const vplus = vm.map((c, k) => c + cross(vp, s)[k]) as V3;
    v = vplus.map((c, k) => c + h * E[k]) as V3;
    x = x.map((c, k) => c + v[k] * dt) as V3;
    path.push(x);
  }
  return { path, v };
}

/* ---------- 1D ideal MHD (Rusanov flux, Brio–Wu shock tube) ---------- */
// U = [rho, rho u, rho v, By, E], with Bx constant, gamma = 2
export interface MHD { U: number[][]; nx: number; dx: number; t: number; Bx: number; g: number }
export function brioWu(nx = 200): MHD {
  const U: number[][] = [];
  for (let i = 0; i < nx; i++) {
    const L = (i + 0.5) / nx < 0.5, rho = L ? 1 : 0.125, p = L ? 1 : 0.1, By = L ? 1 : -1;
    U.push([rho, 0, 0, By, p / (2 - 1) + 0.5 * (0.75 ** 2 + By ** 2)]);
  }
  return { U, nx, dx: 1 / nx, t: 0, Bx: 0.75, g: 2 };
}
export function prim(s: MHD, u: number[]) {
  const [rho, mx, my, By, E] = u, vx = mx / rho, vy = my / rho, B2 = s.Bx ** 2 + By ** 2;
  const p = (s.g - 1) * (E - 0.5 * rho * (vx ** 2 + vy ** 2) - 0.5 * B2);
  return { rho, vx, vy, By, p, B2 };
}
function flux(s: MHD, u: number[]) {
  const { rho, vx, vy, By, p, B2 } = prim(s, u), pt = p + 0.5 * B2, E = u[4];
  return [rho * vx, rho * vx * vx + pt - s.Bx ** 2, rho * vx * vy - s.Bx * By, By * vx - s.Bx * vy, (E + pt) * vx - s.Bx * (s.Bx * vx + By * vy)];
}
function fastSpeed(s: MHD, u: number[]) {
  const { rho, vx, p, B2 } = prim(s, u), a2 = (s.g * Math.max(p, 1e-9)) / rho, b2 = B2 / rho, bx2 = s.Bx ** 2 / rho;
  return Math.abs(vx) + Math.sqrt(0.5 * (a2 + b2 + Math.sqrt(Math.max(0, (a2 + b2) ** 2 - 4 * a2 * bx2))));
}
export function mhdStep(s: MHD, cfl = 0.4): MHD {
  const { U, nx, dx } = s, smax = Math.max(...U.map((u) => fastSpeed(s, u))), dt = (cfl * dx) / smax;
  const F: number[][] = [];
  for (let i = 0; i <= nx; i++) {
    const L = U[Math.max(0, i - 1)], R = U[Math.min(nx - 1, i)], a = Math.max(fastSpeed(s, L), fastSpeed(s, R));
    const fL = flux(s, L), fR = flux(s, R);
    F.push(fL.map((f, k) => 0.5 * (f + fR[k]) - 0.5 * a * (R[k] - L[k])));
  }
  return { ...s, U: U.map((u, i) => u.map((c, k) => c - (dt / dx) * (F[i + 1][k] - F[i][k]))), t: s.t + dt };
}
export const mhdTotals = (s: MHD) => ({ mass: s.U.reduce((a, u) => a + u[0], 0) * s.dx, energy: s.U.reduce((a, u) => a + u[4], 0) * s.dx });

/* ---------- 1D electrostatic PIC: two-stream instability ---------- */
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
export interface PIC { x: number[]; v: number[]; L: number; ng: number; t: number; E: number[]; history: number[] }
export function initTwoStream(N = 4000, ng = 64, v0 = 1, vth = 0.05, seed = 2): PIC {
  const r = rng(seed), L = (2 * Math.PI) / 0.5, x: number[] = [], v: number[] = [];
  for (let i = 0; i < N; i++) {
    const x0 = (i / N) * L; x.push((x0 + 0.001 * L * Math.sin((2 * Math.PI * x0) / L) + L) % L);
    const g = Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
    v.push((i % 2 ? v0 : -v0) + vth * g);
  }
  return { x, v, L, ng, t: 0, E: Array(ng).fill(0), history: [] };
}
/** Normalized units: ωpe = 1, background ion density neutralizes electrons. */
export function picStep(s: PIC, dt = 0.1, steps = 1): PIC {
  let { x, v, t } = s; x = [...x]; v = [...v];
  const { L, ng } = s, dx = L / ng, N = x.length, hist = [...s.history];
  let E = s.E;
  for (let st = 0; st < steps; st++) {
    const rho = Array(ng).fill(0);
    for (const xi of x) { const g = xi / dx, j = Math.floor(g) % ng, f = g - Math.floor(g); rho[j] += 1 - f; rho[(j + 1) % ng] += f; }
    const norm = ng / N; for (let j = 0; j < ng; j++) rho[j] = 1 - rho[j] * norm; // ions minus electrons
    // E from Gauss's law: dE/dx = rho, zero mean
    E = Array(ng).fill(0);
    for (let j = 1; j < ng; j++) E[j] = E[j - 1] + 0.5 * (rho[j - 1] + rho[j]) * dx;
    const mean = E.reduce((a, b) => a + b) / ng; E = E.map((e) => e - mean);
    for (let i = 0; i < N; i++) {
      const g = x[i] / dx, j = Math.floor(g) % ng, f = g - Math.floor(g), Ei = E[j] * (1 - f) + E[(j + 1) % ng] * f;
      v[i] -= Ei * dt; x[i] = (((x[i] + v[i] * dt) % L) + L) % L;
    }
    t += dt; hist.push(0.5 * E.reduce((a, e) => a + e * e, 0) * dx);
  }
  return { x, v, L, ng, t, E, history: hist };
}

/* ---------- Waves & dispersion relations (normalized to ωpe, λD) ---------- */
export const DISPERSION = {
  "Langmuir (Bohm–Gross)": (k: number) => Math.sqrt(1 + 3 * k * k),
  "Ion acoustic": (k: number, mr = 1836) => k / Math.sqrt(mr * (1 + k * k)),
  "EM (light wave)": (k: number, c = 10) => Math.sqrt(1 + c * c * k * k),
} as const;

/* ---------- Turbulence spectrum ---------- */
export function fft(re: number[], im: number[]) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(a * k), wi = Math.sin(a * k), ur = re[i + k], ui = im[i + k];
      const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi, vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
    }
  }
}
/** Synthetic turbulent signal with power spectrum ∝ k^slope (random phases). */
export function synthTurbulence(n = 1024, slope = -5 / 3, seed = 4) {
  const r = rng(seed), out = Array(n).fill(0);
  for (let k = 1; k < n / 2; k++) { const A = k ** (slope / 2), ph = 2 * Math.PI * r(); for (let i = 0; i < n; i++) out[i] += A * Math.cos((2 * Math.PI * k * i) / n + ph); }
  return out;
}
export function powerSpectrum(sig: number[]) {
  const re = [...sig], im = sig.map(() => 0); fft(re, im);
  return re.slice(1, sig.length / 2).map((r, i) => ({ k: i + 1, P: r * r + im[i + 1] ** 2 }));
}
export function fitSlope(spec: { k: number; P: number }[], kmin = 4, kmax = 200) {
  const pts = spec.filter((s) => s.k >= kmin && s.k <= kmax && s.P > 0).map((s) => [Math.log(s.k), Math.log(s.P)]);
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  return pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
}

/* ---------- Fusion physics ---------- */
/** Bosch–Hale D–T reactivity <σv> in m³/s, T in keV (valid 0.2–100 keV). */
export function dtReactivity(T: number) {
  const BG = 34.3827, mrc2 = 1124656, C1 = 1.17302e-9, C2 = 1.51361e-2, C3 = 7.51886e-2, C4 = 4.60643e-3, C5 = 1.35e-2, C6 = -1.0675e-4, C7 = 1.366e-5;
  const theta = T / (1 - (T * (C2 + T * (C4 + T * C6))) / (1 + T * (C3 + T * (C5 + T * C7))));
  const xi = Math.cbrt(BG ** 2 / (4 * theta));
  return C1 * theta * Math.sqrt(xi / (mrc2 * T ** 3)) * Math.exp(-3 * xi) * 1e-6;
}
const E_ALPHA = 3.5e6 * eV, E_FUS = 17.6e6 * eV;
/** 0D power balance for a 50/50 D–T plasma. n m^-3, T keV, tauE s, V m^3. */
export function powerBalance(n: number, T: number, tauE: number, V = 830, Zeff = 1.5) {
  const sv = dtReactivity(T), nn = (n / 2) ** 2;
  const Pfus = nn * sv * E_FUS * V, Palpha = nn * sv * E_ALPHA * V;
  const W = 3 * n * T * 1e3 * eV * V, Ploss = W / tauE;
  const Pbrem = 5.35e-37 * Zeff * n * n * Math.sqrt(T) * V;
  const Paux = Math.max(0, Ploss + Pbrem - Palpha);
  return { sv, Pfus, Palpha, Ploss, Pbrem, Paux, W, Q: Paux > 0 ? Pfus / Paux : Infinity, ignited: Palpha >= Ploss + Pbrem, triple: n * T * tauE };
}
/** Lawson ignition triple product n T τE (keV·s/m³) needed at temperature T. */
export const ignitionTriple = (T: number) => (12 * T * T * 1e3 * eV) / (dtReactivity(T) * E_ALPHA);

/* ---------- Synthetic discharge database + disruption precursor detection ---------- */
export interface Shot { id: string; t: number[]; Ip: number[]; mode: number[]; disrupt: boolean; tDisrupt?: number }
export function synthShots(n = 24, seed = 11): Shot[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, s) => {
    const disrupt = r() < 0.35, td = 2 + 2 * r(), t: number[] = [], Ip: number[] = [], mode: number[] = [];
    for (let i = 0; i < 300; i++) {
      const ti = i * 0.02; t.push(ti);
      const ramp = Math.min(1, ti / 0.8), noise = (r() - 0.5) * 0.02;
      let m = 0.05 + (r() - 0.5) * 0.03, ip = 15 * ramp + noise;
      if (disrupt && ti > td - 0.5) m += 0.6 * ((ti - (td - 0.5)) / 0.5) ** 2;
      if (disrupt && ti > td) { ip = 15 * Math.exp(-(ti - td) / 0.03); m = 0; }
      Ip.push(ip); mode.push(Math.max(0, m));
    }
    return { id: `SYN-${(1000 + s).toString()}`, t, Ip, mode, disrupt, tDisrupt: disrupt ? td : undefined };
  });
}
/** Alarm when locked-mode amplitude exceeds threshold; returns warning time before disruption. */
export function detectPrecursor(shot: Shot, threshold = 0.2) {
  const i = shot.mode.findIndex((m) => m > threshold);
  const alarm = i >= 0 ? shot.t[i] : undefined;
  return { alarm, warning: alarm !== undefined && shot.tDisrupt !== undefined ? shot.tDisrupt - alarm : undefined };
}
export function evaluateDetector(shots: Shot[], threshold: number) {
  let tp = 0, fp = 0, fn = 0, tn = 0, warn = 0;
  for (const s of shots) {
    const d = detectPrecursor(s, threshold);
    if (s.disrupt) { if (d.alarm !== undefined && d.alarm < s.tDisrupt!) { tp++; warn += d.warning!; } else fn++; }
    else { if (d.alarm !== undefined) fp++; else tn++; }
  }
  return { tp, fp, fn, tn, recall: tp / Math.max(1, tp + fn), falseAlarm: fp / Math.max(1, fp + tn), meanWarning: tp ? warn / tp : 0 };
}
