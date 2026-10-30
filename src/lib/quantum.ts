// Minimal 2-qubit statevector simulator. Basis order |q1 q0>: 00, 01, 10, 11.
export type C = [number, number];
export type State = C[];
export type Gate = "H0" | "H1" | "X0" | "X1" | "Z0" | "Z1" | "CNOT";

export const zero = (): State => [[1, 0], [0, 0], [0, 0], [0, 0]];
const s = Math.SQRT1_2;

function single(st: State, q: number, m: [C, C, C, C]): State {
  const out = st.map(() => [0, 0] as C), bit = 1 << q;
  for (let i = 0; i < 4; i++) {
    if (i & bit) continue;
    const a = st[i]!, b = st[i | bit]!;
    const mul = (x: C, y: C): C => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
    const add = (x: C, y: C): C => [x[0] + y[0], x[1] + y[1]];
    out[i] = add(mul(m[0], a), mul(m[1], b));
    out[i | bit] = add(mul(m[2], a), mul(m[3], b));
  }
  return out;
}

export function apply(st: State, g: Gate): State {
  const q = g.endsWith("1") ? 1 : 0;
  if (g.startsWith("H")) return single(st, q, [[s, 0], [s, 0], [s, 0], [-s, 0]]);
  if (g.startsWith("X")) return single(st, q, [[0, 0], [1, 0], [1, 0], [0, 0]]);
  if (g.startsWith("Z")) return single(st, q, [[1, 0], [0, 0], [0, 0], [-1, 0]]);
  // CNOT: control q0, target q1 → swap 01 and 11
  return [st[0]!, st[3]!, st[2]!, st[1]!];
}

export const run = (gates: Gate[]) => gates.reduce(apply, zero());
export const probs = (st: State) => st.map(([r, i]) => r * r + i * i);

/** Concurrence: 0 = separable, 1 = maximally entangled. */
export function concurrence(st: State) {
  const [a, b, c, d] = st as [C, C, C, C];
  const re = a[0] * d[0] - a[1] * d[1] - (b[0] * c[0] - b[1] * c[1]);
  const im = a[0] * d[1] + a[1] * d[0] - (b[0] * c[1] + b[1] * c[0]);
  return 2 * Math.hypot(re, im);
}

/** Depolarizing noise mixes measurement probabilities toward uniform. */
export const noisy = (p: number[], lambda: number) => p.map((x) => (1 - lambda) * x + lambda / 4);
