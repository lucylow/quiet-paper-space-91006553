import { describe, expect, it } from "vitest";
import { C, borisOrbit, brioWu, dtReactivity, evaluateDetector, fitSlope, ignitionTriple, initTwoStream, mhdStep, mhdTotals, picStep, plasmaParams, powerSpectrum, synthShots, synthTurbulence } from "@/lib/plasma";

describe("plasma engine", () => {
  it("Debye length and plasma frequency", () => {
    const p = plasmaParams({ n: 1e18, Te: 10, Ti: 10, B: 1, A: 1 });
    expect(p.debye).toBeCloseTo(2.35e-5, 6);
    expect(p.fpe / 1e9).toBeCloseTo(8.98, 1);
  });
  it("Boris pusher conserves speed and gives Larmor radius", () => {
    const B = 1, v = 1e5, { path, v: vf } = borisOrbit(C.e, C.mp, [0, 0, 0], [0, 0, B], [v, 0, 0], 1e-10, 2000);
    expect(Math.hypot(...vf)).toBeCloseTo(v, -1);
    const maxY = Math.max(...path.map((p) => Math.abs(p[1])));
    expect(maxY / 2).toBeCloseTo((C.mp * v) / (C.e * B), 5);
  });
  it("E×B drift = E/B", () => {
    const { path } = borisOrbit(C.e, C.mp, [1e3, 0, 0], [0, 0, 1], [0, 0, 0], 1e-9, 20000);
    const t = 20000 * 1e-9;
    expect(-path[path.length - 1][1] / t).toBeCloseTo(1e3, -2);
  });
  it("MHD conserves mass", () => {
    let s = brioWu(100); const m0 = mhdTotals(s).mass;
    while (s.t < 0.05) s = mhdStep(s);
    expect(mhdTotals(s).mass).toBeCloseTo(m0, 3);
  });
  it("two-stream instability grows field energy", () => {
    let s = initTwoStream(2000, 32);
    s = picStep(s, 0.1, 150);
    expect(Math.max(...s.history.slice(100))).toBeGreaterThan(100 * s.history[5]);
  });
  it("recovers Kolmogorov −5/3 slope", () => expect(fitSlope(powerSpectrum(synthTurbulence(512)), 4, 200)).toBeCloseTo(-5 / 3, 1));
  it("D–T reactivity at 10 keV ≈ 1.1e-22 m³/s", () => expect(dtReactivity(10) / 1e-22).toBeCloseTo(1.1, 0));
  it("ignition triple product minimum ≈ 3e21 near 14 keV", () => {
    const v = ignitionTriple(14); expect(v).toBeGreaterThan(2.5e21); expect(v).toBeLessThan(3.5e21);
  });
  it("disruption detector finds most disruptions with warning", () => {
    const r = evaluateDetector(synthShots(), 0.2);
    expect(r.recall).toBeGreaterThan(0.8); expect(r.falseAlarm).toBeLessThan(0.1); expect(r.meanWarning).toBeGreaterThan(0.05);
  });
});
