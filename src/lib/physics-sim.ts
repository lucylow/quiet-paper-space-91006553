// Damped driven oscillator: x'' + 2*zeta*w0*x' + w0^2 x = 0
export interface OscParams { w0: number; zeta: number; x0: number; v0: number }
export type Solver = "euler" | "rk4";
export interface Trajectory { t: number[]; x: number[] }

function deriv(p: OscParams, x: number, v: number): [number, number] {
  return [v, -2 * p.zeta * p.w0 * v - p.w0 * p.w0 * x];
}

export function simulate(p: OscParams, solver: Solver, dt: number, T: number): Trajectory {
  const n = Math.round(T / dt);
  const t = [0], xs = [p.x0];
  let x = p.x0, v = p.v0;
  for (let i = 1; i <= n; i++) {
    if (solver === "euler") {
      const [dx, dv] = deriv(p, x, v);
      x += dt * dx; v += dt * dv;
    } else {
      const [a1, b1] = deriv(p, x, v);
      const [a2, b2] = deriv(p, x + (dt / 2) * a1, v + (dt / 2) * b1);
      const [a3, b3] = deriv(p, x + (dt / 2) * a2, v + (dt / 2) * b2);
      const [a4, b4] = deriv(p, x + dt * a3, v + dt * b3);
      x += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
      v += (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
    }
    t.push(i * dt); xs.push(x);
  }
  return { t, x: xs };
}

/** Analytic solution for underdamped case (zeta < 1). */
export function analytic(p: OscParams, t: number): number {
  const wd = p.w0 * Math.sqrt(1 - p.zeta * p.zeta);
  const A = p.x0, B = (p.v0 + p.zeta * p.w0 * p.x0) / wd;
  return Math.exp(-p.zeta * p.w0 * t) * (A * Math.cos(wd * t) + B * Math.sin(wd * t));
}

export function maxError(traj: Trajectory, p: OscParams): number {
  return traj.t.reduce((m, t, i) => Math.max(m, Math.abs(traj.x[i]! - analytic(p, t))), 0);
}

/** Seeded PRNG for reproducible noise. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function observe(p: OscParams, T: number, n: number, noise: number, seed = 7) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * T;
    return { t, x: analytic(p, t) + (r() - 0.5) * 2 * noise };
  });
}

/** Inverse problem: grid + refinement search for w0, zeta minimizing MSE. */
export function estimateParams(obs: { t: number; x: number }[], x0: number, v0: number) {
  const mse = (w0: number, zeta: number) =>
    obs.reduce((s, o) => s + (analytic({ w0, zeta, x0, v0 }, o.t) - o.x) ** 2, 0) / obs.length;
  let best = { w0: 1, zeta: 0.1, loss: Infinity };
  for (let w = 0.2; w <= 6; w += 0.05)
    for (let z = 0; z < 0.95; z += 0.01) {
      const l = mse(w, z);
      if (l < best.loss) best = { w0: w, zeta: z, loss: l };
    }
  let step = 0.025, zs = 0.005;
  for (let k = 0; k < 40; k++) {
    let improved = false;
    for (const [dw, dz] of [[step, 0], [-step, 0], [0, zs], [0, -zs]] as const) {
      const w = best.w0 + dw, z = Math.min(0.99, Math.max(0, best.zeta + dz));
      const l = mse(w, z);
      if (l < best.loss) { best = { w0: w, zeta: z, loss: l }; improved = true; }
    }
    if (!improved) { step /= 2; zs /= 2; }
  }
  return best;
}

/** Monte Carlo uncertainty band from perturbed parameters. */
export function ensemble(p: OscParams, spread: number, runs: number, dt: number, T: number) {
  const r = rng(42);
  const trajs = Array.from({ length: runs }, () =>
    simulate({ ...p, w0: p.w0 * (1 + (r() - 0.5) * 2 * spread), zeta: Math.max(0, p.zeta * (1 + (r() - 0.5) * 2 * spread)) }, "rk4", dt, T),
  );
  const n = trajs[0]!.t.length;
  const lo: number[] = [], hi: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = trajs.map((tr) => tr.x[i]!);
    lo.push(Math.min(...v)); hi.push(Math.max(...v));
  }
  return { t: trajs[0]!.t, lo, hi };
}
