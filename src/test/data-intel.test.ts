import { describe, it, expect } from "vitest";
import { newPipeline, step, cancel, retry, archive, PIPELINE_STAGES, qualityScore, crossMatch, angularSeparationArcsec } from "@/lib/data-intel";

const run = (p: ReturnType<typeof newPipeline>, n: number) => { for (let i = 0; i < n; i++) p = step(p, 0); return p; };

describe("pipeline lifecycle", () => {
  it("goes Draft → Completed through all 13 stages", () => {
    const p = run(newPipeline("p", "s", "d"), 4 + PIPELINE_STAGES.length);
    expect(p.state).toBe("Completed");
    expect(p.outputs.length).toBe(1);
  });
  it("fails at configured stage, retry then completes", () => {
    let p = run(newPipeline("p", "s", "d", 5), 4 + 5 + 1);
    expect(p.state).toBe("Failed");
    p = retry(p, 0);
    expect(p.state).toBe("Queued");
    p = run(p, 1 + PIPELINE_STAGES.length);
    expect(p.state).toBe("Completed");
  });
  it("cancel only from active states; archive only from terminal", () => {
    const draft = newPipeline("p", "s", "d");
    expect(cancel(draft).state).toBe("Draft");
    expect(archive(draft).state).toBe("Draft");
    const running = run(draft, 4);
    expect(cancel(running).state).toBe("Cancelled");
    expect(archive(cancel(running)).state).toBe("Archived");
  });
});

describe("quality score", () => {
  it("averages completeness and validity", () => {
    const r = qualityScore([{ m: 1 }, { m: null }, { m: 99 }, { m: 2 }], [{ name: "m", min: 0, max: 10 }]);
    expect(r.completeness).toBe(0.75);
    expect(r.validity).toBeCloseTo(2 / 3);
    expect(r.score).toBe(71);
  });
});

describe("cross-match", () => {
  it("1 degree of declination is 3600 arcsec", () => {
    expect(angularSeparationArcsec({ id: "a", ra: 10, dec: 0 }, { id: "b", ra: 10, dec: 1 })).toBeCloseTo(3600, 3);
  });
  it("matches within radius only", () => {
    const m = crossMatch([{ id: "a", ra: 10, dec: 20 }, { id: "x", ra: 50, dec: 0 }], [{ id: "b", ra: 10, dec: 20 + 1 / 3600 }], 2);
    expect(m[0]!.b).toBe("b");
    expect(m[1]!.b).toBeNull();
  });
});
