const LOCALE = 'tr-TR';

export function initialOf(title: string): string {
  return title.trim().charAt(0).toUpperCase() || '?';
}

export function formatPrice(amount: number, currency: string | null): string {
  if (!currency) {
    return new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
  }).format(amount);
}
