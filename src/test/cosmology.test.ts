import { describe, expect, it } from "vitest";
import { age, bic, classifyWeb, distanceModulus, initParticles, mcmc, stats, syntheticSurvey } from "@/lib/cosmology";

const lcdm = { H0: 70, Om: 0.3, Ol: 0.7, w: -1 };

describe("cosmology", () => {
  it("age of Planck-like Λ-CDM is about 13.5 Gyr", () => {
    expect(age(lcdm)).toBeGreaterThan(13.2);
    expect(age(lcdm)).toBeLessThan(13.8);
  });
  it("distance modulus at z=1 is about 44.1", () => {
    expect(distanceModulus(1, lcdm)).toBeCloseTo(44.1, 0);
  });
  it("MCMC recovers Ωm near the truth", () => {
    const s = stats(mcmc("flat-lcdm", syntheticSurvey(lcdm, 60), 2000).samples["Om"]!);
    expect(Math.abs(s.mean - 0.3)).toBeLessThan(0.1);
  });
  it("BIC penalizes extra parameters", () => {
    expect(bic(50, 2, 60)).toBeGreaterThan(bic(50, 1, 60));
  });
  it("web fractions sum to 1", () => {
    const f = classifyWeb(initParticles()).fractions;
    expect(f.void + f.filament + f.cluster).toBeCloseTo(1);
  });
});
