import { describe, expect, it } from 'vitest';
import { evaluateExpression } from '../expression';

describe('evaluateExpression', () => {
  it('evaluates the quadratic from the demo with implicit multiplication', () => {
    expect(evaluateExpression('x^2 - 2x - 3', 3)).toBe(0);
    expect(evaluateExpression('x^2-2x-3', -1)).toBe(0);
    expect(evaluateExpression('x^2 - 2x - 3', 0)).toBe(-3);
  });

  it('supports implicit multiplication around parentheses', () => {
    expect(evaluateExpression('2(x+1)', 1)).toBe(4);
    expect(evaluateExpression('x(x-1)', 3)).toBe(6);
    expect(evaluateExpression('(x+1)(x-1)', 3)).toBe(8);
    expect(evaluateExpression('2x(x+1)', 2)).toBe(12);
  });

  it('supports functions and constants', () => {
    expect(evaluateExpression('sin(x)', Math.PI / 2)).toBeCloseTo(1);
    expect(evaluateExpression('sqrt(x)', 9)).toBe(3);
    expect(evaluateExpression('2pi', 0)).toBeCloseTo(2 * Math.PI);
    expect(evaluateExpression('e^x', 0)).toBeCloseTo(1);
    expect(evaluateExpression('2sin(x)', Math.PI / 2)).toBeCloseTo(2);
  });

  it('supports explicit multiplication and powers', () => {
    expect(evaluateExpression('2*x + 1', 2)).toBe(5);
    expect(evaluateExpression('3*sin(0)', 0)).toBe(0);
    expect(evaluateExpression('4 - x^2', 2)).toBe(0);
  });

  it('rejects unsupported tokens', () => {
    expect(() => evaluateExpression('alert(1)', 0)).toThrow();
    expect(() => evaluateExpression('x.constructor', 1)).toThrow();
    expect(() => evaluateExpression('window.location', 0)).toThrow();
  });
});
