export interface Transaction {
  id: string;
  date: string;
  merchantName: string;
  category: string;
  // Positive is money in, negative is money out.
  amount: number;
}

export type TransactionDirection = 'all' | 'moneyIn' | 'moneyOut';

export const allCategoriesLabel = 'All categories';

export const sortOptions = [
  'Newest first',
  'Oldest first',
  'Largest amount',
  'Smallest amount',
  'Merchant A to Z',
  'Merchant Z to A',
] as const;

export type TransactionSort = (typeof sortOptions)[number];

export interface TransactionFilters {
  search: string;
  category: string;
  direction: TransactionDirection;
  sort: TransactionSort;
}

export const defaultTransactionFilters: TransactionFilters = {
  search: '',
  category: allCategoriesLabel,
  direction: 'all',
  sort: 'Newest first',
};

type TransactionComparison = (first: Transaction, second: Transaction) => number;

const comparisons: Record<TransactionSort, TransactionComparison> = {
  'Newest first': (first, second) => second.date.localeCompare(first.date),
  'Oldest first': (first, second) => first.date.localeCompare(second.date),
  'Largest amount': (first, second) => Math.abs(second.amount) - Math.abs(first.amount),
  'Smallest amount': (first, second) => Math.abs(first.amount) - Math.abs(second.amount),
  'Merchant A to Z': (first, second) => first.merchantName.localeCompare(second.merchantName),
  'Merchant Z to A': (first, second) => second.merchantName.localeCompare(first.merchantName),
};

function matchesDirection(transaction: Transaction, direction: TransactionDirection): boolean {
  if (direction === 'moneyIn') return transaction.amount > 0;
  if (direction === 'moneyOut') return transaction.amount < 0;
  return true;
}

export function filterAndSortTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const search = filters.search.trim().toLowerCase();
  return transactions
    .filter((transaction) => matchesDirection(transaction, filters.direction))
    .filter(
      (transaction) =>
        filters.category === allCategoriesLabel || transaction.category === filters.category,
    )
    .filter((transaction) => transaction.merchantName.toLowerCase().includes(search))
    .sort(comparisons[filters.sort]);
}

export function listCategories(transactions: Transaction[]): string[] {
  const categories = transactions.map((transaction) => transaction.category);
  return [allCategoriesLabel, ...new Set(categories)];
}
