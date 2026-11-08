import { describe, expect, it } from 'vitest';

import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats a positive amount with the thousands separator and currency symbol', () => {
    const formatted = formatMoney(1234.56, 'EUR');
    expect(formatted).toContain('1,234.56');
    expect(formatted).toMatch(/€|EUR/);
  });

  it('formats a negative amount with a leading minus sign', () => {
    const formatted = formatMoney(-1234.56, 'EUR');
    expect(formatted).toContain('1,234.56');
    expect(formatted).toMatch(/€|EUR/);
    // Intl uses either an ASCII hyphen-minus or the true Unicode minus, depending on runtime.
    expect(/^[-−]/.test(formatted)).toBe(true);
  });

  it('formats zero with two decimal places', () => {
    expect(formatMoney(0, 'EUR')).toContain('0.00');
  });

  it('does not throw on an unknown currency code and surfaces the code in the output', () => {
    expect(() => formatMoney(10, 'ZZZ')).not.toThrow();
    expect(formatMoney(10, 'ZZZ')).toContain('ZZZ');
  });
});
