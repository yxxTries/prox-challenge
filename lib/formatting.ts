/**
 * Shared formatting utilities for widgets and components.
 * Single source of truth for consistent formatting across the app.
 */

/**
 * Format seconds into a human-readable time string (e.g., "2 min 30 s")
 */
export function formatMinutesSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}

/**
 * Convert a value within a range to a percentage (0-100)
 * Useful for gauges and sliders
 */
export function valueToPercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

/**
 * Get status information for a value within a range
 */
export function getValueStatus(
  value: number,
  minRange: number,
  maxRange: number,
  lowLabel = "Too low",
  highLabel = "Too high",
  normalLabel = "In range"
) {
  const inRange = value >= minRange && value <= maxRange;
  const status =
    value < minRange ? lowLabel : value > maxRange ? highLabel : normalLabel;
  const color = inRange ? "text-emerald-400" : "text-red-400";

  return { inRange, status, color };
}
