import { useMemo, useState } from "react";
import { analytic, ensemble, estimateParams, maxError, observe, simulate } from "@/lib/physics-sim";

const W = 800, H = 220, T = 20;

function toPath(t: number[], x: number[], yMax: number) {
  return t.map((ti, i) => `${i ? "L" : "M"}${(ti / T) * W},${H / 2 - (x[i]! / yMax) * (H / 2 - 8)}`).join("");
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}: <span className="font-mono text-foreground">{value}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  );
}

export function PhysicsSimLab() {
  const [w0, setW0] = useState(2);
  const [zeta, setZeta] = useState(0.1);
  const [dt, setDt] = useState(0.1);
  const [spread, setSpread] = useState(0.05);
  const [noise, setNoise] = useState(0.1);
  const [fit, setFit] = useState<ReturnType<typeof estimateParams> | null>(null);
  const p = { w0, zeta, x0: 1, v0: 0 };

  const r = useMemo(() => {
    const euler = simulate(p, "euler", dt, T);
    const rk4 = simulate(p, "rk4", dt, T);
    const ens = ensemble(p, spread, 30, 0.05, T);
    const obs = observe(p, T, 60, noise);
    const yMax = Math.max(1.2, ...euler.x.map(Math.abs).filter(Number.isFinite).slice(0, 400)) ;
    return { euler, rk4, ens, obs, yMax: Math.min(yMax, 5), eErr: maxError(euler, p), rErr: maxError(rk4, p) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w0, zeta, dt, spread, noise]);

  const band = `${r.ens.t.map((t, i) => `${i ? "L" : "M"}${(t / T) * W},${H / 2 - (r.ens.hi[i]! / r.yMax) * (H / 2 - 8)}`).join("")}${[...r.ens.t].reverse().map((t, j) => { const i = r.ens.t.length - 1 - j; return `L${(t / T) * W},${H / 2 - (r.ens.lo[i]! / r.yMax) * (H / 2 - 8)}`; }).join("")}Z`;
  const fitT = Array.from({ length: 200 }, (_, i) => (i / 199) * T);

  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">AI Physics Simulation Intelligence</h2>
      <p className="text-sm text-muted-foreground">
        Damped oscillator digital twin: numerical solvers (Euler vs RK4) against the exact solution,
        Monte Carlo uncertainty, and inverse estimation of hidden parameters from noisy observations.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Slider label="Natural frequency ω₀" value={w0} min={0.5} max={5} step={0.1} onChange={setW0} />
        <Slider label="Damping ζ" value={zeta} min={0} max={0.9} step={0.01} onChange={setZeta} />
        <Slider label="Time step dt" value={dt} min={0.01} max={0.3} step={0.01} onChange={setDt} />
        <Slider label="Parameter uncertainty ±" value={spread} min={0} max={0.3} step={0.01} onChange={setSpread} />
        <Slider label="Sensor noise" value={noise} min={0} max={0.5} step={0.01} onChange={setNoise} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full rounded-lg bg-background/40">
        <path d={band} fill="var(--primary)" opacity={0.15} />
        <path d={toPath(r.euler.t, r.euler.x, r.yMax)} fill="none" stroke="var(--destructive)" strokeWidth={1.5} />
        <path d={toPath(r.rk4.t, r.rk4.x, r.yMax)} fill="none" stroke="var(--primary)" strokeWidth={2} />
        {r.obs.map((o, i) => <circle key={i} cx={(o.t / T) * W} cy={H / 2 - (o.x / r.yMax) * (H / 2 - 8)} r={2.5} fill="var(--foreground)" opacity={0.6} />)}
        {fit && <path d={toPath(fitT, fitT.map((t) => analytic({ ...p, w0: fit.w0, zeta: fit.zeta }, t)), r.yMax)} fill="none" stroke="var(--accent-foreground)" strokeDasharray="5 4" strokeWidth={1.5} />}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">Blue: RK4 · Red: Euler · Band: uncertainty ensemble · Dots: observations · Dashed: fitted twin</p>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border p-3">Euler max error<div className="font-mono text-lg">{Number.isFinite(r.eErr) ? r.eErr.toExponential(2) : "diverged"}</div></div>
        <div className="rounded-xl border p-3">RK4 max error<div className="font-mono text-lg">{r.rErr.toExponential(2)}</div></div>
        <div className="rounded-xl border p-3">
          <button onClick={() => setFit(estimateParams(r.obs, 1, 0))} className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">Estimate hidden parameters</button>
          {fit && <div className="mt-2 font-mono text-xs">ω₀ ≈ {fit.w0.toFixed(3)} · ζ ≈ {fit.zeta.toFixed(3)} · MSE {fit.loss.toExponential(1)}</div>}
        </div>
      </div>
    </section>
  );
}
