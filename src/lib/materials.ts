/** W.O.O.H.O.O. Materials Intelligence engine — browser-side, deterministic, demonstration-grade. */

export type Lattice = "sc" | "bcc" | "fcc" | "diamond" | "rocksalt" | "zincblende";
export type Vec3 = [number, number, number];
export interface Atom { el: string; pos: Vec3 }

/** Elemental descriptors (Pauling electronegativity, covalent radius Å, atomic mass). */
export const ELEMENTS: Record<string, { Z: number; chi: number; r: number; mass: number; color: string }> = {
  H: { Z: 1, chi: 2.2, r: 0.31, mass: 1.008, color: "var(--foreground)" },
  Li: { Z: 3, chi: 0.98, r: 1.28, mass: 6.94, color: "var(--chart-1)" },
  C: { Z: 6, chi: 2.55, r: 0.76, mass: 12.01, color: "var(--muted-foreground)" },
  N: { Z: 7, chi: 3.04, r: 0.71, mass: 14.01, color: "var(--chart-3)" },
  O: { Z: 8, chi: 3.44, r: 0.66, mass: 16.0, color: "var(--destructive)" },
  F: { Z: 9, chi: 3.98, r: 0.57, mass: 19.0, color: "var(--chart-2)" },
  Na: { Z: 11, chi: 0.93, r: 1.66, mass: 22.99, color: "var(--chart-5)" },
  Mg: { Z: 12, chi: 1.31, r: 1.41, mass: 24.31, color: "var(--chart-2)" },
  Al: { Z: 13, chi: 1.61, r: 1.21, mass: 26.98, color: "var(--muted-foreground)" },
  Si: { Z: 14, chi: 1.9, r: 1.11, mass: 28.09, color: "var(--chart-4)" },
  Cl: { Z: 17, chi: 3.16, r: 1.02, mass: 35.45, color: "var(--chart-2)" },
  K: { Z: 19, chi: 0.82, r: 2.03, mass: 39.1, color: "var(--chart-1)" },
  Ti: { Z: 22, chi: 1.54, r: 1.6, mass: 47.87, color: "var(--muted-foreground)" },
  Fe: { Z: 26, chi: 1.83, r: 1.32, mass: 55.85, color: "var(--chart-1)" },
  Ni: { Z: 28, chi: 1.91, r: 1.24, mass: 58.69, color: "var(--chart-3)" },
  Cu: { Z: 29, chi: 1.9, r: 1.32, mass: 63.55, color: "var(--chart-5)" },
  Zn: { Z: 30, chi: 1.65, r: 1.22, mass: 65.38, color: "var(--chart-3)" },
  Ga: { Z: 31, chi: 1.81, r: 1.22, mass: 69.72, color: "var(--chart-5)" },
  Ge: { Z: 32, chi: 2.01, r: 1.2, mass: 72.63, color: "var(--chart-4)" },
  As: { Z: 33, chi: 2.18, r: 1.19, mass: 74.92, color: "var(--primary)" },
  Se: { Z: 34, chi: 2.55, r: 1.2, mass: 78.97, color: "var(--chart-4)" },
  Br: { Z: 35, chi: 2.96, r: 1.2, mass: 79.9, color: "var(--destructive)" },
  In: { Z: 49, chi: 1.78, r: 1.42, mass: 114.8, color: "var(--chart-5)" },
  Sb: { Z: 51, chi: 2.05, r: 1.39, mass: 121.8, color: "var(--primary)" },
  Cs: { Z: 55, chi: 0.79, r: 2.44, mass: 132.9, color: "var(--chart-1)" },
  W: { Z: 74, chi: 2.36, r: 1.62, mass: 183.8, color: "var(--muted-foreground)" },
};

export interface Material {
  id: string; formula: string; lattice: Lattice; a: number; elements: [string, string?];
  bandGap: number; formationEnergy: number; bulkModulus: number; density: number; tag: string;
}

/** Demonstration dataset. Values are approximate literature/reference numbers, rounded. */
export const MATERIALS: Material[] = [
  { id: "demo-001", formula: "Si", lattice: "diamond", a: 5.431, elements: ["Si"], bandGap: 1.12, formationEnergy: 0, bulkModulus: 98, density: 2.33, tag: "semiconductor" },
  { id: "demo-002", formula: "Ge", lattice: "diamond", a: 5.658, elements: ["Ge"], bandGap: 0.66, formationEnergy: 0, bulkModulus: 75, density: 5.32, tag: "semiconductor" },
  { id: "demo-003", formula: "C", lattice: "diamond", a: 3.567, elements: ["C"], bandGap: 5.47, formationEnergy: 0, bulkModulus: 443, density: 3.51, tag: "insulator" },
  { id: "demo-004", formula: "GaAs", lattice: "zincblende", a: 5.653, elements: ["Ga", "As"], bandGap: 1.42, formationEnergy: -0.37, bulkModulus: 75, density: 5.32, tag: "semiconductor" },
  { id: "demo-005", formula: "InSb", lattice: "zincblende", a: 6.479, elements: ["In", "Sb"], bandGap: 0.17, formationEnergy: -0.16, bulkModulus: 47, density: 5.78, tag: "semiconductor" },
  { id: "demo-006", formula: "ZnSe", lattice: "zincblende", a: 5.668, elements: ["Zn", "Se"], bandGap: 2.7, formationEnergy: -0.85, bulkModulus: 62, density: 5.27, tag: "semiconductor" },
  { id: "demo-007", formula: "NaCl", lattice: "rocksalt", a: 5.64, elements: ["Na", "Cl"], bandGap: 8.5, formationEnergy: -2.13, bulkModulus: 24, density: 2.17, tag: "insulator" },
  { id: "demo-008", formula: "KBr", lattice: "rocksalt", a: 6.6, elements: ["K", "Br"], bandGap: 7.4, formationEnergy: -2.0, bulkModulus: 15, density: 2.75, tag: "insulator" },
  { id: "demo-009", formula: "LiF", lattice: "rocksalt", a: 4.03, elements: ["Li", "F"], bandGap: 13.6, formationEnergy: -3.2, bulkModulus: 67, density: 2.64, tag: "insulator" },
  { id: "demo-010", formula: "MgO", lattice: "rocksalt", a: 4.212, elements: ["Mg", "O"], bandGap: 7.8, formationEnergy: -3.11, bulkModulus: 160, density: 3.58, tag: "insulator" },
  { id: "demo-011", formula: "Cu", lattice: "fcc", a: 3.615, elements: ["Cu"], bandGap: 0, formationEnergy: 0, bulkModulus: 140, density: 8.96, tag: "metal" },
  { id: "demo-012", formula: "Al", lattice: "fcc", a: 4.05, elements: ["Al"], bandGap: 0, formationEnergy: 0, bulkModulus: 76, density: 2.7, tag: "metal" },
  { id: "demo-013", formula: "Ni", lattice: "fcc", a: 3.524, elements: ["Ni"], bandGap: 0, formationEnergy: 0, bulkModulus: 180, density: 8.91, tag: "metal" },
  { id: "demo-014", formula: "Fe", lattice: "bcc", a: 2.866, elements: ["Fe"], bandGap: 0, formationEnergy: 0, bulkModulus: 170, density: 7.87, tag: "metal" },
  { id: "demo-015", formula: "W", lattice: "bcc", a: 3.165, elements: ["W"], bandGap: 0, formationEnergy: 0, bulkModulus: 310, density: 19.3, tag: "metal" },
  { id: "demo-016", formula: "CsCl", lattice: "sc", a: 4.12, elements: ["Cs", "Cl"], bandGap: 8.3, formationEnergy: -2.3, bulkModulus: 18, density: 3.99, tag: "insulator" },
];

/** Fractional basis positions for each lattice (second species marked with index 1). */
const BASIS: Record<Lattice, { f: Vec3; s: 0 | 1 }[]> = {
  sc: [{ f: [0, 0, 0], s: 0 }],
  bcc: [{ f: [0, 0, 0], s: 0 }, { f: [0.5, 0.5, 0.5], s: 0 }],
  fcc: [{ f: [0, 0, 0], s: 0 }, { f: [0.5, 0.5, 0], s: 0 }, { f: [0.5, 0, 0.5], s: 0 }, { f: [0, 0.5, 0.5], s: 0 }],
  diamond: [], rocksalt: [], zincblende: [],
};
const FCC = BASIS.fcc.map((b) => b.f);
BASIS.diamond = [...FCC.map((f) => ({ f, s: 0 as const })), ...FCC.map((f) => ({ f: [f[0] + 0.25, f[1] + 0.25, f[2] + 0.25] as Vec3, s: 0 as const }))];
BASIS.zincblende = [...FCC.map((f) => ({ f, s: 0 as const })), ...FCC.map((f) => ({ f: [f[0] + 0.25, f[1] + 0.25, f[2] + 0.25] as Vec3, s: 1 as const }))];
BASIS.rocksalt = [...FCC.map((f) => ({ f, s: 0 as const })), ...FCC.map((f) => ({ f: [(f[0] + 0.5) % 1, f[1], f[2]] as Vec3, s: 1 as const }))];

/** Build an n×n×n cubic supercell. For CsCl ("sc" with two elements) a B-site sits at body centre. */
export function buildCrystal(m: Pick<Material, "lattice" | "a" | "elements">, n = 1): Atom[] {
  const basis = m.lattice === "sc" && m.elements[1] ? [{ f: [0, 0, 0] as Vec3, s: 0 as const }, { f: [0.5, 0.5, 0.5] as Vec3, s: 1 as const }] : BASIS[m.lattice];
  const atoms: Atom[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++)
    for (const b of basis) atoms.push({ el: (b.s ? m.elements[1] : m.elements[0]) ?? m.elements[0], pos: [(i + b.f[0]) * m.a, (j + b.f[1]) * m.a, (k + b.f[2]) * m.a] });
  return atoms;
}

export interface CrystalGraph { nodes: number; edges: { i: number; j: number; d: number }[]; coordination: number[]; nearest: number }
/** Periodic crystal graph: edges within cutoff (Å) under minimum-image convention in a cubic box of side L. */
export function crystalGraph(atoms: Atom[], L: number, cutoff?: number): CrystalGraph {
  const dist = (a: Vec3, b: Vec3) => Math.hypot(...a.map((v, k) => { let d = v - b[k]; d -= L * Math.round(d / L); return d; }) as Vec3);
  let nearest = Infinity;
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) nearest = Math.min(nearest, dist(atoms[i].pos, atoms[j].pos));
  const rc = cutoff ?? nearest * 1.1;
  const edges: CrystalGraph["edges"] = [], coordination = atoms.map(() => 0);
  for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
    const d = dist(atoms[i].pos, atoms[j].pos);
    if (d <= rc) { edges.push({ i, j, d }); coordination[i]++; coordination[j]++; }
  }
  return { nodes: atoms.length, edges, coordination, nearest };
}

/** Structure validation: overlapping atoms and implausibly short bonds vs covalent radii. */
export function validateStructure(atoms: Atom[], L: number) {
  const g = crystalGraph(atoms, L);
  const issues: string[] = [];
  g.edges.forEach(({ i, j, d }) => {
    const min = 0.6 * (ELEMENTS[atoms[i].el].r + ELEMENTS[atoms[j].el].r);
    if (d < min) issues.push(`${atoms[i].el}${i}–${atoms[j].el}${j} too close (${d.toFixed(2)} Å)`);
  });
  return { valid: issues.length === 0, issues };
}

export const density = (m: Material) => {
  const atoms = buildCrystal(m, 1), mass = atoms.reduce((s, a) => s + ELEMENTS[a.el].mass, 0);
  return (mass * 1.66054) / m.a ** 3; // g/cm³
};

/* ---------- Property prediction (composition + structure descriptors, kernel ridge) ---------- */
const LATTICES: Lattice[] = ["sc", "bcc", "fcc", "diamond", "rocksalt", "zincblende"];
export function featurize(m: Pick<Material, "elements" | "lattice" | "a">): number[] {
  const els = m.elements.filter(Boolean) as string[];
  const d = els.map((e) => ELEMENTS[e]);
  const chiMean = d.reduce((s, x) => s + x.chi, 0) / d.length;
  const chiDiff = d.length > 1 ? Math.abs(d[0].chi - d[1].chi) : 0;
  const rMean = d.reduce((s, x) => s + x.r, 0) / d.length;
  const zMean = d.reduce((s, x) => s + x.Z, 0) / d.length / 50;
  const cn = crystalGraph(buildCrystal({ ...m, a: m.a }, 2), m.a * 2).coordination[0] / 12;
  return [chiMean / 4, chiDiff / 3, rMean / 2.5, zMean, cn, m.a / 7, ...LATTICES.map((l) => (l === m.lattice ? 0.3 : 0))];
}
const sqd = (a: number[], b: number[]) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);

export type Target = "bandGap" | "formationEnergy" | "bulkModulus";
export interface Model { X: number[][]; y: number[]; alpha: number[]; gamma: number; mean: number }
export function trainKRR(rows: Material[], target: Target, gamma = 8, lambda = 0.02): Model {
  const X = rows.map(featurize), y = rows.map((r) => r[target]), n = X.length;
  const mean = y.reduce((s, v) => s + v, 0) / n;
  const K = X.map((a, i) => X.map((b, j) => Math.exp(-gamma * sqd(a, b)) + (i === j ? lambda : 0)));
  return { X, y, gamma, mean, alpha: solve(K, y.map((v) => v - mean)) };
}
export function predict(model: Model, m: Pick<Material, "elements" | "lattice" | "a">) {
  const x = featurize(m);
  const k = model.X.map((xi) => Math.exp(-model.gamma * sqd(x, xi)));
  const value = model.mean + k.reduce((s, v, i) => s + v * model.alpha[i], 0);
  const support = Math.max(...k); // kernel similarity to closest training point
  const nn = Math.min(...model.X.map((xi) => Math.sqrt(sqd(x, xi))));
  return { value, uncertainty: (1 - support) * (Math.max(...model.y) - Math.min(...model.y)) * 0.5, ood: nn > 0.35, nnDistance: nn };
}
/** Leave-one-out benchmark: MAE of KRR vs. predicting the training mean. */
export function benchmark(rows: Material[], target: Target) {
  let mae = 0, base = 0;
  rows.forEach((r, i) => {
    const train = rows.filter((_, j) => j !== i);
    const m = trainKRR(train, target);
    mae += Math.abs(predict(m, r).value - r[target]);
    base += Math.abs(m.mean - r[target]);
  });
  return { mae: mae / rows.length, baseline: base / rows.length };
}
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/* ---------- Electronic structure: tight-binding s-band on a cubic lattice ---------- */
export function tbEnergy(lattice: "sc" | "bcc" | "fcc", k: Vec3, t = 1): number {
  const [x, y, z] = k.map((v) => v * Math.PI) as Vec3; // k in units of π/a
  if (lattice === "sc") return -2 * t * (Math.cos(x) + Math.cos(y) + Math.cos(z));
  if (lattice === "bcc") return -8 * t * Math.cos(x / 2) * Math.cos(y / 2) * Math.cos(z / 2);
  return -4 * t * (Math.cos(x / 2) * Math.cos(y / 2) + Math.cos(y / 2) * Math.cos(z / 2) + Math.cos(z / 2) * Math.cos(x / 2));
}
export const KPATH: { label: string; k: Vec3 }[] = [
  { label: "Γ", k: [0, 0, 0] }, { label: "X", k: [1, 0, 0] }, { label: "M", k: [1, 1, 0] }, { label: "Γ", k: [0, 0, 0] }, { label: "R", k: [1, 1, 1] },
];
export function bandPath(lattice: "sc" | "bcc" | "fcc", t = 1, steps = 30) {
  const pts: { s: number; e: number }[] = [], ticks: { s: number; label: string }[] = [];
  let s = 0;
  for (let seg = 0; seg < KPATH.length - 1; seg++) {
    const A = KPATH[seg].k, B = KPATH[seg + 1].k, len = Math.hypot(...A.map((v, i) => B[i] - v));
    ticks.push({ s, label: KPATH[seg].label });
    for (let i = 0; i < steps; i++) {
      const f = i / steps, k = A.map((v, j) => v + f * (B[j] - v)) as Vec3;
      pts.push({ s: s + f * len, e: tbEnergy(lattice, k, t) });
    }
    s += len;
  }
  ticks.push({ s, label: KPATH[KPATH.length - 1].label });
  pts.push({ s, e: tbEnergy(lattice, KPATH[KPATH.length - 1].k, t) });
  return { pts, ticks };
}
/** Density of states by uniform Brillouin-zone sampling. Returns normalized histogram. */
export function dos(lattice: "sc" | "bcc" | "fcc", t = 1, n = 24, bins = 40) {
  const E: number[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++)
    E.push(tbEnergy(lattice, [-1 + (2 * (i + 0.5)) / n, -1 + (2 * (j + 0.5)) / n, -1 + (2 * (k + 0.5)) / n].map((v) => (lattice === "sc" ? v : v * 2)) as Vec3, t));
  const lo = Math.min(...E), hi = Math.max(...E), w = (hi - lo) / bins;
  const h = Array(bins).fill(0);
  E.forEach((e) => h[Math.min(bins - 1, Math.floor((e - lo) / w))]++);
  return { lo, hi, width: hi - lo, hist: h.map((c, i) => ({ e: lo + (i + 0.5) * w, g: c / (E.length * w) })) };
}

/* ---------- Molecular dynamics: 2D Lennard-Jones, velocity Verlet, periodic box ---------- */
export interface MDState { x: number[]; y: number[]; vx: number[]; vy: number[]; L: number; step: number }
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
export function initMD(nSide = 6, spacing = 1.12, T = 0.5, seed = 1): MDState {
  const r = rng(seed), x: number[] = [], y: number[] = [], vx: number[] = [], vy: number[] = [];
  for (let i = 0; i < nSide; i++) for (let j = 0; j < nSide; j++) { x.push((i + 0.5) * spacing); y.push((j + 0.5) * spacing); vx.push(r() - 0.5); vy.push(r() - 0.5); }
  const n = x.length, mx = vx.reduce((a, b) => a + b) / n, my = vy.reduce((a, b) => a + b) / n;
  for (let i = 0; i < n; i++) { vx[i] -= mx; vy[i] -= my; }
  const k = vx.reduce((s, v, i) => s + v * v + vy[i] ** 2, 0) / (2 * n), f = Math.sqrt(T / k);
  return { x, y, vx: vx.map((v) => v * f), vy: vy.map((v) => v * f), L: nSide * spacing, step: 0 };
}
const RC = 2.5;
export function ljForces(s: MDState) {
  const n = s.x.length, fx = Array(n).fill(0), fy = Array(n).fill(0);
  const shift = 4 * (RC ** -12 - RC ** -6);
  let pe = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j];
    dx -= s.L * Math.round(dx / s.L); dy -= s.L * Math.round(dy / s.L);
    const r2 = dx * dx + dy * dy; if (r2 > RC * RC) continue;
    const ir6 = 1 / r2 ** 3, f = (24 * ir6 * (2 * ir6 - 1)) / r2;
    pe += 4 * ir6 * (ir6 - 1) - shift;
    fx[i] += f * dx; fy[i] += f * dy; fx[j] -= f * dx; fy[j] -= f * dy;
  }
  return { fx, fy, pe };
}
export function mdEnergy(s: MDState) {
  const ke = s.vx.reduce((a, v, i) => a + 0.5 * (v * v + s.vy[i] ** 2), 0), pe = ljForces(s).pe, n = s.x.length;
  return { ke, pe, total: ke + pe, T: ke / n };
}
export function mdStep(s: MDState, dt = 0.004, steps = 1, thermostatT?: number): MDState {
  const x = [...s.x], y = [...s.y], vx = [...s.vx], vy = [...s.vy], n = x.length;
  let F = ljForces({ ...s, x, y });
  for (let t = 0; t < steps; t++) {
    for (let i = 0; i < n; i++) {
      vx[i] += 0.5 * dt * F.fx[i]; vy[i] += 0.5 * dt * F.fy[i];
      x[i] = (((x[i] + dt * vx[i]) % s.L) + s.L) % s.L; y[i] = (((y[i] + dt * vy[i]) % s.L) + s.L) % s.L;
    }
    F = ljForces({ ...s, x, y });
    for (let i = 0; i < n; i++) { vx[i] += 0.5 * dt * F.fx[i]; vy[i] += 0.5 * dt * F.fy[i]; }
    if (thermostatT !== undefined) { // Berendsen
      const T = vx.reduce((a, v, i) => a + 0.5 * (v * v + vy[i] ** 2), 0) / n, lam = Math.sqrt(1 + 0.05 * (thermostatT / Math.max(T, 1e-6) - 1));
      for (let i = 0; i < n; i++) { vx[i] *= lam; vy[i] *= lam; }
    }
  }
  return { x, y, vx, vy, L: s.L, step: s.step + steps };
}
/** Radial distribution function g(r) for a 2D configuration. */
export function rdf(s: MDState, bins = 30, rmax = 3) {
  const n = s.x.length, h = Array(bins).fill(0), dr = rmax / bins;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j];
    dx -= s.L * Math.round(dx / s.L); dy -= s.L * Math.round(dy / s.L);
    const r = Math.hypot(dx, dy); if (r < rmax) h[Math.floor(r / dr)] += 2;
  }
  const rho = n / s.L ** 2;
  return h.map((c, i) => ({ r: (i + 0.5) * dr, g: c / (n * rho * 2 * Math.PI * (i + 0.5) * dr * dr) }));
}

/* ---------- Thermodynamics: binary convex hull, elasticity, Debye heat capacity ---------- */
export interface HullPoint { x: number; e: number; label: string }
export function lowerHull(points: HullPoint[]): HullPoint[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.e - b.e), h: HullPoint[] = [];
  for (const q of p) {
    while (h.length >= 2) {
      const [a, b] = [h[h.length - 2], h[h.length - 1]];
      if ((b.x - a.x) * (q.e - a.e) - (b.e - a.e) * (q.x - a.x) <= 0) h.pop(); else break;
    }
    h.push(q);
  }
  return h;
}
export function energyAboveHull(points: HullPoint[], q: HullPoint) {
  const h = lowerHull(points);
  for (let i = 0; i < h.length - 1; i++) if (q.x >= h[i].x && q.x <= h[i + 1].x) {
    const f = h[i + 1].x === h[i].x ? 0 : (q.x - h[i].x) / (h[i + 1].x - h[i].x);
    return q.e - (h[i].e + f * (h[i + 1].e - h[i].e));
  }
  return NaN;
}
/** Voigt–Reuss–Hill moduli (GPa) for a cubic crystal from C11, C12, C44. */
export function cubicElastic(C11: number, C12: number, C44: number) {
  const K = (C11 + 2 * C12) / 3;
  const GV = (C11 - C12 + 3 * C44) / 5, GR = (5 * (C11 - C12) * C44) / (4 * C44 + 3 * (C11 - C12));
  const G = (GV + GR) / 2, E = (9 * K * G) / (3 * K + G), nu = (3 * K - 2 * G) / (2 * (3 * K + G));
  const stable = C11 - C12 > 0 && C11 + 2 * C12 > 0 && C44 > 0;
  return { K, G, E, nu, pugh: K / G, ductile: K / G > 1.75, zener: (2 * C44) / (C11 - C12), stable };
}
/** Debye molar heat capacity Cv (J/mol·K) per atom. */
export function debyeCv(T: number, thetaD: number) {
  if (T <= 0) return 0;
  const xD = thetaD / T, N = 400, h = xD / N;
  let I = 0;
  for (let i = 1; i <= N; i++) { const x = (i - 0.5) * h; I += (x ** 4 * Math.exp(x)) / (Math.exp(x) - 1) ** 2; }
  return 9 * 8.314 * (T / thetaD) ** 3 * I * h;
}

/* ---------- Generative inverse design: guided random search over substitutions ---------- */
export function inverseDesign(target: { bandGap: number }, n = 200, seed = 7) {
  const r = rng(seed), model = trainKRR(MATERIALS, "bandGap"), stab = trainKRR(MATERIALS, "formationEnergy");
  const cations = ["Li", "Na", "K", "Mg", "Zn", "Ga", "In", "Al"], anions = ["F", "Cl", "Br", "O", "Se", "As", "Sb", "N"];
  const seen = new Set<string>(), out: { formula: string; lattice: Lattice; a: number; gap: number; unc: number; ef: number; ood: boolean; score: number }[] = [];
  for (let i = 0; i < n; i++) {
    const A = cations[Math.floor(r() * cations.length)], B = anions[Math.floor(r() * anions.length)];
    const lattice: Lattice = r() < 0.5 ? "rocksalt" : "zincblende";
    const bond = ELEMENTS[A].r + ELEMENTS[B].r, a = lattice === "rocksalt" ? 2 * bond * 0.92 : (4 * bond) / Math.sqrt(3);
    const key = A + B + lattice; if (seen.has(key) || MATERIALS.some((m) => m.formula === A + B)) continue; seen.add(key);
    const p = predict(model, { elements: [A, B], lattice, a }), e = predict(stab, { elements: [A, B], lattice, a });
    out.push({ formula: A + B, lattice, a, gap: p.value, unc: p.uncertainty, ef: e.value, ood: p.ood, score: -Math.abs(p.value - target.bandGap) - 0.5 * Math.max(0, e.value) - 0.3 * p.uncertainty });
  }
  return out.sort((a, b) => b.score - a.score);
}
