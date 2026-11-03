import {
  allCategoriesLabel,
  defaultTransactionFilters,
  filterAndSortTransactions,
  listCategories,
  sortOptions,
  type Transaction,
} from './transactionList';

const transactions: Transaction[] = [
  {
    id: '1',
    date: '2026-05-02',
    merchantName: 'Bio Company',
    category: 'Groceries',
    amount: -76.13,
  },
  { id: '2', date: '2026-07-25', merchantName: 'BigTech AG', category: 'Salary', amount: 4200 },
  { id: '3', date: '2026-06-01', merchantName: 'Rent Office', category: 'Rent', amount: -1100 },
];

function idsFor(changes: Partial<typeof defaultTransactionFilters>): string[] {
  return filterAndSortTransactions(transactions, { ...defaultTransactionFilters, ...changes }).map(
    (transaction) => transaction.id,
  );
}

describe('filterAndSortTransactions', () => {
  it('shows the newest first by default', () => {
    expect(idsFor({})).toEqual(['2', '3', '1']);
  });

  it('finds a merchant whatever the case and spacing of the search', () => {
    expect(idsFor({ search: '  bigtech ' })).toEqual(['2']);
  });

  it('filters by category', () => {
    expect(idsFor({ category: 'Rent' })).toEqual(['3']);
  });

  it('filters by money in and money out', () => {
    expect(idsFor({ direction: 'moneyIn' })).toEqual(['2']);
    expect(idsFor({ direction: 'moneyOut' })).toEqual(['3', '1']);
  });

  it.each([
    ['Newest first', ['2', '3', '1']],
    ['Oldest first', ['1', '3', '2']],
    ['Largest amount', ['2', '3', '1']],
    ['Smallest amount', ['1', '3', '2']],
    ['Merchant A to Z', ['2', '1', '3']],
    ['Merchant Z to A', ['3', '1', '2']],
  ])('sorts by %s', (sort, expectedIds) => {
    expect(idsFor({ sort: sort as (typeof sortOptions)[number] })).toEqual(expectedIds);
  });

  it('sizes amounts without their sign', () => {
    const largestFirst = idsFor({ sort: 'Largest amount', direction: 'moneyOut' });
    expect(largestFirst).toEqual(['3', '1']);
  });

  it('does not change the list passed in', () => {
    const before = [...transactions];
    idsFor({ sort: 'Oldest first' });
    expect(transactions).toEqual(before);
  });
});

describe('listCategories', () => {
  it('starts with all categories, then each category once', () => {
    const doubled = [...transactions, ...transactions];
    expect(listCategories(doubled)).toEqual([allCategoriesLabel, 'Groceries', 'Salary', 'Rent']);
  });
});
