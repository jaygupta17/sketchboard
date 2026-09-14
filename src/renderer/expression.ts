const EXPR_FUNCTIONS = ['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'exp'] as const;

/**
 * Evaluates a small, plot-friendly math expression for a given x.
 *
 * Supported: numbers, `x`, `+ - * /`, parentheses, `^` power, the functions
 * sin, cos, tan, sqrt, abs, log, exp, and the constants `pi` and `e`.
 * Implicit multiplication is allowed (e.g. `2x`, `2(x+1)`, `x(x-1)`).
 *
 * Expressions can originate from model output, so anything outside the
 * supported token set is rejected instead of being passed to the evaluator.
 */
export function evaluateExpression(expr: string, x: number): number {
  let s = expr.replace(/\s+/g, '').replace(/\^/g, '**');

  for (const fn of EXPR_FUNCTIONS) {
    s = s.replace(new RegExp(`${fn}\\(`, 'g'), `Math.${fn}(`);
  }
  s = s.replace(/(?<![a-zA-Z])pi(?![a-zA-Z])/g, 'Math.PI');
  s = s.replace(/(?<![a-zA-Z.])e(?![a-zA-Z0-9])/g, 'Math.E');

  // Implicit multiplication: 2x, 2(x+1), (x+1)(x-1), (x+1)x, x(x-1)
  s = s.replace(/([0-9)])([a-zA-Z(])/g, '$1*$2');
  s = s.replace(/\)x/g, ')*x');
  s = s.replace(/x\(/g, 'x*(');

  const stripped = s.replace(/Math\.(sin|cos|tan|sqrt|abs|log|exp|PI|E)/g, 'M');
  if (/[a-zA-Z_$]/.test(stripped.replace(/x/g, ''))) {
    throw new Error(`Unsupported token in expression: ${expr}`);
  }

  // eslint-disable-next-line no-new-func
  return new Function('x', `return ${s}`)(x);
}
