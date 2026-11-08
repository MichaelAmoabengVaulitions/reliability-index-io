import type { Transaction } from '@/api/schemas';
import { formatDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';

interface RowProps {
  transaction: Transaction;
  height: number;
}

/**
 * One transaction line in the virtual table.
 *
 * Money coming in shows in green with a leading "+". Money going out is plain
 * dark text with a leading "−", because ordinary spending isn't a warning. The
 * sign means colour is never the only signal. A zero amount gets no sign.
 */
function amountStyle(amount: number): { sign: string; className: string } {
  if (amount > 0) return { sign: '+ ', className: 'text-positive' };
  if (amount < 0) return { sign: '− ', className: 'text-slate-900' };
  return { sign: '', className: 'text-slate-600' };
}

export function Row({ transaction, height }: RowProps) {
  const { sign, className } = amountStyle(transaction.amount);
  const absAmount = Math.abs(transaction.amount);

  return (
    <div
      className="grid grid-cols-[110px_1fr_120px] items-center gap-4 border-b border-slate-100 px-4 text-sm hover:bg-slate-50"
      style={{ height }}
    >
      <span className="text-slate-500">{formatDate(transaction.date)}</span>
      <div className="min-w-0">
        <p className="m-0 truncate font-medium text-slate-900">{transaction.merchant_name}</p>
        <p className="m-0 truncate text-xs text-slate-500">{transaction.description}</p>
      </div>
      <span className={`text-right font-semibold tabular-nums ${className}`}>
        {sign}
        {formatMoney(absAmount, transaction.currency)}
      </span>
    </div>
  );
}
