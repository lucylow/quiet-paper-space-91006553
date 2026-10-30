import { describe, expect, it } from "vitest";
import { classifyTask, MODEL_REGISTRY } from "@/lib/scientific-ai";
import { simulateLightCurve, recoverPeriod } from "@/lib/lightcurve";
import { compileExpression, numericalDerivative } from "@/lib/math-engine";

describe("classifyTask", () => {
  it("routes transit questions to time-series analysis", () => {
    const r = classifyTask("Is there a planet transiting this star?");
    expect(r.task).toBe("time_series_analysis");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.matchedKeywords.length).toBeGreaterThan(0);
  });

  it("routes quantum questions to physical simulation", () => {
    expect(classifyTask("simulate a quantum circuit with two qubits").task).toBe("physical_simulation");
  });

  it("routes equation questions to equation analysis", () => {
    expect(classifyTask("solve the derivative of x^2").task).toBe("equation_analysis");
  });

  it("falls back to research assistance with zero confidence for unknown topics", () => {
    const r = classifyTask("hello there");
    expect(r.task).toBe("research_assistance");
    expect(r.confidence).toBe(0);
  });

  it("surfaces alternatives when multiple domains match", () => {
    const r = classifyTask("forecast the orbit of this exoplanet from its light curve");
    expect(r.alternatives.length).toBeGreaterThan(0);
  });
});

describe("model registry", () => {
  it("every model declares modalities, schemas and limitations", () => {
    for (const m of MODEL_REGISTRY) {
      expect(m.modalities.length).toBeGreaterThan(0);
      expect(m.inputSchema).toBeTruthy();
      expect(m.outputSchema).toBeTruthy();
      expect(m.limitations).toBeTruthy();
    }
  });
});

describe("light curve simulation", () => {
  it("recovers the injected orbital period", () => {
    const r = simulateLightCurve({ period: 3, radius: 0.1, noise: 0.002 });
    expect(r.recoveredPeriod).not.toBeNull();
    expect(Math.abs(r.recoveredPeriod! - 3)).toBeLessThan(0.2);
  });

  it("detects a strong signal and rejects a sub-threshold one", () => {
    expect(simulateLightCurve({ period: 3, radius: 0.1, noise: 0.002 }).detected).toBe(true);
    expect(simulateLightCurve({ period: 3, radius: 0.02, noise: 0.01 }).detected).toBe(false);
  });

  it("recoverPeriod returns null with fewer than two dips", () => {
    expect(recoverPeriod([1.5])).toBeNull();
    expect(recoverPeriod([])).toBeNull();
  });
});

describe("math engine", () => {
  it("evaluates arithmetic with precedence", () => {
    expect(compileExpression("2 + 3 * 4")(0)).toBe(14);
  });

  it("evaluates the variable and implicit multiplication", () => {
    expect(compileExpression("2x + 1")(3)).toBe(7);
  });

  it("evaluates functions, constants and powers", () => {
    expect(compileExpression("sin(pi / 2)")(0)).toBeCloseTo(1, 10);
    expect(compileExpression("x^2")(4)).toBe(16);
    expect(compileExpression("sqrt(abs(-9))")(0)).toBe(3);
  });

  it("handles unary minus", () => {
    expect(compileExpression("-x + 5")(2)).toBe(3);
  });

  it("differentiates x^2 to approximately 2x", () => {
    const fn = compileExpression("x^2");
    expect(numericalDerivative(fn, 3)).toBeCloseTo(6, 3);
  });

  it("rejects invalid input instead of evaluating it", () => {
    expect(() => compileExpression("2 +")).toThrow();
    expect(() => compileExpression("hello(1)")).toThrow();
    expect(() => compileExpression("(1 + 2")).toThrow();
  });
});
