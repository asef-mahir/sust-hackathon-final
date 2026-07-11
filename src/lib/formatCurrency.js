export function formatCurrency(value, opts = {}) {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;

  if (Number.isNaN(numeric)) return '৳—';

  if (opts.compact) {
    return new Intl.NumberFormat('en-BD', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(numeric)
      .replace(/^/, '৳');
  }

  return new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 2,
  }).format(numeric)
    .replace(/^/, '৳');
}
