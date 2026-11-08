import { config } from '@/config';

/*
 * We always format with one fixed locale from config.ts, so the output is the
 * same on every machine. That keeps tests stable, and means the app's money
 * formatting can be changed in one place.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    /*
     * If the currency code is one the formatter cannot use at all, fall back
     * to a plain number with the code written after it, so bad data never
     * crashes the screen.
     */
    const plain = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${plain} ${currency}`;
  }
}
