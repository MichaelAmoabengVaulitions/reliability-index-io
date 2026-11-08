import { sampleScores } from '@/test-utils/sampleScores';

import { buildKeyNumbers, buildScoreGroups } from './scoreSummary';

function groupTitled(userId: string, title: string) {
  return buildScoreGroups(sampleScores[userId]).find((group) => group.title === title);
}

describe('buildKeyNumbers', () => {
  it('lists the six key numbers in the design order', () => {
    expect(buildKeyNumbers(sampleScores.user_1009)).toEqual([
      { label: 'Months with income', value: '6 of 6' },
      { label: 'Income compared with bills', value: '3.29 times' },
      { label: 'Essential bills paid', value: '100%' },
      { label: 'Good months', value: '6 of 6' },
      { label: 'Late fees', value: '0' },
      { label: 'Estimated days below zero', value: '24' },
    ]);
  });

  it('says so when there are no bills to compare income with', () => {
    const keyNumbers = buildKeyNumbers(sampleScores.user_1010);
    expect(keyNumbers[1]).toEqual({
      label: 'Income compared with bills',
      value: 'No bills found',
    });
  });
});

describe('buildScoreGroups', () => {
  it('lists what is helping a strong score', () => {
    expect(groupTitled('user_1009', 'What is helping')?.items).toEqual([
      { text: 'Income arrived in 6 of 6 months', points: '' },
      { text: 'Income covers essential bills 3.29 times', points: '' },
      { text: 'Essential bills paid regularly', points: '' },
      { text: 'Saves money regularly', points: '+25' },
      { text: 'Good months: 6 of 6', points: '' },
    ]);
  });

  it('rounds the income comparison to two decimals, as the key numbers do', () => {
    const score = { ...sampleScores.user_1009, incomeComparedWithBills: 1.8333333 };
    const helping = buildScoreGroups(score).find((group) => group.title === 'What is helping');

    expect(helping?.items).toContainEqual({
      text: 'Income covers essential bills 1.83 times',
      points: '',
    });
  });

  it('lists every penalty under what is hurting', () => {
    expect(groupTitled('user_1004', 'What is hurting')?.items).toEqual([
      { text: 'Essential bills paid, with some gaps', points: '' },
      { text: 'About 35 days below zero', points: '−10' },
      { text: '3 late fees', points: '−3' },
      { text: 'Spending in high-risk categories', points: '−3' },
    ]);
  });

  it('uses the singular for one late fee', () => {
    const items = groupTitled('user_1001', 'What is hurting')?.items ?? [];
    expect(items).toContainEqual({ text: '1 late fee', points: '−1' });
  });

  it('explains a user with no income and no bills', () => {
    expect(groupTitled('user_1005', 'What is hurting')?.items).toContainEqual({
      text: 'No income or essential bills found',
      points: '',
    });
  });

  it('says income falls short when there is income data but it does not cover bills', () => {
    expect(groupTitled('user_1006', 'What is hurting')?.items).toContainEqual({
      text: 'Income does not cover essential bills',
      points: '',
    });
  });

  it('notes when no essential bills were found', () => {
    expect(groupTitled('user_1010', 'Also noted')?.items).toEqual([
      { text: 'No essential bills found', points: '' },
    ]);
  });

  it('shows a driver the app does not recognize under Also noted', () => {
    const score = {
      ...sampleScores.user_1009,
      otherDrivers: [{ text: 'New backend rule', points: -4 }],
    };
    const noted = buildScoreGroups(score).find((group) => group.title === 'Also noted');
    expect(noted?.items).toEqual([{ text: 'New backend rule', points: '−4' }]);
  });

  it('leaves out groups with nothing in them', () => {
    const titles = buildScoreGroups(sampleScores.user_1009).map((group) => group.title);
    expect(titles).toEqual(['What is helping', 'What is hurting']);
  });
});
