const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function formatAccuracy(accuracy: number): string {
  return percentFormatter.format(accuracy);
}
