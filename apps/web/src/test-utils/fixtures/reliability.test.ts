import { describe, expect, it } from 'vitest';

import { reliabilityResponseSchema } from '@/api/schemas';

import { buildReliabilityResponse } from './reliability';

describe('buildReliabilityResponse', () => {
  it('returns an object passing reliabilityResponseSchema', () => {
    expect(reliabilityResponseSchema.safeParse(buildReliabilityResponse()).success).toBe(true);
  });

  it('matches the spec example (score 64, band MEDIUM)', () => {
    const result = buildReliabilityResponse();
    expect(result.reliability_index).toBe(64);
    expect(result.score_band).toBe('MEDIUM');
  });

  it('includes the 7 driver strings from the spec example', () => {
    const result = buildReliabilityResponse();
    expect(result.drivers).toHaveLength(7);
    expect(result.drivers).toContain('Savings behavior detected (+13 pts)');
  });
});
