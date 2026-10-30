import { useState } from "react";
import { concurrence, noisy, probs, run, type Gate } from "@/lib/quantum";

const GATES: Gate[] = ["H0", "H1", "X0", "X1", "Z0", "Z1", "CNOT"];

export function QuantumLab() {
  const [circuit, setCircuit] = useState<Gate[]>(["H0", "CNOT"]);
  const [noise, setNoise] = useState(0);
  const st = run(circuit), p = noisy(probs(st), noise);
  return (
    <section className="mt-8 rounded-2xl border panel p-5 sm:p-8">
      <h2 className="text-xl font-semibold">Quantum Intelligence — Circuit Simulator</h2>
      <p className="text-sm text-muted-foreground">Build a 2-qubit circuit, simulate the exact state, measure entanglement and add depolarizing noise.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {GATES.map((g) => <button key={g} onClick={() => setCircuit((c) => [...c, g])} className="rounded-lg border px-3 py-1.5 font-mono text-sm">+{g}</button>)}
        <button onClick={() => setCircuit([])} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">Reset</button>
      </div>
      <p className="mt-3 font-mono text-sm">|00⟩ → {circuit.join(" → ") || "(empty)"}</p>
      <label className="mt-3 block text-xs text-muted-foreground">Noise λ: <span className="font-mono text-foreground">{noise}</span>
        <input type="range" min={0} max={1} step={0.05} value={noise} onChange={(e) => setNoise(Number(e.target.value))} className="w-full" />
      </label>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {p.map((x, i) => (
          <div key={i} className="rounded-xl border p-3 text-center">
            <div className="mx-auto h-24 w-6 rounded bg-background/40 flex items-end"><div className="w-full rounded bg-primary" style={{ height: `${x * 100}%` }} /></div>
            <div className="mt-2 font-mono text-xs">|{i.toString(2).padStart(2, "0")}⟩ {(x * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm">Entanglement (concurrence): <span className="font-mono">{concurrence(st).toFixed(3)}</span></p>
    </section>
  );
}
