import { useMemo, useState } from "react";
import { createRng } from "@/lib/lightcurve";

const W = 800;
const H = 200;

export function PinnLab() {
  const [lambda, setLambda] = useState(0.5);
  const [epochs, setEpochs] = useState(50);

  const { truth, pred, mse } = useMemo(() => {
    const n = 120;
    const truth = Array.from({ length: n }, (_, i) => Math.sin((i / n) * Math.PI * 4));
    const k = 1 - Math.exp(-epochs / 40);
    const r = createRng(3);
    const pred = truth.map((y) => y * k * (0.6 + 0.4 * lambda) + r() * (1 - lambda) * 0.6);
    const mse = pred.reduce((a, p, i) => a + (p - (truth[i] ?? 0)) ** 2, 0) / n;
    return { truth, pred, mse };
  }, [lambda, epochs]);

  const line = (a: number[]) =>
    a.map((y, i) => `${i ? "L" : "M"}${(i / (a.length - 1)) * W},${H / 2 - y * H * 0.4}`).join("");

  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Physics-Informed Model Lab</h2>
      <p className="text-sm text-muted-foreground">
        Raise the physics weight to make the model respect the laws of motion.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full">
        <path d={line(truth)} fill="none" stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <path d={line(pred)} fill="none" stroke="var(--primary)" strokeWidth={1.5} />
      </svg>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
        <label>
          Physics weight: <b>{lambda.toFixed(2)}</b>
          <input type="range" min={0} max={1} step={0.05} value={lambda} onChange={(e) => setLambda(+e.target.value)} className="w-full" />
        </label>
        <label>
          Training epochs: <b>{epochs}</b>
          <input type="range" min={1} max={200} value={epochs} onChange={(e) => setEpochs(+e.target.value)} className="w-full" />
        </label>
      </div>
      <p className="mt-4 text-sm">Error (MSE): <b>{mse.toFixed(4)}</b></p>
    </section>
  );
}
