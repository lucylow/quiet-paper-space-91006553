// Particle physics engine: synthetic collision events, helix track reconstruction,
// particle ID, jet clustering, invariant mass, conservation checks and anomaly scoring.
// All generated events are SYNTHETIC demonstration data.

export const B_FIELD = 3.8; // Tesla (CMS-like solenoid)
export const LAYERS = [0.04, 0.07, 0.11, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0, 1.1]; // tracker radii, m
export const ECAL_R = 1.3;
export const HCAL_R = 1.8;
export const MUON_R = 2.6;

export type Species = "electron" | "muon" | "photon" | "pion" | "kaon" | "proton" | "neutron";
export const MASS: Record<Species, number> = {
  electron: 0.000511, muon: 0.10566, photon: 0, pion: 0.13957, kaon: 0.49368, proton: 0.93827, neutron: 0.93957,
};

export interface Particle {
  id: number; species: Species; charge: -1 | 0 | 1;
  pt: number; eta: number; phi: number; // GeV, pseudorapidity, rad
  ecal: number; hcal: number; muonHits: number;
}
export interface Hit { id: number; layer: number; r: number; phi: number; truth: number }
export type EventKind = "Z→μμ" | "Z→ee" | "H→γγ" | "QCD dijet" | "W→μν" | "anomalous";
export interface CollisionEvent { id: string; kind: EventKind; synthetic: true; particles: Particle[]; hits: Hit[] }

// ---------- RNG ----------
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

// ---------- Kinematics ----------
export function fourVec(p: Pick<Particle, "pt" | "eta" | "phi" | "species">) {
  const px = p.pt * Math.cos(p.phi), py = p.pt * Math.sin(p.phi), pz = p.pt * Math.sinh(p.eta);
  const m = MASS[p.species];
  return { E: Math.sqrt(px * px + py * py + pz * pz + m * m), px, py, pz };
}
export function invariantMass(ps: Pick<Particle, "pt" | "eta" | "phi" | "species">[]) {
  const s = ps.map(fourVec).reduce((a, v) => ({ E: a.E + v.E, px: a.px + v.px, py: a.py + v.py, pz: a.pz + v.pz }), { E: 0, px: 0, py: 0, pz: 0 });
  return Math.sqrt(Math.max(0, s.E ** 2 - s.px ** 2 - s.py ** 2 - s.pz ** 2));
}
/** pT [GeV] = 0.3 · B [T] · R [m] */
export const ptFromRadius = (R: number, B = B_FIELD) => 0.3 * B * R;
export const radiusFromPt = (pt: number, B = B_FIELD) => pt / (0.3 * B);
/** Azimuth of a track from the origin at radius r: φ(r) = φ0 − q·asin(r / 2R) */
export function hitPhi(phi0: number, q: number, R: number, r: number) {
  const x = r / (2 * R);
  return x >= 1 ? NaN : phi0 - q * Math.asin(x);
}

// ---------- Event generation ----------
function deposit(sp: Species, E: number, r: () => number) {
  const n = (f: number) => Math.max(0, E * f * (1 + 0.08 * gauss(r)));
  switch (sp) {
    case "electron": case "photon": return { ecal: n(0.97), hcal: n(0.02), muonHits: 0 };
    case "muon": return { ecal: Math.min(E, 0.3), hcal: Math.min(E, 1.5), muonHits: 4 };
    case "neutron": return { ecal: n(0.05), hcal: n(0.85), muonHits: 0 };
    default: return { ecal: n(0.3), hcal: n(0.6), muonHits: 0 };
  }
}
function makeParticle(id: number, sp: Species, charge: -1 | 0 | 1, pt: number, eta: number, phi: number, r: () => number): Particle {
  const E = fourVec({ pt, eta, phi, species: sp }).E;
  return { id, species: sp, charge, pt, eta, phi, ...deposit(sp, E, r) };
}
/** Two-body decay of a resonance of mass M at rest in the transverse plane (back-to-back). */
function twoBody(M: number, r: () => number) {
  const phi = r() * 2 * Math.PI, eta1 = gauss(r) * 0.8, eta2 = gauss(r) * 0.8;
  // pick pT so that m(1,2) = M for massless daughters: M² = 2pT²(cosh Δη + 1)
  const pt = M / Math.sqrt(2 * (Math.cosh(eta1 - eta2) + 1));
  return [{ pt, eta: eta1, phi }, { pt, eta: eta2, phi: phi + Math.PI }];
}

export function generateEvent(kind: EventKind, seed: number): CollisionEvent {
  const r = rng(seed);
  const ps: Particle[] = [];
  let id = 0;
  const add = (sp: Species, q: -1 | 0 | 1, pt: number, eta: number, phi: number) => ps.push(makeParticle(id++, sp, q, pt, eta, phi, r));
  if (kind === "Z→μμ" || kind === "Z→ee" || kind === "H→γγ" || kind === "anomalous") {
    const M = kind === "H→γγ" ? 125.1 + 1.7 * gauss(r) : kind === "anomalous" ? 750 + 50 * gauss(r) : 91.19 + 2.5 * gauss(r);
    const sp: Species = kind === "Z→μμ" || kind === "anomalous" ? "muon" : kind === "Z→ee" ? "electron" : "photon";
    const [a, b] = twoBody(M, r);
    const q: -1 | 0 | 1 = sp === "photon" ? 0 : -1;
    add(sp, q, a!.pt, a!.eta, a!.phi);
    add(sp, (q === 0 ? 0 : 1), b!.pt, b!.eta, b!.phi);
  } else if (kind === "W→μν") {
    const pt = 30 + 10 * r(), phi = r() * 2 * Math.PI;
    add("muon", r() > 0.5 ? 1 : -1, pt, gauss(r), phi);
    // neutrino is invisible -> appears as missing ET (not stored)
  } else {
    // QCD dijet: two collimated sprays of hadrons
    const phi = r() * 2 * Math.PI, jetPt = 40 + 60 * r();
    for (const [jphi, jeta] of [[phi, gauss(r)], [phi + Math.PI, gauss(r)]] as const) {
      const n = 6 + Math.floor(r() * 6);
      for (let i = 0; i < n; i++) {
        const sp: Species = (["pion", "pion", "pion", "kaon", "proton", "neutron", "photon"] as Species[])[Math.floor(r() * 7)]!;
        const q: -1 | 0 | 1 = sp === "photon" || sp === "neutron" ? 0 : r() > 0.5 ? 1 : -1;
        add(sp, q, (jetPt / n) * (0.5 + r()), jeta + 0.15 * gauss(r), jphi + 0.15 * gauss(r));
      }
    }
  }
  // soft underlying event (pile-up pions)
  // balance charge of hadronic activity with one extra pion per unit (proton beams' net charge goes down the beampipe)
  if (kind === "QCD dijet") {
    let net = ps.reduce((a, p) => a + p.charge, 0);
    while (net) { const q = (net > 0 ? -1 : 1) as -1 | 1; add("pion", q, 1 + r() * 2, gauss(r), r() * 2 * Math.PI); net += q; }
  }
  // soft underlying event: π⁺π⁻ pairs, so total charge stays conserved
  const nPairs = 2 + Math.floor(r() * 3);
  for (let i = 0; i < nPairs; i++) for (const q of [1, -1] as const) add("pion", q, 0.8 + r() * 1.5, gauss(r) * 2, r() * 2 * Math.PI);

  const hits: Hit[] = [];
  let hid = 0;
  for (const p of ps) {
    if (!p.charge) continue;
    const R = radiusFromPt(p.pt);
    LAYERS.forEach((lr, layer) => {
      const phi = hitPhi(p.phi, p.charge, R, lr);
      if (!Number.isNaN(phi)) hits.push({ id: hid++, layer, r: lr, phi: phi + gauss(r) * 0.0005, truth: p.id });
    });
  }
  return { id: `EVT-${seed.toString(16).toUpperCase().padStart(6, "0")}`, kind, synthetic: true, particles: ps, hits };
}

// ---------- Track reconstruction ----------
export interface Track { hits: Hit[]; phi0: number; charge: -1 | 1; R: number; pt: number; chi2: number; truth: number; purity: number }
const dphi = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Linearised fit φ_i ≈ φ0 − k·r_i, with k = q/(2R). Returns fitted parameters. */
export function fitTrack(hits: Pick<Hit, "r" | "phi">[]) {
  const n = hits.length, ref = hits[0]!.phi;
  const ys = hits.map((h) => dphi(h.phi, ref));
  const mx = hits.reduce((a, h) => a + h.r, 0) / n, my = ys.reduce((a, y) => a + y, 0) / n;
  let sxy = 0, sxx = 0;
  hits.forEach((h, i) => { sxy += (h.r - mx) * (ys[i]! - my); sxx += (h.r - mx) ** 2; });
  const slope = sxx ? sxy / sxx : 0, k = -slope, phi0 = ref + my - slope * mx;
  const R = 1 / (2 * Math.max(Math.abs(k), 1e-6));
  const chi2 = hits.reduce((a, h, i) => a + ((ys[i]! - (my + slope * (h.r - mx))) / 0.0005) ** 2, 0) / Math.max(1, n - 2);
  return { phi0, charge: (k >= 0 ? 1 : -1) as -1 | 1, R, pt: ptFromRadius(R), chi2 };
}

/** Road-following track finder: seed on innermost layer, extrapolate layer-by-layer picking the closest hit. */
export function reconstructTracks(hits: Hit[], road = 0.02): Track[] {
  const byLayer = LAYERS.map((_, l) => hits.filter((h) => h.layer === l));
  const used = new Set<number>();
  const tracks: Track[] = [];
  for (const seed of byLayer[0]!) {
    const chain: Hit[] = [seed];
    for (let l = 1; l < LAYERS.length; l++) {
      let pred = chain[chain.length - 1]!.phi;
      if (chain.length >= 2) {
        const a = chain[chain.length - 2]!, b = chain[chain.length - 1]!;
        pred = b.phi + (dphi(b.phi, a.phi) / (b.r - a.r)) * (LAYERS[l]! - b.r);
      }
      let best: Hit | undefined, bd = road;
      for (const h of byLayer[l]!) {
        if (used.has(h.id)) continue;
        const d = Math.abs(dphi(h.phi, pred));
        if (d < bd) { bd = d; best = h; }
      }
      if (!best) break;
      chain.push(best);
    }
    if (chain.length < 4) continue;
    chain.forEach((h) => used.add(h.id));
    const counts = new Map<number, number>();
    chain.forEach((h) => counts.set(h.truth, (counts.get(h.truth) ?? 0) + 1));
    const [truth, c] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
    tracks.push({ hits: chain, ...fitTrack(chain), truth, purity: c / chain.length });
  }
  return tracks;
}

export function trackingEfficiency(ev: CollisionEvent, tracks: Track[]) {
  const reconstructable = new Set(ev.hits.filter((h) => h.layer === 3).map((h) => h.truth));
  const found = new Set(tracks.filter((t) => t.purity >= 0.75).map((t) => t.truth));
  const matched = [...reconstructable].filter((t) => found.has(t)).length;
  return { reconstructable: reconstructable.size, matched, efficiency: reconstructable.size ? matched / reconstructable.size : 1, fakeRate: tracks.length ? tracks.filter((t) => t.purity < 0.75).length / tracks.length : 0 };
}

// ---------- Particle identification ----------
export type PidClass = "electron" | "muon" | "photon" | "charged hadron" | "neutral hadron";
export function identify(p: Pick<Particle, "charge" | "ecal" | "hcal" | "muonHits" | "pt" | "eta" | "species" | "phi">) {
  const E = fourVec(p).E || 1e-9;
  const fe = p.ecal / E, fh = p.hcal / E;
  const raw: Record<PidClass, number> = {
    muon: p.charge && p.muonHits >= 3 ? 6 : -4,
    electron: p.charge ? 5 * fe - 4 * fh - 1.5 : -6,
    photon: !p.charge ? 5 * fe - 4 * fh - 1.5 : -6,
    "charged hadron": p.charge ? 3 * fh - 0.5 : -6,
    "neutral hadron": !p.charge ? 3 * fh - 0.5 : -6,
  };
  const mx = Math.max(...Object.values(raw));
  const ex = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.exp(v - mx)])) as Record<PidClass, number>;
  const Z = Object.values(ex).reduce((a, b) => a + b, 0);
  const probs = Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, v / Z])) as Record<PidClass, number>;
  const label = (Object.keys(probs) as PidClass[]).reduce((a, b) => (probs[a] > probs[b] ? a : b));
  return { label, confidence: probs[label], probs, ecalFrac: fe, hcalFrac: fh };
}
export function truthClass(s: Species, q: number): PidClass {
  if (s === "electron" || s === "muon" || s === "photon") return s;
  return q ? "charged hadron" : "neutral hadron";
}

// ---------- Jets (anti-kT, R = 0.4) ----------
export interface Jet { pt: number; eta: number; phi: number; constituents: number[]; mass: number }
export function antiKt(ps: Particle[], R = 0.4, minPt = 5): Jet[] {
  type C = { pt: number; eta: number; phi: number; ids: number[]; vec: ReturnType<typeof fourVec> };
  let cs: C[] = ps.filter((p) => p.species !== "muon").map((p) => ({ pt: p.pt, eta: p.eta, phi: p.phi, ids: [p.id], vec: fourVec(p) }));
  const jets: Jet[] = [];
  while (cs.length) {
    let best = Infinity, bi = -1, bj = -1;
    for (let i = 0; i < cs.length; i++) {
      const diB = 1 / cs[i]!.pt ** 2;
      if (diB < best) { best = diB; bi = i; bj = -1; }
      for (let j = i + 1; j < cs.length; j++) {
        const dr2 = (cs[i]!.eta - cs[j]!.eta) ** 2 + dphi(cs[i]!.phi, cs[j]!.phi) ** 2;
        const dij = Math.min(1 / cs[i]!.pt ** 2, 1 / cs[j]!.pt ** 2) * dr2 / (R * R);
        if (dij < best) { best = dij; bi = i; bj = j; }
      }
    }
    const a = cs[bi]!;
    if (bj < 0) {
      const v = a.vec;
      if (a.pt >= minPt) jets.push({ pt: a.pt, eta: a.eta, phi: a.phi, constituents: a.ids, mass: Math.sqrt(Math.max(0, v.E ** 2 - v.px ** 2 - v.py ** 2 - v.pz ** 2)) });
      cs.splice(bi, 1);
    } else {
      const b = cs[bj]!;
      const vec = { E: a.vec.E + b.vec.E, px: a.vec.px + b.vec.px, py: a.vec.py + b.vec.py, pz: a.vec.pz + b.vec.pz };
      const pt = Math.hypot(vec.px, vec.py), p = Math.hypot(pt, vec.pz);
      const merged: C = { pt, phi: Math.atan2(vec.py, vec.px), eta: 0.5 * Math.log((p + vec.pz) / Math.max(1e-9, p - vec.pz)), ids: [...a.ids, ...b.ids], vec };
      cs = cs.filter((_, k) => k !== bi && k !== bj);
      cs.push(merged);
    }
  }
  return jets.sort((x, y) => y.pt - x.pt);
}

// ---------- Event-level features, conservation, anomaly ----------
export function eventFeatures(ev: CollisionEvent) {
  const sx = ev.particles.reduce((a, p) => a + p.pt * Math.cos(p.phi), 0);
  const sy = ev.particles.reduce((a, p) => a + p.pt * Math.sin(p.phi), 0);
  const leptons = ev.particles.filter((p) => (p.species === "muon" || p.species === "electron" || p.species === "photon") && p.pt > 10).sort((a, b) => b.pt - a.pt);
  return {
    nTracks: ev.particles.filter((p) => p.charge).length,
    ht: ev.particles.reduce((a, p) => a + p.pt, 0),
    met: Math.hypot(sx, sy),
    netCharge: ev.particles.reduce((a, p) => a + p.charge, 0),
    leadingMass: leptons.length >= 2 ? invariantMass(leptons.slice(0, 2)) : 0,
  };
}
export type Features = ReturnType<typeof eventFeatures>;

export function conservationCheck(ev: CollisionEvent, metTol = 15) {
  const f = eventFeatures(ev);
  return [
    { law: "Electric charge", ok: f.netCharge === 0, detail: `Σq = ${f.netCharge}` },
    { law: "Transverse momentum", ok: f.met < metTol, detail: `Missing ET = ${f.met.toFixed(1)} GeV${f.met >= metTol ? " — invisible particle (e.g. neutrino) likely" : ""}` },
  ];
}

const KEYS = ["nTracks", "ht", "met", "leadingMass"] as const;
export function referenceStats(samples: Features[]) {
  return Object.fromEntries(KEYS.map((k) => {
    const v = samples.map((s) => s[k]);
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1;
    return [k, { m, sd }];
  })) as Record<(typeof KEYS)[number], { m: number; sd: number }>;
}
/** Anomaly score = RMS of feature z-scores against a reference (Standard Model) sample. */
export function anomalyScore(f: Features, ref: ReturnType<typeof referenceStats>) {
  const z = Object.fromEntries(KEYS.map((k) => [k, (f[k] - ref[k].m) / ref[k].sd])) as Record<(typeof KEYS)[number], number>;
  const score = Math.sqrt(KEYS.reduce((a, k) => a + z[k] ** 2, 0) / KEYS.length);
  const driver = KEYS.reduce((a, b) => (Math.abs(z[a]) > Math.abs(z[b]) ? a : b));
  return { score, z, driver };
}

export const SM_KINDS: EventKind[] = ["Z→μμ", "Z→ee", "H→γγ", "QCD dijet", "W→μν"];
export function generateDataset(n: number, seed = 1, anomalyRate = 0.03): CollisionEvent[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const kind = r() < anomalyRate ? "anomalous" : SM_KINDS[Math.floor(r() * SM_KINDS.length)]!;
    return generateEvent(kind, seed * 100003 + i + 1);
  });
}

// ---------- Standard Model reference ----------
export const STANDARD_MODEL = [
  { name: "Electron", sym: "e⁻", type: "Lepton", mass: "0.511 MeV", charge: "−1", spin: "½" },
  { name: "Muon", sym: "μ⁻", type: "Lepton", mass: "105.7 MeV", charge: "−1", spin: "½" },
  { name: "Tau", sym: "τ⁻", type: "Lepton", mass: "1.777 GeV", charge: "−1", spin: "½" },
  { name: "Neutrinos", sym: "νₑ νμ ντ", type: "Lepton", mass: "< 0.8 eV", charge: "0", spin: "½" },
  { name: "Up / Down", sym: "u d", type: "Quark", mass: "2.2 / 4.7 MeV", charge: "+⅔ / −⅓", spin: "½" },
  { name: "Charm / Strange", sym: "c s", type: "Quark", mass: "1.27 GeV / 93 MeV", charge: "+⅔ / −⅓", spin: "½" },
  { name: "Top / Bottom", sym: "t b", type: "Quark", mass: "172.7 / 4.18 GeV", charge: "+⅔ / −⅓", spin: "½" },
  { name: "Photon", sym: "γ", type: "Gauge boson", mass: "0", charge: "0", spin: "1" },
  { name: "Gluon", sym: "g", type: "Gauge boson", mass: "0", charge: "0", spin: "1" },
  { name: "W boson", sym: "W±", type: "Gauge boson", mass: "80.37 GeV", charge: "±1", spin: "1" },
  { name: "Z boson", sym: "Z⁰", type: "Gauge boson", mass: "91.19 GeV", charge: "0", spin: "1" },
  { name: "Higgs", sym: "H", type: "Scalar boson", mass: "125.1 GeV", charge: "0", spin: "0" },
];
