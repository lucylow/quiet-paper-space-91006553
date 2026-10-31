// @ts-nocheck -- dense numeric array code; behaviour covered by src/test/materials.test.ts
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ELEMENTS, MATERIALS, bandPath, benchmark, buildCrystal, crystalGraph, cubicElastic, debyeCv, density, dos, energyAboveHull,
  initMD, inverseDesign, lowerHull, mdEnergy, mdStep, predict, rdf, trainKRR, validateStructure,
  type Lattice, type MDState, type Material, type Target,
} from "@/lib/materials";

const Synthetic = ({ label = "Demonstration data" }: { label?: string }) => (
  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
);
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-3 text-sm">{label}<div className="font-mono text-lg">{value}</div></div>;
}
function Section({ id, title, desc, children, tag }: { id: string; title: string; desc: string; children: React.ReactNode; tag?: string }) {
  return (
    <section id={id} className="mt-8 scroll-mt-4 rounded-2xl border panel p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{title}</h2><Synthetic label={tag} /></div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {children}
    </section>
  );
}
const sel = "rounded-md border bg-background px-2 py-1 text-sm";
const btn = "rounded-md border px-3 py-1.5 text-sm hover:bg-accent";
const btnP = "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground";

function Line({ pts, w = 600, h = 220, xs, ys, color = "var(--primary)", ticks, extra }: {
  pts: { x: number; y: number }[]; w?: number; h?: number; xs?: [number, number]; ys?: [number, number]; color?: string;
  ticks?: { x: number; label: string }[]; extra?: React.ReactNode;
}) {
  const [x0, x1] = xs ?? [Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.x))];
  const [y0, y1] = ys ?? [Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.y))];
  const X = (v: number) => 30 + ((v - x0) / (x1 - x0 || 1)) * (w - 40), Y = (v: number) => h - 20 - ((v - y0) / (y1 - y0 || 1)) * (h - 30);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg bg-background/40">
      {ticks?.map((t, i) => <g key={i}><line x1={X(t.x)} x2={X(t.x)} y1={10} y2={h - 20} stroke="var(--border)" /><text x={X(t.x)} y={h - 6} fontSize={11} textAnchor="middle" fill="var(--muted-foreground)">{t.label}</text></g>)}
      <path d={pts.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join("")} fill="none" stroke={color} strokeWidth={2} />
      {extra}
      <text x={4} y={14} fontSize={10} fill="var(--muted-foreground)">{y1.toFixed(1)}</text>
      <text x={4} y={h - 22} fontSize={10} fill="var(--muted-foreground)">{y0.toFixed(1)}</text>
    </svg>
  );
}

/* ---------- 1. Dashboard ---------- */
export function MaterialsDashboard({ runs }: { runs: string[] }) {
  const s = useMemo(() => ({
    gap: benchmark(MATERIALS, "bandGap"), ef: benchmark(MATERIALS, "formationEnergy"),
  }), []);
  const actions = [["#structure", "Explore structures"], ["#predict", "Predict properties"], ["#electronic", "Electronic structure"], ["#md", "Molecular dynamics"], ["#thermo", "Phase stability"], ["#discover", "Discover candidates"]];
  return (
    <Section id="overview" title="Materials Research Overview" desc="Live counts from the in-browser engine. Materials are a small reference set with approximate published values; all simulations are computed here.">
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Registered materials" value={String(MATERIALS.length)} />
        <Stat label="Crystal lattices" value={String(new Set(MATERIALS.map((m) => m.lattice)).size)} />
        <Stat label="Band-gap LOO MAE" value={`${s.gap.mae.toFixed(2)} eV`} />
        <Stat label="Eform LOO MAE" value={`${s.ef.mae.toFixed(2)} eV/at`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{actions.map(([h, l]) => <a key={h} href={h} className={btn}>{l}</a>)}</div>
      <div className="mt-4 text-sm"><div className="font-medium">Computational activity (this session)</div>
        {runs.length === 0 ? <p className="text-muted-foreground">No runs yet — try a prediction or an MD simulation below.</p>
          : <ul className="mt-1 max-h-32 overflow-auto font-mono text-xs text-muted-foreground">{runs.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      </div>
    </Section>
  );
}

/* ---------- 2. Atomic structure + crystal graph ---------- */
function project(p: [number, number, number], rx: number, ry: number) {
  const [x, y, z] = p, cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * cx * 0 + y * sx + z1 * cx;
  return [x1, y1, z2] as const;
}
export function StructureExplorer({ log }: { log: (s: string) => void }) {
  const [id, setId] = useState("demo-007"), [n, setN] = useState(2), [rot, setRot] = useState({ x: -0.5, y: 0.6 }), [showBonds, setShowBonds] = useState(true);
  const m = MATERIALS.find((x) => x.id === id)!;
  const atoms = useMemo(() => buildCrystal(m, n), [m, n]);
  const graph = useMemo(() => crystalGraph(atoms, m.a * n), [atoms, m, n]);
  const val = useMemo(() => validateStructure(atoms, m.a * n), [atoms, m, n]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const c = (m.a * n) / 2;
  const P = atoms.map((a) => project([a.pos[0] - c, a.pos[1] - c, a.pos[2] - c], rot.x, rot.y));
  const S = 150 / (m.a * n), order = P.map((_, i) => i).sort((a, b) => P[a][2] - P[b][2]);
  const directEdges = graph.edges.filter((e) => Math.hypot(...atoms[e.i].pos.map((v, k) => v - atoms[e.j].pos[k])) < graph.nearest * 1.2);
  return (
    <Section id="structure" title="Atomic Structure Intelligence Lab" desc="Build supercells, rotate them (drag), generate the periodic crystal graph and validate geometry.">
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <select className={sel} value={id} onChange={(e) => setId(e.target.value)}>{MATERIALS.map((x) => <option key={x.id} value={x.id}>{x.formula} ({x.lattice})</option>)}</select>
        <label>Supercell <select className={sel} value={n} onChange={(e) => setN(+e.target.value)}>{[1, 2, 3].map((v) => <option key={v} value={v}>{v}×{v}×{v}</option>)}</select></label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={showBonds} onChange={(e) => setShowBonds(e.target.checked)} /> Bonds</label>
        <button className={btn} onClick={() => log(`graph ${m.formula} ${n}³: ${graph.nodes} nodes, ${graph.edges.length} edges`)}>Log crystal graph</button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_16rem]">
        <svg viewBox="-200 -200 400 400" className="w-full touch-none cursor-grab rounded-lg bg-background/40"
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
          onPointerMove={(e) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; drag.current = { x: e.clientX, y: e.clientY }; setRot((r) => ({ x: r.x + dy * 0.01, y: r.y + dx * 0.01 })); }}
          onPointerUp={() => (drag.current = null)}>
          {showBonds && directEdges.map((e, k) => <line key={k} x1={P[e.i][0] * S} y1={P[e.i][1] * S} x2={P[e.j][0] * S} y2={P[e.j][1] * S} stroke="var(--border)" strokeWidth={1.5} />)}
          {order.map((i) => { const el = ELEMENTS[atoms[i].el], depth = 0.6 + 0.4 * ((P[i][2] / c + 1) / 2); return (
            <circle key={i} cx={P[i][0] * S} cy={P[i][1] * S} r={Math.max(3, el.r * S * 0.45) * depth} fill={el.color} stroke="var(--background)" strokeWidth={0.8} opacity={depth} />
          ); })}
        </svg>
        <div className="space-y-2 text-sm">
          <Stat label="Atoms" value={String(atoms.length)} />
          <Stat label="Graph edges" value={String(graph.edges.length)} />
          <Stat label="Nearest neighbour" value={`${graph.nearest.toFixed(3)} Å`} />
          <Stat label="Coordination" value={[...new Set(graph.coordination)].join(", ")} />
          <Stat label="Density (calc / ref)" value={`${density(m).toFixed(2)} / ${m.density}`} />
          <div className={`rounded-xl border p-3 ${val.valid ? "" : "border-destructive"}`}>{val.valid ? "✓ Geometry valid" : val.issues.slice(0, 3).join("; ")}</div>
          <div className="flex flex-wrap gap-2">{[...new Set(atoms.map((a) => a.el))].map((e) => <span key={e} className="flex items-center gap-1"><svg width="10" height="10"><circle cx="5" cy="5" r="5" fill={ELEMENTS[e].color} /></svg>{e}</span>)}</div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 3. Property prediction ---------- */
const TARGETS: { key: Target; label: string; unit: string }[] = [
  { key: "bandGap", label: "Band gap", unit: "eV" }, { key: "formationEnergy", label: "Formation energy", unit: "eV/atom" }, { key: "bulkModulus", label: "Bulk modulus", unit: "GPa" },
];
export function PropertyPredictor({ log }: { log: (s: string) => void }) {
  const [A, setA] = useState("Ga"), [B, setB] = useState("N"), [lattice, setLattice] = useState<Lattice>("zincblende"), [a, setAA] = useState(4.5);
  const models = useMemo(() => Object.fromEntries(TARGETS.map((t) => [t.key, trainKRR(MATERIALS, t.key)])), []);
  const bench = useMemo(() => TARGETS.map((t) => ({ ...t, ...benchmark(MATERIALS, t.key) })), []);
  const res = TARGETS.map((t) => ({ ...t, ...predict(models[t.key], { elements: [A, B], lattice, a }) }));
  const els = Object.keys(ELEMENTS);
  return (
    <Section id="predict" title="Material Property Intelligence" desc="Kernel ridge regression on composition + crystal-graph descriptors. Uncertainty from kernel support; out-of-distribution flagged by feature distance.">
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <select className={sel} value={A} onChange={(e) => setA(e.target.value)}>{els.map((e) => <option key={e}>{e}</option>)}</select>
        <select className={sel} value={B} onChange={(e) => setB(e.target.value)}>{els.map((e) => <option key={e}>{e}</option>)}</select>
        <select className={sel} value={lattice} onChange={(e) => setLattice(e.target.value as Lattice)}>{(["rocksalt", "zincblende", "sc"] as Lattice[]).map((l) => <option key={l}>{l}</option>)}</select>
        <label>a = <input type="number" step={0.05} className={`${sel} w-20`} value={a} onChange={(e) => setAA(+e.target.value)} /> Å</label>
        <button className={btnP} onClick={() => log(`predict ${A}${B} (${lattice}): Eg=${res[0].value.toFixed(2)} eV`)}>Save prediction</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {res.map((r) => (
          <div key={r.key} className={`rounded-xl border p-3 text-sm ${r.ood ? "border-destructive" : ""}`}>
            {r.label}<div className="font-mono text-lg">{r.value.toFixed(2)} ± {r.uncertainty.toFixed(2)} <span className="text-xs">{r.unit}</span></div>
            <div className="text-xs text-muted-foreground">{r.ood ? "⚠ Out of distribution — low trust" : "In distribution"}</div>
          </div>
        ))}
      </div>
      <h3 className="mt-6 font-medium">Model benchmark (leave-one-out)</h3>
      <table className="mt-2 w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th>Property</th><th>KRR MAE</th><th>Mean baseline</th><th>Gain</th></tr></thead>
        <tbody>{bench.map((b) => <tr key={b.key} className="border-t"><td>{b.label}</td><td className="font-mono">{b.mae.toFixed(2)}</td><td className="font-mono">{b.baseline.toFixed(2)}</td><td className="font-mono">{((1 - b.mae / b.baseline) * 100).toFixed(0)}%</td></tr>)}</tbody></table>
    </Section>
  );
}

/* ---------- 4. Electronic structure ---------- */
export function ElectronicStructure() {
  const [lat, setLat] = useState<"sc" | "bcc" | "fcc">("sc"), [t, setT] = useState(1), [ef, setEf] = useState(0);
  const bp = useMemo(() => bandPath(lat, t), [lat, t]), d = useMemo(() => dos(lat, t), [lat, t]);
  const ys: [number, number] = [d.lo - 0.5, d.hi + 0.5];
  const filled = d.hist.filter((h) => h.e < ef).reduce((s, h) => s + h.g * (d.width / d.hist.length), 0);
  return (
    <Section id="electronic" title="Electronic Structure Intelligence" desc="Tight-binding s-band along Γ–X–M–Γ–R and the density of states from Brillouin-zone sampling. Move the Fermi level to set band filling." tag="Model calculation">
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <select className={sel} value={lat} onChange={(e) => setLat(e.target.value as "sc")}>{["sc", "bcc", "fcc"].map((l) => <option key={l}>{l}</option>)}</select>
        <label>Hopping t = {t.toFixed(1)} eV <input type="range" min={0.2} max={2} step={0.1} value={t} onChange={(e) => setT(+e.target.value)} /></label>
        <label>E<sub>F</sub> = {ef.toFixed(1)} eV <input type="range" min={d.lo} max={d.hi} step={0.1} value={ef} onChange={(e) => setEf(+e.target.value)} /></label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
        <Line pts={bp.pts.map((p) => ({ x: p.s, y: p.e }))} ys={ys} ticks={bp.ticks.map((x) => ({ x: x.s, label: x.label }))}
          extra={<line x1={30} x2={590} y1={200 - ((ef - ys[0]) / (ys[1] - ys[0])) * 190} y2={200 - ((ef - ys[0]) / (ys[1] - ys[0])) * 190} stroke="var(--destructive)" strokeDasharray="4 3" />} />
        <Line w={240} pts={d.hist.map((h) => ({ x: h.e, y: h.g }))} color="var(--chart-2)" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3"><Stat label="Bandwidth" value={`${d.width.toFixed(2)} eV`} /><Stat label="Band filling" value={`${(filled * 100).toFixed(0)}%`} /><Stat label="Character" value={filled > 0.02 && filled < 0.98 ? "Metallic" : "Insulating"} /></div>
    </Section>
  );
}

/* ---------- 5. Molecular dynamics ---------- */
export function MDLab({ log }: { log: (s: string) => void }) {
  const [T, setT] = useState(0.5), [running, setRunning] = useState(false), [thermo, setThermo] = useState(true);
  const [s, setS] = useState<MDState>(() => initMD(7, 1.12, 0.5));
  const [hist, setHist] = useState<{ step: number; T: number; E: number }[]>([]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS((p) => {
      const n = mdStep(p, 0.004, 10, thermo ? T : undefined), e = mdEnergy(n);
      setHist((h) => [...h.slice(-150), { step: n.step, T: e.T, E: e.total / n.x.length }]);
      return n;
    }), 40);
    return () => clearInterval(id);
  }, [running, T, thermo]);
  const g = useMemo(() => rdf(s), [s]), e = mdEnergy(s), sc = 300 / s.L;
  return (
    <Section id="md" title="Atomic Dynamics Lab" desc="2D Lennard-Jones fluid with velocity-Verlet integration, periodic boundaries and an optional Berendsen thermostat. Heat it to watch the crystal melt; g(r) peaks wash out." tag="Simulation">
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button className={btnP} onClick={() => { setRunning((r) => !r); if (running) log(`MD stopped @ step ${s.step}, T*=${e.T.toFixed(2)}`); }}>{running ? "Pause" : "Run"}</button>
        <button className={btn} onClick={() => { setS(initMD(7, 1.12, T)); setHist([]); }}>Reset lattice</button>
        <label>T* = {T.toFixed(2)} <input type="range" min={0.05} max={2} step={0.05} value={T} onChange={(ev) => setT(+ev.target.value)} /></label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={thermo} onChange={(ev) => setThermo(ev.target.checked)} /> Thermostat (NVT)</label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <svg viewBox="0 0 300 300" className="w-full rounded-lg bg-background/40">{s.x.map((x, i) => <circle key={i} cx={x * sc} cy={s.y[i] * sc} r={0.5 * sc} fill="var(--primary)" opacity={0.85} />)}</svg>
        <div className="space-y-3">
          <Line h={130} pts={g.map((p) => ({ x: p.r, y: p.g }))} color="var(--chart-2)" />
          {hist.length > 1 && <Line h={110} pts={hist.map((p) => ({ x: p.step, y: p.T }))} color="var(--destructive)" />}
          <div className="grid grid-cols-3 gap-2"><Stat label="Step" value={String(s.step)} /><Stat label="T*" value={e.T.toFixed(3)} /><Stat label="E/N" value={(e.total / s.x.length).toFixed(3)} /></div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 6. Thermodynamics & elasticity ---------- */
export function ThermoLab() {
  const [pts, setPts] = useState([{ x: 0, e: 0, label: "A" }, { x: 0.25, e: -0.32, label: "A3B" }, { x: 0.5, e: -0.55, label: "AB" }, { x: 0.67, e: -0.3, label: "AB2" }, { x: 0.75, e: -0.35, label: "AB3" }, { x: 1, e: 0, label: "B" }]);
  const hull = lowerHull(pts);
  const [C, setC] = useState({ C11: 168, C12: 121, C44: 75 }), el = cubicElastic(C.C11, C.C12, C.C44);
  const [theta, setTheta] = useState(343);
  const W = 500, H = 220, X = (x: number) => 30 + x * (W - 50), Y = (e: number) => 20 + (-e / 0.7) * (H - 40);
  return (
    <Section id="thermo" title="Thermodynamics, Phase Stability & Elasticity" desc="Binary convex hull with energy above hull, Voigt–Reuss–Hill elastic moduli with Born stability, and Debye heat capacity." tag="Model calculation">
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-background/40">
            <line x1={X(0)} x2={X(1)} y1={Y(0)} y2={Y(0)} stroke="var(--border)" />
            <path d={hull.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${Y(p.e)}`).join("")} fill="none" stroke="var(--primary)" strokeWidth={2} />
            {pts.map((p) => { const eh = energyAboveHull(pts, p); return <g key={p.label}><circle cx={X(p.x)} cy={Y(p.e)} r={5} fill={eh < 1e-6 ? "var(--primary)" : "var(--destructive)"} /><text x={X(p.x)} y={Y(p.e) - 8} fontSize={11} textAnchor="middle" fill="var(--foreground)">{p.label}</text></g>; })}
          </svg>
          <table className="mt-2 w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th>Phase</th><th>x<sub>B</sub></th><th>E<sub>f</sub> (eV/at)</th><th>E above hull</th></tr></thead>
            <tbody>{pts.map((p, i) => <tr key={p.label} className="border-t"><td>{p.label}</td><td>{p.x.toFixed(2)}</td>
              <td><input type="number" step={0.05} className={`${sel} w-20`} value={p.e} disabled={p.x === 0 || p.x === 1} onChange={(ev) => setPts((a) => a.map((q, j) => j === i ? { ...q, e: +ev.target.value } : q))} /></td>
              <td className="font-mono">{(energyAboveHull(pts, p) * 1000).toFixed(0)} meV</td></tr>)}</tbody></table>
        </div>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">{(["C11", "C12", "C44"] as const).map((k) => <label key={k}>{k} <input type="number" className={`${sel} w-20`} value={C[k]} onChange={(ev) => setC({ ...C, [k]: +ev.target.value })} /> GPa</label>)}</div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Bulk K" value={`${el.K.toFixed(1)} GPa`} /><Stat label="Shear G" value={`${el.G.toFixed(1)} GPa`} />
            <Stat label="Young's E" value={`${el.E.toFixed(1)} GPa`} /><Stat label="Poisson ν" value={el.nu.toFixed(3)} />
            <Stat label="Pugh K/G" value={`${el.pugh.toFixed(2)} ${el.ductile ? "ductile" : "brittle"}`} /><Stat label="Born stability" value={el.stable ? "Stable" : "Unstable"} />
          </div>
          <label className="block">Debye θ<sub>D</sub> = {theta} K <input type="range" min={100} max={2200} step={10} value={theta} onChange={(ev) => setTheta(+ev.target.value)} /></label>
          <Line h={150} pts={Array.from({ length: 60 }, (_, i) => { const T = 5 + i * 15; return { x: T, y: debyeCv(T, theta) }; })} ys={[0, 26]} color="var(--chart-4)" />
          <p className="text-xs text-muted-foreground">C<sub>v</sub> (J/mol·K) vs T up to 890 K; approaches 3R = 24.9.</p>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 7. Generative discovery ---------- */
export function DiscoveryLab({ log }: { log: (s: string) => void }) {
  const [target, setTarget] = useState(2.0), [seed, setSeed] = useState(7);
  const cands = useMemo(() => inverseDesign({ bandGap: target }, 300, seed).slice(0, 8), [target, seed]);
  return (
    <Section id="discover" title="Generative Material Discovery" desc="Inverse design: sample binary AB compounds, predict band gap and stability with the property models, rank by closeness to target, stability and uncertainty. Candidates are AI hypotheses, not verified materials." tag="AI hypotheses">
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <label>Target gap = {target.toFixed(1)} eV <input type="range" min={0} max={8} step={0.1} value={target} onChange={(e) => setTarget(+e.target.value)} /></label>
        <button className={btn} onClick={() => setSeed((s) => s + 1)}>Resample</button>
        <button className={btnP} onClick={() => log(`discovery Eg→${target} eV: top ${cands[0]?.formula}`)}>Save shortlist</button>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th>#</th><th>Candidate</th><th>Lattice</th><th>a (Å)</th><th>Eg (eV)</th><th>Ef (eV/at)</th><th>Trust</th></tr></thead>
        <tbody>{cands.map((c, i) => <tr key={c.formula + c.lattice} className="border-t"><td>{i + 1}</td><td className="font-medium">{c.formula}</td><td>{c.lattice}</td><td className="font-mono">{c.a.toFixed(2)}</td><td className="font-mono">{c.gap.toFixed(2)} ± {c.unc.toFixed(2)}</td><td className="font-mono">{c.ef.toFixed(2)}</td><td>{c.ood ? "⚠ OOD" : "OK"}</td></tr>)}</tbody></table></div>
    </Section>
  );
}

export function MaterialRegistry() {
  const rows: (Material & { pred: number })[] = useMemo(() => MATERIALS.map((m, i) => ({ ...m, pred: predict(trainKRR(MATERIALS.filter((_, j) => j !== i), "bandGap"), m).value })), []);
  return (
    <Section id="registry" title="Materials Registry" desc="Reference materials with approximate literature values, and held-out band-gap predictions from the model.">
      <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted-foreground"><tr><th>ID</th><th>Formula</th><th>Lattice</th><th>a (Å)</th><th>Eg ref</th><th>Eg pred</th><th>Ef</th><th>K (GPa)</th><th>Class</th></tr></thead>
        <tbody>{rows.map((m) => <tr key={m.id} className="border-t"><td className="font-mono text-xs">{m.id}</td><td className="font-medium">{m.formula}</td><td>{m.lattice}</td><td className="font-mono">{m.a}</td><td className="font-mono">{m.bandGap}</td><td className="font-mono">{m.pred.toFixed(2)}</td><td className="font-mono">{m.formationEnergy}</td><td className="font-mono">{m.bulkModulus}</td><td>{m.tag}</td></tr>)}</tbody></table></div>
    </Section>
  );
}
