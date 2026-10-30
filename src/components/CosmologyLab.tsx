import { useEffect, useMemo, useRef, useState } from "react";
import {
  MODELS, age, bic, classifyWeb, distanceModulus, initParticles, mcmc, normalize, stats, step, syntheticSurvey,
  type Chain, type ModelId,
} from "@/lib/cosmology";

const W = 800, H = 240;

function Slider({ label, value, min, max, step: s, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}: <span className="font-mono text-foreground">{value}</span>
      <input type="range" min={min} max={max} step={s} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border p-3 text-sm">{label}<div className="font-mono text-lg">{value}</div></div>;
}

export function ExpansionExplorer() {
  const [Om, setOm] = useState(0.3);
  const [Ol, setOl] = useState(0.7);
  const [w, setW] = useState(-1);
  const [H0, setH0] = useState(70);
  const p = { H0, Om, Ol, w };
  const ref = { H0, Om: 0.3, Ol: 0.7, w: -1 };
  const zs = Array.from({ length: 80 }, (_, i) => 0.02 + (i / 79) * 1.98);
  const res = zs.map((z) => distanceModulus(z, p) - distanceModulus(z, ref));
  const path = zs.map((z, i) => `${i ? "L" : "M"}${(z / 2) * W},${H / 2 - res[i]! * 150}`).join("");
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Dark Energy Parameter Explorer</h2>
      <p className="text-sm text-muted-foreground">Change the matter, dark energy and equation-of-state values and see how the distance–redshift relation shifts relative to reference Λ-CDM.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Slider label="Ωm" value={Om} min={0.05} max={1} step={0.01} onChange={setOm} />
        <Slider label="ΩΛ" value={Ol} min={0} max={1.2} step={0.01} onChange={setOl} />
        <Slider label="w" value={w} min={-2} max={-0.3} step={0.05} onChange={setW} />
        <Slider label="H₀ (km/s/Mpc)" value={H0} min={55} max={80} step={1} onChange={setH0} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full rounded-lg bg-background/40">
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="var(--border)" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} />
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">Δμ vs. redshift 0–2 (line = reference flat Λ-CDM, H₀ held equal).</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Curvature Ωk" value={(1 - Om - Ol).toFixed(3)} />
        <Stat label="Age of universe" value={`${age(p).toFixed(2)} Gyr`} />
        <Stat label="μ at z = 1" value={distanceModulus(1, p).toFixed(3)} />
      </div>
    </section>
  );
}

export function ParameterInference() {
  const truth = { H0: 70, Om: 0.3, Ol: 0.7, w: -1 };
  const data = useMemo(() => syntheticSurvey(truth, 60), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [runs, setRuns] = useState<Partial<Record<ModelId, Chain>>>({});
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const out: Partial<Record<ModelId, Chain>> = {};
      for (const m of Object.keys(MODELS) as ModelId[]) out[m] = mcmc(m, data, 2500);
      setRuns(out); setBusy(false);
    }, 20);
  };

  const ids = Object.keys(runs) as ModelId[];
  const bics = ids.map((m) => bic(runs[m]!.bestChi2, MODELS[m].free.length, data.length));
  const minB = Math.min(...bics);
  const best = runs["flat-lcdm"]?.best;
  const muMin = 34, muMax = 46;
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Bayesian Parameter Estimation & Model Comparison</h2>
      <p className="text-sm text-muted-foreground">
        Metropolis MCMC fits each model to a supernova distance survey, then BIC compares them.
        <span className="ml-1 rounded bg-primary/15 px-1.5 text-primary">Demo data</span> — 60 synthetic supernovae generated from Ωm = 0.3, flat Λ-CDM.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full rounded-lg bg-background/40">
        {data.map((d, i) => <circle key={i} cx={(d.z / 1.6) * W} cy={H - ((d.mu - muMin) / (muMax - muMin)) * H} r={3} fill="var(--foreground)" opacity={0.6} />)}
        {best && <path fill="none" stroke="var(--primary)" strokeWidth={2} d={Array.from({ length: 60 }, (_, i) => { const z = 0.02 + i * 0.026; return `${i ? "L" : "M"}${(z / 1.6) * W},${H - ((distanceModulus(z, best) - muMin) / (muMax - muMin)) * H}`; }).join("")} />}
      </svg>
      <button onClick={run} disabled={busy} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
        {busy ? "Sampling…" : "Run inference on all models"}
      </button>
      {ids.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground"><tr><th className="py-1">Model</th><th>Posterior (mean ± 1σ)</th><th>χ²</th><th>ΔBIC</th><th>Accept</th></tr></thead>
            <tbody>
              {ids.map((m, i) => (
                <tr key={m} className="border-t">
                  <td className="py-2">{MODELS[m].name}<div className="text-xs text-muted-foreground">{MODELS[m].assumptions}</div></td>
                  <td className="font-mono text-xs">{MODELS[m].free.map((k) => { const s = stats(runs[m]!.samples[k]!); return `${k}=${s.mean.toFixed(3)}±${s.sd.toFixed(3)}`; }).join("  ")}</td>
                  <td className="font-mono">{runs[m]!.bestChi2.toFixed(1)}</td>
                  <td className="font-mono">{(bics[i]! - minB).toFixed(1)}</td>
                  <td className="font-mono">{(runs[m]!.acceptance * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">ΔBIC &lt; 2 is not meaningful evidence. A better fit from an extended model is not, by itself, evidence of new physics.</p>
        </div>
      )}
    </section>
  );
}

export function CosmicWebExplorer() {
  const [seed, setSeed] = useState(11);
  const [running, setRunning] = useState(false);
  const [, tick] = useState(0);
  const sim = useRef(initParticles(20, 0.02, seed));
  const steps = useRef(0);

  useEffect(() => { sim.current = initParticles(20, 0.02, seed); steps.current = 0; tick((t) => t + 1); }, [seed]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      for (let k = 0; k < 4; k++) step(sim.current);
      steps.current += 4; tick((t) => t + 1);
      if (steps.current >= 600) setRunning(false);
    }, 30);
    return () => clearInterval(id);
  }, [running]);

  const b = sim.current, web = classifyWeb(b), S = 360;
  const fill = { void: "var(--background)", filament: "var(--chart-2)", cluster: "var(--chart-4)" } as const;
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Cosmic Web Explorer — N-Body Structure Formation</h2>
      <p className="text-sm text-muted-foreground">400 dark-matter particles in a periodic box collapse under gravity. Density contrast δ on a 10×10 grid classifies regions as voids, filaments or clusters.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-lg bg-background/40">
          {Array.from({ length: b.n }, (_, i) => <circle key={i} cx={b.x[i]! * S} cy={b.y[i]! * S} r={1.6} fill="var(--primary)" />)}
        </svg>
        <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-lg">
          {web.cells.map((c, i) => <rect key={i} x={(i % web.g) * (S / web.g)} y={Math.floor(i / web.g) * (S / web.g)} width={S / web.g} height={S / web.g} fill={fill[c.cls]} stroke="var(--border)" />)}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setRunning((r) => !r)} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{running ? "Pause" : "Run N-body"}</button>
        <button onClick={() => { setRunning(false); setSeed((s) => s + 1); }} className="rounded-lg border px-4 py-2 text-sm">New initial conditions</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Steps" value={String(steps.current)} />
        <Stat label="Density variance σ²" value={web.variance.toFixed(2)} />
        <Stat label="Clusters / filaments" value={`${(web.fractions.cluster * 100).toFixed(0)}% / ${(web.fractions.filament * 100).toFixed(0)}%`} />
        <Stat label="Voids" value={`${(web.fractions.void * 100).toFixed(0)}%`} />
      </div>
    </section>
  );
}

export function CosmoModelRegistry() {
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Cosmological Model Registry</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {(Object.keys(MODELS) as ModelId[]).map((m) => {
          const p = normalize(m, { H0: 70, Om: 0.3, Ol: 0.7, w: -1 });
          return (
            <li key={m} className="rounded-xl border p-3">
              <div className="font-medium">{MODELS[m].name}</div>
              <div className="text-xs text-muted-foreground">Assumptions: {MODELS[m].assumptions} · Free: {MODELS[m].free.join(", ")} · Priors: Ωm∈[0.01,1], ΩΛ∈[0,1.5], w∈[−2.5,0] · Fiducial age {age(p).toFixed(2)} Gyr</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
