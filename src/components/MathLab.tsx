import { useMemo, useState } from "react";
import { compileExpression, numericalDerivative } from "@/lib/math-engine";

const W = 800;
const H = 200;
const SAMPLES = 160;
const RANGE = 10; // x ∈ [-10, 10]

export function MathLab() {
  const [expr, setExpr] = useState("sin(x) * exp(-x^2 / 20)");
  const [probeX, setProbeX] = useState(2);

  const computed = useMemo(() => {
    try {
      const fn = compileExpression(expr);
      const xs = Array.from({ length: SAMPLES }, (_, i) => (i / (SAMPLES - 1)) * 2 * RANGE - RANGE);
      const ys = xs.map((x) => fn(x));
      const finite = ys.filter(Number.isFinite);
      if (!finite.length) return { error: "Expression is not finite on [-10, 10]" };
      const yMin = Math.min(...finite);
      const yMax = Math.max(...finite);
      const span = yMax - yMin || 1;
      const path = xs
        .map((x, i) => {
          const y = ys[i]!;
          if (!Number.isFinite(y)) return null;
          const px = ((x + RANGE) / (2 * RANGE)) * W;
          const py = H - ((y - yMin) / span) * H;
          return `${px === 0 ? "M" : "L"}${px},${py}`;
        })
        .filter(Boolean)
        .join("");
      return {
        path,
        value: fn(probeX),
        derivative: numericalDerivative(fn, probeX),
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid expression" };
    }
  }, [expr, probeX]);

  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Math Engine</h2>
      <p className="text-sm text-muted-foreground">
        Parsed and evaluated by a real expression engine — supports + − × ÷ ^, parentheses,
        sin cos tan exp log sqrt abs, constants pi and e, and the variable x.
      </p>
      <input
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        placeholder="e.g. x^2 - 3x + 2"
        className="mt-4 w-full rounded-xl border bg-background/50 px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      {"error" in computed ? (
        <p className="mt-4 text-sm text-destructive">Parse error: {computed.error}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full">
            <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeDasharray="3 5" />
            <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="var(--border)" strokeDasharray="3 5" />
            <path d={computed.path} fill="none" stroke="var(--primary)" strokeWidth={1.5} />
          </svg>
          <label className="mt-4 block text-sm">
            Evaluate at x = <b>{probeX.toFixed(1)}</b>
            <input
              type="range"
              min={-RANGE}
              max={RANGE}
              step={0.1}
              value={probeX}
              onChange={(e) => setProbeX(+e.target.value)}
              className="w-full"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-3 text-sm [&>span]:rounded-full [&>span]:border [&>span]:px-3 [&>span]:py-1">
            <span>f(x) = <b>{computed.value.toFixed(6)}</b></span>
            <span>f′(x) ≈ <b>{computed.derivative.toFixed(6)}</b></span>
            <span>Method: <b>central difference</b></span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Limitations: numerical differentiation only — no symbolic simplification or unit checking yet.
          </p>
        </>
      )}
    </section>
  );
}
