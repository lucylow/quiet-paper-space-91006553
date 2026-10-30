import { describe, expect, it } from "vitest";
import { estimateParams, maxError, observe, simulate } from "@/lib/physics-sim";

const p = { w0: 2, zeta: 0.1, x0: 1, v0: 0 };

describe("physics-sim", () => {
  it("RK4 is far more accurate than Euler", () => {
    expect(maxError(simulate(p, "rk4", 0.1, 20), p)).toBeLessThan(1e-3);
    expect(maxError(simulate(p, "euler", 0.1, 20), p)).toBeGreaterThan(0.1);
  });
  it("recovers hidden parameters from noisy data", () => {
    const fit = estimateParams(observe(p, 20, 60, 0.05), 1, 0);
    expect(fit.w0).toBeCloseTo(2, 1);
    expect(fit.zeta).toBeCloseTo(0.1, 1);
  });
});
