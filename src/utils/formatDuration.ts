export function formatDuration(seconds: number): string {
  const hundredths = Math.round(seconds * 100);
  const minutes = Math.floor(hundredths / 6000);
  const remainingSeconds = (hundredths % 6000) / 100;
  return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
}
