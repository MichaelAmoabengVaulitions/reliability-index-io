import type { Transaction } from '@/api/schemas';
import type { TransactionSign, TransactionSort } from '@/domain/dashboardParams';

export interface TransactionFilters {
  categoryCodes?: string[];
  sign?: TransactionSign;
  search?: string;
  sort?: TransactionSort;
}

/*
 * Returns a new list of transactions, narrowed by the filters and put in the
 * chosen sort order. The quick filters run first so the sort works on the
 * smallest possible list. The list passed in is never changed, so a caller
 * can keep using it safely after this returns.
 */
export function applyTransactionFilters(
  transactions: Transaction[],
  filters: TransactionFilters = {},
): Transaction[] {
  let result = transactions;

  if (filters.sign === 'inflow') {
    result = result.filter((tx) => tx.amount > 0);
  } else if (filters.sign === 'outflow') {
    result = result.filter((tx) => tx.amount < 0);
  }

  if (filters.categoryCodes !== undefined && filters.categoryCodes.length > 0) {
    const codes = new Set(filters.categoryCodes);
    result = result.filter((tx) => codes.has(tx.merchant_category_code));
  }

  const needle = filters.search?.trim().toLowerCase() ?? '';
  if (needle.length > 0) {
    result = result.filter((tx) => tx.merchant_name.toLowerCase().includes(needle));
  }

  if (filters.sort !== undefined) {
    /*
     * We copy the list before sorting, because sort reorders in place and we
     * must not change the list passed in (result may still be that same list).
     */
    result = result.slice().sort(compareBy(filters.sort));
  } else if (result === transactions) {
    /*
     * No filter matched and no sort: still return a fresh copy, so the caller
     * cannot accidentally change the list passed in by changing what we return.
     */
    result = result.slice();
  }

  return result;
}

// Rows with the same value fall back to their id, so their order never jumps around.
function compareBy(sort: TransactionSort): (a: Transaction, b: Transaction) => number {
  const compareField = fieldComparator(sort);
  return (a, b) => compareField(a, b) || a.id.localeCompare(b.id);
}

function fieldComparator(sort: TransactionSort): (a: Transaction, b: Transaction) => number {
  const directionMultiplier = sort.direction === 'asc' ? 1 : -1;
  if (sort.field === 'amount') {
    return (a, b) => (a.amount - b.amount) * directionMultiplier;
  }
  if (sort.field === 'date') {
    // Dates are YYYY-MM-DD text, so comparing them as text sorts them by date.
    return (a, b) => a.date.localeCompare(b.date) * directionMultiplier;
  }
  return (a, b) => a.merchant_name.localeCompare(b.merchant_name) * directionMultiplier;
}
