import { useMemo, useState } from "react";
import { lightCurveToCsv, simulateLightCurve } from "@/lib/lightcurve";
import { OrbitView } from "@/components/OrbitView";

const W = 800;
const H = 240;

interface SliderSpec {
  label: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
  step: number;
  digits: number;
}

export function TransitLab() {
  const [period, setPeriod] = useState(3);
  const [radius, setRadius] = useState(0.1);
  const [noise, setNoise] = useState(0.002);

  const result = useMemo(
    () => simulateLightCurve({ period, radius, noise }),
    [period, radius, noise],
  );

  const min = 1 - result.depth - noise * 3;
  const max = 1 + noise * 3;
  const path = result.points
    .map((p, i) => `${i ? "L" : "M"}${(p.t / 15) * W},${H - ((p.f - min) / (max - min)) * H}`)
    .join("");

  const sliders: SliderSpec[] = [
    { label: "Orbital period (days)", value: period, set: setPeriod, min: 1, max: 7, step: 0.1, digits: 2 },
    { label: "Planet/star radius", value: radius, set: setRadius, min: 0.02, max: 0.2, step: 0.005, digits: 3 },
    { label: "Noise level", value: noise, set: setNoise, min: 0.0005, max: 0.01, step: 0.0005, digits: 4 },
  ];

  const exportCsv = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lightCurveToCsv(result.points)], { type: "text/csv" }));
    a.download = "light-curve.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="mt-10 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Transit Light-Curve Lab</h2>
      <OrbitView period={period} radius={radius} />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full">
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={1.5} />
      </svg>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {sliders.map((s) => (
          <label key={s.label} className="text-sm">
            {s.label}: <b>{s.value.toFixed(s.digits)}</b>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={s.value}
              onChange={(e) => s.set(+e.target.value)}
              className="w-full accent-[var(--primary)]"
            />
          </label>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 text-sm [&>span]:rounded-full [&>span]:border [&>span]:px-3 [&>span]:py-1">
        <span>Transit depth: <b>{(result.depth * 100).toFixed(3)}%</b></span>
        <span>SNR: <b>{result.snr.toFixed(1)}</b></span>
        <span className={result.detected ? "text-primary" : "text-destructive"}>
          {result.detected ? "● Candidate detected" : "○ Below threshold"}
        </span>
        <span>Dips found: <b>{result.dipStarts.length}</b></span>
        <span>Recovered period: <b>{result.recoveredPeriod ? result.recoveredPeriod.toFixed(2) + " d" : "—"}</b></span>
        <button
          className="rounded-full border px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={exportCsv}
        >
          ⬇ Export CSV
        </button>
      </div>
    </section>
  );
}
