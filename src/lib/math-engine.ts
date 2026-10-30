/**
 * Math engine — safe expression parsing and numerical methods.
 *
 * A small shunting-yard parser supporting + - * / ^, parentheses,
 * functions (sin cos tan exp log sqrt abs), constants (pi, e) and the
 * variable x. No eval(). Numerical differentiation via central difference.
 */

type Token =
  | { kind: "num"; value: number }
  | { kind: "var" }
  | { kind: "fn"; name: string }
  | { kind: "op"; op: string }
  | { kind: "lparen" }
  | { kind: "rparen" };

const FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  log: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3, u: 4 };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = input.toLowerCase().replace(/\s+/g, "");

  while (i < src.length) {
    const ch = src[i]!;
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      const value = Number(src.slice(i, j));
      if (Number.isNaN(value)) throw new Error(`Invalid number near "${src.slice(i, j)}"`);
      tokens.push({ kind: "num", value });
      i = j;
    } else if (/[a-z]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-z]/.test(src[j]!)) j++;
      const word = src.slice(i, j);
      if (word === "x") tokens.push({ kind: "var" });
      else if (word in CONSTANTS) tokens.push({ kind: "num", value: CONSTANTS[word]! });
      else if (word in FUNCTIONS) tokens.push({ kind: "fn", name: word });
      else throw new Error(`Unknown name "${word}"`);
      i = j;
    } else if ("+-*/^".includes(ch)) {
      tokens.push({ kind: "op", op: ch });
      i++;
    } else if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i++;
    } else if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
    } else {
      throw new Error(`Unexpected character "${ch}"`);
    }
  }
  return tokens;
}

/** Insert implicit multiplication: 2x, 2(x+1), (x+1)(x-1), x sin(x). */
function withImplicitMultiplication(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    const prevIsValue = prev && (prev.kind === "num" || prev.kind === "var" || prev.kind === "rparen");
    const curOpensValue = t.kind === "num" || t.kind === "var" || t.kind === "fn" || t.kind === "lparen";
    if (prevIsValue && curOpensValue) out.push({ kind: "op", op: "*" });
    out.push(t);
  }
  return out;
}

type RpnItem = { kind: "num"; value: number } | { kind: "var" } | { kind: "fn"; name: string } | { kind: "op"; op: string };

function toRpn(tokens: Token[]): RpnItem[] {
  const output: RpnItem[] = [];
  const stack: Token[] = [];

  tokens.forEach((token, idx) => {
    if (token.kind === "num" || token.kind === "var") {
      output.push(token);
    } else if (token.kind === "fn") {
      stack.push(token);
    } else if (token.kind === "op") {
      // Unary minus: at start, after an operator, or after "(".
      const prev = tokens[idx - 1];
      const isUnary = token.op === "-" && (!prev || prev.kind === "op" || prev.kind === "lparen");
      const op = isUnary ? "u" : token.op;
      while (stack.length) {
        const top = stack[stack.length - 1]!;
        if (top.kind === "fn") {
          output.push(top as RpnItem);
          stack.pop();
        } else if (top.kind === "op") {
          const topOp = top.op === "u" ? "u" : top.op;
          const topPrec = PRECEDENCE[topOp]!;
          const prec = PRECEDENCE[op]!;
          // ^ and unary minus are right-associative.
          if (topPrec > prec || (topPrec === prec && op !== "^" && op !== "u")) {
            output.push({ kind: "op", op: top.op });
            stack.pop();
          } else break;
        } else break;
      }
      stack.push({ kind: "op", op });
    } else if (token.kind === "lparen") {
      stack.push(token);
    } else {
      while (stack.length && stack[stack.length - 1]!.kind !== "lparen") {
        output.push(stack.pop() as RpnItem);
      }
      if (!stack.length) throw new Error("Mismatched parentheses");
      stack.pop();
      if (stack.length && stack[stack.length - 1]!.kind === "fn") {
        output.push(stack.pop() as RpnItem);
      }
    }
  });

  while (stack.length) {
    const top = stack.pop()!;
    if (top.kind === "lparen") throw new Error("Mismatched parentheses");
    output.push(top as RpnItem);
  }
  return output;
}

export type CompiledExpression = (x: number) => number;

/** Parse and compile an expression in x. Throws on invalid input. */
export function compileExpression(input: string): CompiledExpression {
  const rpn = toRpn(withImplicitMultiplication(tokenize(input)));
  if (!rpn.length) throw new Error("Empty expression");

  // Validate arity up front so malformed expressions (e.g. "2 +") fail at
  // parse time instead of first evaluation.
  let depth = 0;
  for (const item of rpn) {
    if (item.kind === "num" || item.kind === "var") depth++;
    else if (item.kind === "fn" || item.op === "u") {
      if (depth < 1) throw new Error("Invalid expression");
    } else {
      if (depth < 2) throw new Error("Invalid expression");
      depth--;
    }
  }
  if (depth !== 1) throw new Error("Invalid expression");

  return (x: number) => {
    const stack: number[] = [];
    for (const item of rpn) {
      if (item.kind === "num") stack.push(item.value);
      else if (item.kind === "var") stack.push(x);
      else if (item.kind === "fn") {
        const v = stack.pop();
        if (v === undefined) throw new Error("Invalid expression");
        stack.push(FUNCTIONS[item.name]!(v));
      } else {
        if (item.op === "u") {
          const v = stack.pop();
          if (v === undefined) throw new Error("Invalid expression");
          stack.push(-v);
        } else {
          const b = stack.pop();
          const a = stack.pop();
          if (a === undefined || b === undefined) throw new Error("Invalid expression");
          stack.push(
            item.op === "+" ? a + b
            : item.op === "-" ? a - b
            : item.op === "*" ? a * b
            : item.op === "/" ? a / b
            : a ** b,
          );
        }
      }
    }
    if (stack.length !== 1) throw new Error("Invalid expression");
    return stack[0]!;
  };
}

/** Central-difference numerical derivative. */
export function numericalDerivative(fn: CompiledExpression, x: number, h = 1e-5): number {
  return (fn(x + h) - fn(x - h)) / (2 * h);
}
