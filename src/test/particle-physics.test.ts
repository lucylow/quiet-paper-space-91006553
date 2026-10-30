import { describe, expect, it } from "vitest";
import { antiKt, eventFeatures, fitTrack, generateDataset, generateEvent, hitPhi, identify, invariantMass, ptFromRadius, reconstructTracks, trackingEfficiency, truthClass } from "@/lib/particle-physics";

describe("particle physics engine", () => {
  it("pT = 0.3 B R", () => expect(ptFromRadius(1, 3.8)).toBeCloseTo(1.14));
  it("fits charge and pT from ideal hits", () => {
    const R = 5, hits = [0.1, 0.3, 0.5, 0.8, 1.0].map((r) => ({ r, phi: hitPhi(1, -1, R, r) }));
    const f = fitTrack(hits);
    expect(f.charge).toBe(-1);
    expect(f.pt).toBeCloseTo(ptFromRadius(R), 0);
  });
  it("Z→μμ events reconstruct near 91 GeV", () => {
    const m = eventFeatures(generateEvent("Z→μμ", 3)).leadingMass;
    expect(m).toBeGreaterThan(80); expect(m).toBeLessThan(102);
  });
  it("back-to-back massless pair mass", () => {
    expect(invariantMass([{ pt: 50, eta: 0, phi: 0, species: "photon" }, { pt: 50, eta: 0, phi: Math.PI, species: "photon" }])).toBeCloseTo(100);
  });
  it("tracking efficiency is high", () => {
    const ev = generateEvent("QCD dijet", 5);
    expect(trackingEfficiency(ev, reconstructTracks(ev.hits)).efficiency).toBeGreaterThan(0.7);
  });
  it("particle ID beats 85% on a sample", () => {
    let ok = 0, n = 0;
    generateDataset(50, 2).forEach((e) => e.particles.forEach((p) => { n++; if (identify(p).label === truthClass(p.species, p.charge)) ok++; }));
    expect(ok / n).toBeGreaterThan(0.85);
  });
  it("dijet events produce jets", () => expect(antiKt(generateEvent("QCD dijet", 9).particles).length).toBeGreaterThanOrEqual(2));
});
