import type { Transaction } from '@/api/schemas';
import { formatMonth, monthKey, parseISODate } from '@/domain/dates';

export interface MonthlyCashflow {
  monthKey: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface AggregateCashflowOptions {
  from?: string;
  to?: string;
}

interface MonthBucket {
  inflow: number;
  outflow: number;
}

/*
 * Turns a list of transactions into one entry per calendar month, oldest
 * first. The transactions can arrive in any order (the API does not promise
 * any order), so we group them by month and sort at the end. When from and to
 * are given, we also add an empty entry for any month in that range with no
 * transactions, so a chart drawn from the result has no gaps.
 */
export function aggregateCashflow(
  transactions: Transaction[],
  options: AggregateCashflowOptions = {},
): MonthlyCashflow[] {
  const buckets = new Map<string, MonthBucket>();

  for (const tx of transactions) {
    const key = monthKey(parseISODate(tx.date));
    const bucket = buckets.get(key) ?? { inflow: 0, outflow: 0 };
    if (tx.amount > 0) {
      bucket.inflow += tx.amount;
    } else if (tx.amount < 0) {
      bucket.outflow += -tx.amount;
    }
    buckets.set(key, bucket);
  }

  if (options.from !== undefined && options.to !== undefined) {
    for (const monthFirst of listMonthsBetween(options.from, options.to)) {
      const key = monthKey(monthFirst);
      if (!buckets.has(key)) {
        buckets.set(key, { inflow: 0, outflow: 0 });
      }
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { inflow, outflow }]) => ({
      monthKey: key,
      label: formatMonth(parseISODate(`${key}-01`)),
      inflow,
      outflow,
      net: inflow - outflow,
    }));
}

/*
 * Lists the first day of every calendar month between from and to. It lives
 * next to aggregateCashflow because nothing else uses it; if something else
 * needs it later, move it into src/domain/dates.ts.
 */
function listMonthsBetween(fromIso: string, toIso: string): Date[] {
  const result: Date[] = [];
  const from = parseISODate(fromIso);
  const to = parseISODate(toIso);
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor <= to) {
    result.push(new Date(cursor.getTime()));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}
