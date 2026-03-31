import { describe, expect, it } from 'vitest';
import { evaluateCalculatorExpression, formatCalculatorResult } from '@/modules/tools/lib/calculator';
import { formatJsonText } from '@/modules/tools/lib/jsonFormatter';

describe('tools helpers', () => {
  it('evaluates calculator expressions with precedence and percentages', () => {
    expect(formatCalculatorResult(evaluateCalculatorExpression('10 + 5 * 2'))).toBe('20');
    expect(formatCalculatorResult(evaluateCalculatorExpression('200 * 10%'))).toBe('20');
  });

  it('formats JSON locally', () => {
    expect(formatJsonText('{"name":"Niyoplan","items":[1,2]}')).toBe(`{
  "name": "Niyoplan",
  "items": [
    1,
    2
  ]
}`);
  });

  it('throws for invalid JSON', () => {
    expect(() => formatJsonText('{broken')).toThrow();
  });
});