import { describe, expect, it } from "vitest";
import { MATERIALS, benchmark, buildCrystal, crystalGraph, cubicElastic, debyeCv, density, dos, energyAboveHull, initMD, mdEnergy, mdStep, tbEnergy, validateStructure } from "@/lib/materials";

const SI = MATERIALS[0]!;
const cn = (lattice: "sc" | "bcc" | "fcc" | "diamond" | "rocksalt") => crystalGraph(buildCrystal({ lattice, a: 4, elements: lattice === "rocksalt" ? ["Na", "Cl"] : ["Cu"] }, 3), 12).coordination[0];

describe("materials engine", () => {
  it("coordination numbers: sc 6, bcc 8, fcc 12, diamond 4, rocksalt 6", () => {
    expect(cn("sc")).toBe(6); expect(cn("bcc")).toBe(8); expect(cn("fcc")).toBe(12); expect(cn("diamond")).toBe(4); expect(cn("rocksalt")).toBe(6);
  });
  it("Si density ≈ 2.33 g/cm³", () => expect(density(SI)).toBeCloseTo(2.33, 1));
  it("flags overlapping atoms", () => {
    const atoms = [...buildCrystal(SI), { el: "Si", pos: [0.3, 0, 0] as [number, number, number] }];
    expect(validateStructure(atoms, SI.a).valid).toBe(false);
    expect(validateStructure(buildCrystal(SI, 2), 2 * SI.a).valid).toBe(true);
  });
  it("simple cubic s-band spans 12t", () => {
    expect(tbEnergy("sc", [0, 0, 0])).toBe(-6);
    expect(dos("sc").width).toBeGreaterThan(11); expect(dos("sc").width).toBeLessThanOrEqual(12);
  });
  it("band-gap model beats mean baseline in leave-one-out", () => {
    const b = benchmark(MATERIALS, "bandGap");
    expect(b.mae).toBeLessThan(b.baseline);
  });
  it("Lennard-Jones MD conserves energy", () => {
    let s = initMD(5, 1.12, 0.4, 3); const e0 = mdEnergy(s).total;
    s = mdStep(s, 0.002, 300);
    expect(Math.abs(mdEnergy(s).total - e0) / s.x.length).toBeLessThan(0.01);
  });
  it("energy above hull", () => {
    const pts = [{ x: 0, e: 0, label: "A" }, { x: 0.5, e: -1, label: "AB" }, { x: 1, e: 0, label: "B" }];
    expect(energyAboveHull(pts, { x: 0.25, e: -0.3, label: "A3B" })).toBeCloseTo(0.2);
  });
  it("Cu elastic moduli (VRH)", () => {
    const r = cubicElastic(168, 121, 75);
    expect(r.K).toBeCloseTo(136.7, 0); expect(r.ductile).toBe(true); expect(r.stable).toBe(true);
  });
  it("Debye Cv → 3R at high T", () => expect(debyeCv(5000, 300)).toBeCloseTo(24.94, 0));
});
