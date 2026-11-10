/** Money is handled as decimal strings/Prisma.Decimal on the server; this formats for display. */
export function formatMoney(amount: string | number | { toString(): string } | null | undefined, currency: string, locale = 'en-IN'): string {
  if (amount === null || amount === undefined) return 'Price on request';
  const n = Number(amount.toString());
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}
