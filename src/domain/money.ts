import { minusSign } from './score';

function formatEuros(amount: number, decimalPlaces: number): string {
  const digits = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  return `€${digits}`;
}

export function formatWholeAmount(amount: number): string {
  const sign = amount < 0 ? minusSign : '';
  return sign + formatEuros(Math.abs(amount), 0);
}

export function formatTransactionAmount(amount: number): string {
  if (amount === 0) return formatEuros(0, 2);
  const sign = amount > 0 ? '+' : minusSign;
  return sign + formatEuros(Math.abs(amount), 2);
}
