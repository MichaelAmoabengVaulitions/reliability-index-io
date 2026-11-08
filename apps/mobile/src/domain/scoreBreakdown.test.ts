import { sampleScores } from '@/test-utils/sampleScores';

import { buildBreakdownSteps } from './scoreBreakdown';

describe('buildBreakdownSteps', () => {
  it('matches the design for a strong score', () => {
    expect(buildBreakdownSteps(sampleScores.user_1009)).toEqual([
      {
        name: 'Income and bills',
        points: '+75',
        barWidthPercent: 75,
        kind: 'added',
        note: 'Regular income, income compared with bills, and bills paid',
      },
      {
        name: 'Savings',
        points: '+25',
        barWidthPercent: 25,
        kind: 'added',
        note: 'Saves money regularly',
      },
      {
        name: 'Days below zero',
        points: '−10',
        barWidthPercent: 10,
        kind: 'takenAway',
        note: 'About 24 days',
      },
    ]);
  });

  it('shows a step for every penalty', () => {
    const stepNames = buildBreakdownSteps(sampleScores.user_1004).map((step) => step.name);
    expect(stepNames).toEqual([
      'Income and bills',
      'Days below zero',
      'Late fees',
      'High-risk spending',
    ]);
  });

  it('takes late fee points from the backend, not from the number of fees', () => {
    const score = { ...sampleScores.user_1004, lateFeePenaltyPoints: 5 };
    const lateFees = buildBreakdownSteps(score).find((step) => step.name === 'Late fees');
    expect(lateFees?.points).toBe('−5');
  });

  it('shows points from a driver the app does not recognise, so the steps still add up', () => {
    const score = {
      ...sampleScores.user_1009,
      otherDrivers: [{ text: 'New backend rule', points: -4 }],
    };
    const steps = buildBreakdownSteps(score);

    expect(steps[0].points).toBe('+79');
    expect(steps[steps.length - 1]).toMatchObject({ name: 'New backend rule', points: '−4' });
  });

  it('shows income and bills as taken away when other drivers add more than the score', () => {
    const score = {
      ...sampleScores.user_1009,
      score: 10,
      savingsPoints: 0,
      daysBelowZeroPenaltyPoints: 0,
      lateFeePenaltyPoints: 0,
      highRiskPenaltyPoints: 0,
      otherDrivers: [{ text: 'New backend rule', points: 15 }],
    };

    expect(buildBreakdownSteps(score)[0]).toMatchObject({
      name: 'Income and bills',
      points: '−5',
      barWidthPercent: 5,
      kind: 'takenAway',
    });
  });

  it.each(Object.values(sampleScores))('adds up to the score for $userId', (score) => {
    const total = buildBreakdownSteps(score).reduce((sum, step) => {
      const size = step.barWidthPercent;
      return step.kind === 'added' ? sum + size : sum - size;
    }, 0);
    expect(total).toBe(score.score);
  });
});
