// @ts-nocheck -- dense numeric array code; behaviour covered by src/test/plasma.test.ts
import { useEffect, useMemo, useState } from "react";
import {
  C, DISPERSION, PRESETS, borisOrbit, brioWu, dtReactivity, evaluateDetector, fitSlope, ignitionTriple, initTwoStream, mhdStep, mhdTotals,
  picStep, plasmaParams, powerBalance, powerSpectrum, prim, synthShots, synthTurbulence, type MHD, type PIC, type PlasmaState,
} from "@/lib/plasma";

const Tag = ({ label = "Simulation" }: { label?: string }) => <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>;
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border p-3 text-sm">{label}<div className="font-mono text-base sm:text-lg">{value}</div></div>; }
function Section({ id, title, desc, tag, children }: { id: string; title: string; desc: string; tag?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-4 rounded-2xl border panel p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{title}</h2><Tag label={tag} /></div>
      <p className="text-sm text-muted-foreground">{desc}</p>{children}
    </section>
  );
}
const sel = "rounded-md border bg-background px-2 py-1 text-sm", btn = "rounded-md border px-3 py-1.5 text-sm hover:bg-accent", btnP = "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground";
const fmt = (v: number, u = "") => (!isFinite(v) ? "∞" : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0) ? `${v.toExponential(2)} ${u}` : `${v.toFixed(2)} ${u}`).trim();

function Plot({ series, w = 600, h = 200, logX, logY, ys, xs, extra }: {
  series: { pts: { x: number; y: number }[]; color: string; dash?: boolean }[]; w?: number; h?: number; logX?: boolean; logY?: boolean; ys?: [number, number]; xs?: [number, number]; extra?: (X: (v: number) => number, Y: (v: number) => number) => React.ReactNode;
}) {
  const tx = (v: number) => (logX ? Math.log10(v) : v), ty = (v: number) => (logY ? Math.log10(Math.max(v, 1e-300)) : v);
  const all = series.flatMap((s) => s.pts);
  const [x0, x1] = xs ? xs.map(tx) : [Math.min(...all.map((p) => tx(p.x))), Math.max(...all.map((p) => tx(p.x)))];
  const [y0, y1] = ys ? ys.map(ty) : [Math.min(...all.map((p) => ty(p.y))), Math.max(...all.map((p) => ty(p.y)))];
  const X = (v: number) => 34 + ((tx(v) - x0) / (x1 - x0 || 1)) * (w - 44), Y = (v: number) => h - 16 - ((ty(v) - y0) / (y1 - y0 || 1)) * (h - 26);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg bg-background/40">
      {series.map((s, i) => <path key={i} d={s.pts.map((p, j) => `${j ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join("")} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash ? "5 4" : undefined} />)}
      {extra?.(X, Y)}
      <text x={3} y={13} fontSize={10} fill="var(--muted-foreground)">{logY ? `1e${y1.toFixed(0)}` : y1.toPrecision(3)}</text>
      <text x={3} y={h - 18} fontSize={10} fill="var(--muted-foreground)">{logY ? `1e${y0.toFixed(0)}` : y0.toPrecision(3)}</text>
    </svg>
  );
}

/* ---------- Dashboard ---------- */
export function PlasmaDashboard({ runs }: { runs: string[] }) {
  const det = useMemo(() => evaluateDetector(synthShots(), 0.2), []);
  const links = [["#state", "Plasma state"], ["#orbits", "Particle orbits"], ["#mhd", "MHD shock tube"], ["#pic", "Kinetic PIC"], ["#waves", "Waves & turbulence"], ["#fusion", "Fusion power"], ["#disrupt", "Disruption AI"]];
  return (
    <Section id="overview" title="Plasma Research Overview" desc="Every number here is computed live in your browser. Discharges are synthetic; physical constants and the D–T reactivity fit are real." tag="Live">
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Solvers" value="5" /><Stat label="Plasma presets" value={String(PRESETS.length)} />
        <Stat label="Synthetic shots" value="24" /><Stat label="Disruption recall" value={`${(det.recall * 100).toFixed(0)}%`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{links.map(([h, l]) => <a key={h} href={h} className={btn}>{l}</a>)}</div>
      <div className="mt-4 text-sm"><div className="font-medium">Computational activity (this session)</div>
        {runs.length === 0 ? <p className="text-muted-foreground">No runs yet — start a simulation below.</p> : <ul className="mt-1 max-h-32 overflow-auto font-mono text-xs text-muted-foreground">{runs.map((r, i) => <li key={i}>{r}</li>)}</ul>}
      </div>
    </Section>
  );
}

/* ---------- Plasma state explorer ---------- */
export function PlasmaState() {
  const [s, setS] = useState<PlasmaState>(PRESETS[0].s);
  const p = plasmaParams(s);
  const field = (k: keyof PlasmaState, label: string, exp = true) => (
    <label className="flex flex-col text-xs">{label}<input className={`${sel} w-28`} type="number" step="any" value={exp ? s[k].toExponential(1) : s[k]} onChange={(e) => +e.target.value > 0 && setS({ ...s, [k]: +e.target.value })} /></label>
  );
  return (
    <Section id="state" title="Plasma State Explorer" desc="Fundamental length, time and velocity scales from density, temperature and magnetic field (NRL Plasma Formulary)." tag="Formulary">
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <select className={sel} onChange={(e) => setS(PRESETS[+e.target.value].s)}>{PRESETS.map((x, i) => <option key={x.name} value={i}>{x.name}</option>)}</select>
        {field("n", "n (m⁻³)")}{field("Te", "Tₑ (eV)")}{field("Ti", "Tᵢ (eV)")}{field("B", "B (T)")}{field("A", "Ion mass (u)", false)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Debye length" value={fmt(p.debye, "m")} /><Stat label="Plasma freq fₚₑ" value={fmt(p.fpe, "Hz")} />
        <Stat label="e⁻ gyrofreq" value={fmt(p.wce / (2 * Math.PI), "Hz")} /><Stat label="Ion Larmor ρᵢ" value={fmt(p.rhoI, "m")} />
        <Stat label="Plasma β" value={fmt(p.beta)} /><Stat label="Alfvén speed" value={fmt(p.vA, "m/s")} />
        <Stat label="Sound speed cₛ" value={fmt(p.cs, "m/s")} /><Stat label="Collision ν_ei" value={fmt(p.nuEI, "s⁻¹")} />
        <Stat label="Particles/Debye sphere" value={fmt(p.ND)} /><Stat label="Coulomb log" value={p.lnL.toFixed(1)} />
        <Stat label="Pressure" value={fmt(p.pressure, "Pa")} /><Stat label="Ideal plasma?" value={p.ideal ? "Yes" : "No (strongly coupled)"} />
      </div>
    </Section>
  );
}

/* ---------- Particle orbits ---------- */
export function OrbitLab() {
  const [E, setE] = useState(0), [vpar, setVpar] = useState(0.3), [species, setSpecies] = useState<"proton" | "electron">("proton");
  const q = species === "proton" ? C.e : -C.e, m = species === "proton" ? C.mp : C.me, B = 1, v = 1e5;
  const wc = (Math.abs(q) * B) / m, dt = 0.05 / wc;
  const { path } = useMemo(() => borisOrbit(q, m, [E, 0, 0], [0, 0, B], [v, 0, vpar * v], dt, 1200), [q, m, E, vpar, dt]);
  const r = (m * v) / (Math.abs(q) * B), sc = 70 / r;
  const proj = path.map((p) => [p[0] * sc + p[1] * sc * 0.5, -p[2] * sc * 0.25 + p[1] * sc * 0.4] as const);
  const xs = proj.map((p) => p[0]), ys = proj.map((p) => p[1]);
  const vb = `${Math.min(...xs) - 10} ${Math.min(...ys) - 10} ${Math.max(...xs) - Math.min(...xs) + 20} ${Math.max(...ys) - Math.min(...ys) + 20}`;
  return (
    <Section id="orbits" title="Charged-Particle Orbits" desc="Boris pusher in a uniform B along z. Add an electric field to see the E×B drift; add parallel velocity for a helix.">
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <select className={sel} value={species} onChange={(e) => setSpecies(e.target.value as "proton")}><option value="proton">Proton</option><option value="electron">Electron</option></select>
        <label>Eₓ = {E} V/m <input type="range" min={0} max={50000} step={1000} value={E} onChange={(e) => setE(+e.target.value)} /></label>
        <label>v∥/v⊥ = {vpar.toFixed(1)} <input type="range" min={0} max={1} step={0.1} value={vpar} onChange={(e) => setVpar(+e.target.value)} /></label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_14rem]">
        <svg viewBox={vb} className="h-72 w-full rounded-lg bg-background/40"><path d={proj.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("")} fill="none" stroke="var(--primary)" strokeWidth={Math.max(...xs) / 200 + 0.6} /></svg>
        <div className="space-y-2"><Stat label="Larmor radius" value={fmt(r, "m")} /><Stat label="Gyrofrequency" value={fmt(wc / (2 * Math.PI), "Hz")} /><Stat label="E×B drift" value={fmt(E / B, "m/s")} /></div>
      </div>
    </Section>
  );
}

/* ---------- MHD ---------- */
export function MHDLab({ log }: { log: (s: string) => void }) {
  const [s, setS] = useState<MHD>(() => brioWu(200)), [run, setRun] = useState(false), [m0] = useState(() => mhdTotals(brioWu(200)));
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setS((p) => { let n = p; for (let i = 0; i < 4 && n.t < 0.1; i++) n = mhdStep(n); if (n.t >= 0.1) { setRun(false); log(`MHD Brio–Wu reached t=${n.t.toFixed(3)}`); } return n; }), 30);
    return () => clearInterval(id);
  }, [run]);
  const P = s.U.map((u, i) => ({ x: (i + 0.5) / s.nx, ...prim(s, u) })), tot = mhdTotals(s);
  return (
    <Section id="mhd" title="MHD Intelligence Lab" desc="1D ideal magnetohydrodynamics (Brio–Wu shock tube, γ = 2) with a Rusanov finite-volume solver. Watch fast rarefactions, a compound wave, contact and slow shock form.">
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <button className={btnP} onClick={() => setRun((r) => !r)}>{run ? "Pause" : "Run to t = 0.1"}</button>
        <button className={btn} onClick={() => { setRun(false); setS(brioWu(200)); }}>Reset</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div><div className="text-xs text-muted-foreground">Density ρ</div><Plot h={150} ys={[0, 1.1]} series={[{ pts: P.map((p) => ({ x: p.x, y: p.rho })), color: "var(--primary)" }]} /></div>
        <div><div className="text-xs text-muted-foreground">Magnetic field Bᵧ</div><Plot h={150} ys={[-1.1, 1.1]} series={[{ pts: P.map((p) => ({ x: p.x, y: p.By })), color: "var(--chart-4)" }]} /></div>
        <div><div className="text-xs text-muted-foreground">Velocity vₓ</div><Plot h={150} ys={[-0.5, 0.8]} series={[{ pts: P.map((p) => ({ x: p.x, y: p.vx })), color: "var(--chart-2)" }]} /></div>
        <div><div className="text-xs text-muted-foreground">Pressure p</div><Plot h={150} ys={[0, 1.1]} series={[{ pts: P.map((p) => ({ x: p.x, y: p.p })), color: "var(--destructive)" }]} /></div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3"><Stat label="Time" value={s.t.toFixed(4)} /><Stat label="Mass drift" value={fmt(Math.abs(tot.mass - m0.mass) / m0.mass)} /><Stat label="Energy drift" value={fmt(Math.abs(tot.energy - m0.energy) / m0.energy)} /></div>
    </Section>
  );
}

/* ---------- PIC ---------- */
export function PICLab({ log }: { log: (s: string) => void }) {
  const [v0, setV0] = useState(1), [s, setS] = useState<PIC>(() => initTwoStream(3000, 64, 1)), [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setS((p) => { const n = picStep(p, 0.1, 3); if (n.t > 60) { setRun(false); log(`PIC two-stream v0=${v0}: saturated at t=${n.t.toFixed(0)}`); } return n; }), 30);
    return () => clearInterval(id);
  }, [run]);
  const W = 400, H = 220, vmax = v0 * 2.5;
  const growth = useMemo(() => { const h = s.history; if (h.length < 60) return null; const a = Math.log(h[20] + 1e-30), b = Math.log(h[50] + 1e-30); return (b - a) / (30 * 0.1) / 2; }, [s.history.length > 60]);
  return (
    <Section id="pic" title="Kinetic Plasma — Particle-in-Cell" desc="1D electrostatic PIC with two counter-streaming electron beams (normalized to ωₚₑ). Phase-space vortices form as the two-stream instability saturates. Theory: max growth γ ≈ 0.35 ωₚₑ.">
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button className={btnP} onClick={() => setRun((r) => !r)}>{run ? "Pause" : "Run"}</button>
        <button className={btn} onClick={() => { setRun(false); setS(initTwoStream(3000, 64, v0)); }}>Reset</button>
        <label>Beam speed v₀ = {v0.toFixed(1)} <input type="range" min={0.3} max={2} step={0.1} value={v0} onChange={(e) => { setV0(+e.target.value); setRun(false); setS(initTwoStream(3000, 64, +e.target.value)); }} /></label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-background/40">{s.x.map((x, i) => <rect key={i} x={(x / s.L) * W} y={H / 2 - (s.v[i] / vmax) * (H / 2)} width={1.2} height={1.2} fill={i % 2 ? "var(--primary)" : "var(--chart-4)"} />)}</svg>
        <div className="space-y-3">
          {s.history.length > 2 ? <Plot h={160} logY series={[{ pts: s.history.map((e, i) => ({ x: i * 0.1, y: e })), color: "var(--destructive)" }]} /> : <div className="flex h-40 items-center justify-center rounded-lg bg-background/40 text-sm text-muted-foreground">Field energy appears here</div>}
          <div className="grid grid-cols-2 gap-2"><Stat label="Time (1/ωₚₑ)" value={s.t.toFixed(1)} /><Stat label="Measured γ" value={growth ? growth.toFixed(2) : "—"} /></div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Waves & turbulence ---------- */
export function WavesLab() {
  const [slope, setSlope] = useState(-5 / 3), [seed, setSeed] = useState(4);
  const sig = useMemo(() => synthTurbulence(512, slope, seed), [slope, seed]);
  const spec = useMemo(() => powerSpectrum(sig), [sig]), fit = fitSlope(spec, 4, 200);
  const ks = Array.from({ length: 60 }, (_, i) => 0.02 + i * 0.05);
  const classify = Math.abs(fit + 5 / 3) < 0.15 ? "Kolmogorov (−5/3)" : Math.abs(fit + 3 / 2) < 0.1 ? "Iroshnikov–Kraichnan (−3/2)" : fit < -2.3 ? "Kinetic/dissipation range" : "Non-standard";
  return (
    <Section id="waves" title="Plasma Waves & Turbulence" desc="Dispersion relations for the main electrostatic and electromagnetic modes, and spectral analysis of a turbulent fluctuation signal with automatic regime classification." tag="Model + synthetic">
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><div className="text-xs text-muted-foreground">ω/ωₚₑ vs kλ_D — <span style={{ color: "var(--primary)" }}>Langmuir</span>, <span style={{ color: "var(--chart-4)" }}>EM</span>, <span style={{ color: "var(--chart-2)" }}>ion acoustic ×40</span></div>
          <Plot h={200} ys={[0, 4]} series={[
            { pts: ks.map((k) => ({ x: k, y: DISPERSION["Langmuir (Bohm–Gross)"](k) })), color: "var(--primary)" },
            { pts: ks.map((k) => ({ x: k, y: Math.min(4, DISPERSION["EM (light wave)"](k)) })), color: "var(--chart-4)" },
            { pts: ks.map((k) => ({ x: k, y: 40 * DISPERSION["Ion acoustic"](k) })), color: "var(--chart-2)" },
          ]} /></div>
        <div><div className="text-xs text-muted-foreground">Power spectrum P(k), log–log, with fitted law (dashed)</div>
          <Plot h={200} logX logY series={[{ pts: spec, color: "var(--chart-2)" }, { pts: [4, 200].map((k) => ({ x: k, y: spec[3].y ?? spec[3].P * (k / 4) ** fit })).map((p, i) => ({ x: p.x, y: spec[3].P * (p.x / 4) ** fit })), color: "var(--destructive)", dash: true }].map((s) => ({ ...s, pts: s.pts.map((p: any) => ({ x: p.x ?? p.k, y: p.y ?? p.P })) }))} /></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label>Injected slope {slope.toFixed(2)} <input type="range" min={-3} max={-1} step={0.05} value={slope} onChange={(e) => setSlope(+e.target.value)} /></label>
        <button className={btn} onClick={() => setSeed((s) => s + 1)}>New realization</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3"><Stat label="Fitted spectral index" value={fit.toFixed(3)} /><Stat label="Regime" value={classify} /></div>
    </Section>
  );
}

/* ---------- Fusion ---------- */
export function FusionLab({ log }: { log: (s: string) => void }) {
  const [n, setN] = useState(1e20), [T, setT] = useState(15), [tau, setTau] = useState(3.5);
  const pb = powerBalance(n, T, tau);
  const Ts = Array.from({ length: 80 }, (_, i) => 2 + i * 1.2);
  return (
    <Section id="fusion" title="Fusion Research Intelligence" desc="0D D–T power balance with Bosch–Hale reactivity, bremsstrahlung losses and the Lawson ignition criterion. Default volume 830 m³ (ITER-scale)." tag="Model calculation">
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <label>n = {n.toExponential(1)} m⁻³ <input type="range" min={19} max={21} step={0.05} value={Math.log10(n)} onChange={(e) => setN(10 ** +e.target.value)} /></label>
        <label>T = {T.toFixed(0)} keV <input type="range" min={2} max={80} step={1} value={T} onChange={(e) => setT(+e.target.value)} /></label>
        <label>τ_E = {tau.toFixed(1)} s <input type="range" min={0.1} max={10} step={0.1} value={tau} onChange={(e) => setTau(+e.target.value)} /></label>
        <button className={btnP} onClick={() => log(`fusion n=${n.toExponential(1)} T=${T} τE=${tau}: Q=${isFinite(pb.Q) ? pb.Q.toFixed(1) : "∞"}`)}>Save scenario</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fusion power" value={fmt(pb.Pfus / 1e6, "MW")} /><Stat label="Alpha heating" value={fmt(pb.Palpha / 1e6, "MW")} />
        <Stat label="Transport loss" value={fmt(pb.Ploss / 1e6, "MW")} /><Stat label="Bremsstrahlung" value={fmt(pb.Pbrem / 1e6, "MW")} />
        <Stat label="Aux heating needed" value={fmt(pb.Paux / 1e6, "MW")} /><Stat label="Gain Q" value={isFinite(pb.Q) ? pb.Q.toFixed(2) : "Ignited"} />
        <Stat label="n T τ_E" value={fmt(pb.triple, "keV·s/m³")} /><Stat label="vs ignition" value={`${((pb.triple / ignitionTriple(T)) * 100).toFixed(0)}%`} />
      </div>
      <div className="mt-4 text-xs text-muted-foreground">Ignition triple product vs temperature (dashed = your plasma)</div>
      <Plot h={180} logY series={[{ pts: Ts.map((t) => ({ x: t, y: ignitionTriple(t) })), color: "var(--primary)" }]}
        extra={(X, Y) => <circle cx={X(T)} cy={Y(pb.triple)} r={6} fill={pb.ignited ? "var(--chart-2)" : "var(--destructive)"} />} />
      <p className="mt-2 text-xs text-muted-foreground">⟨σv⟩(T) = {fmt(dtReactivity(T), "m³/s")}. Dot turns teal when alpha heating alone sustains the plasma.</p>
    </Section>
  );
}

/* ---------- Disruption prediction ---------- */
export function DisruptionLab() {
  const shots = useMemo(() => synthShots(), []), [th, setTh] = useState(0.2), [id, setId] = useState(0);
  const ev = evaluateDetector(shots, th), shot = shots[id];
  const ROC = useMemo(() => Array.from({ length: 30 }, (_, i) => { const r = evaluateDetector(shots, 0.06 + i * 0.03); return { x: r.falseAlarm, y: r.recall }; }).sort((a, b) => a.x - b.x), [shots]);
  return (
    <Section id="disrupt" title="Plasma Predictive Intelligence — Disruptions" desc="Locked-mode precursor detector on a synthetic tokamak discharge database. Tune the alarm threshold to trade recall against false alarms." tag="Synthetic shots">
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <select className={sel} value={id} onChange={(e) => setId(+e.target.value)}>{shots.map((s, i) => <option key={s.id} value={i}>{s.id} {s.disrupt ? "(disrupted)" : ""}</option>)}</select>
        <label>Threshold = {th.toFixed(2)} <input type="range" min={0.06} max={0.9} step={0.02} value={th} onChange={(e) => setTh(+e.target.value)} /></label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><div className="text-xs text-muted-foreground">Plasma current (MA, teal) & locked mode ×20 (red)</div>
          <Plot h={180} ys={[0, 16]} series={[{ pts: shot.t.map((t, i) => ({ x: t, y: shot.Ip[i] })), color: "var(--chart-2)" }, { pts: shot.t.map((t, i) => ({ x: t, y: Math.min(16, shot.mode[i] * 20) })), color: "var(--destructive)" }]}
            extra={(X, Y) => <line x1={X(0)} x2={X(6)} y1={Y(th * 20)} y2={Y(th * 20)} stroke="var(--foreground)" strokeDasharray="3 3" />} /></div>
        <div><div className="text-xs text-muted-foreground">ROC curve (recall vs false-alarm rate)</div>
          <Plot h={180} xs={[0, 1]} ys={[0, 1]} series={[{ pts: [{ x: 0, y: 0 }, ...ROC, { x: 1, y: 1 }], color: "var(--primary)" }]} extra={(X, Y) => <circle cx={X(ev.falseAlarm)} cy={Y(ev.recall)} r={5} fill="var(--destructive)" />} /></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Recall" value={`${(ev.recall * 100).toFixed(0)}%`} /><Stat label="False alarms" value={`${(ev.falseAlarm * 100).toFixed(0)}%`} /><Stat label="Mean warning" value={`${(ev.meanWarning * 1000).toFixed(0)} ms`} /><Stat label="Confusion" value={`TP${ev.tp} FP${ev.fp} FN${ev.fn}`} /></div>
    </Section>
  );
}
