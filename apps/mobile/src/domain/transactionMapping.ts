import type {
  Transaction as ApiTransaction,
  MerchantCategory,
} from '@reliability-index/core/api/schemas';

import type { Transaction } from './transactionList';

/*
 * Turns the backend's transactions into what the list shows. A category with
 * no name yet, or none at all, shows its code so the row is never blank.
 */
export function toTransactions(
  apiTransactions: ApiTransaction[],
  categories: MerchantCategory[] | undefined,
): Transaction[] {
  const categoryNameByCode = new Map(categories?.map(({ code, name }) => [code, name]));
  return apiTransactions.map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    merchantName: transaction.merchant_name,
    category:
      categoryNameByCode.get(transaction.merchant_category_code) ??
      transaction.merchant_category_code,
    amount: transaction.amount,
  }));
}
