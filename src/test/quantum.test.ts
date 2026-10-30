import { expect, it } from "vitest";
import { concurrence, probs, run } from "@/lib/quantum";

it("Bell state is 50/50 and maximally entangled", () => {
  const st = run(["H0", "CNOT"]);
  const p = probs(st);
  expect(p[0]).toBeCloseTo(0.5);
  expect(p[3]).toBeCloseTo(0.5);
  expect(concurrence(st)).toBeCloseTo(1);
});
it("product state has zero entanglement", () => {
  expect(concurrence(run(["H0", "H1"]))).toBeCloseTo(0);
});
