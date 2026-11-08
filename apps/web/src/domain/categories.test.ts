import { describe, expect, it } from 'vitest';

import { categoryLabel } from './categories';

const categories = [
  { code: '5411', name: 'Grocery Stores', group: 'essential' },
  { code: '6011', name: 'ATM Withdrawals', group: 'cash' },
];

describe('categoryLabel', () => {
  it('returns the name the backend gives for a code', () => {
    expect(categoryLabel('6011', categories)).toBe('ATM Withdrawals');
  });

  it('returns the raw code when the backend has no name for it', () => {
    expect(categoryLabel('9999', categories)).toBe('9999');
  });

  it('returns the raw code while the names are still loading', () => {
    expect(categoryLabel('5411', undefined)).toBe('5411');
  });

  it('does not tidy up the code before looking it up', () => {
    expect(categoryLabel(' 5411 ', categories)).toBe(' 5411 ');
  });
});
