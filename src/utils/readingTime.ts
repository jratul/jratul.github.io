/**
 * Format reading time as human-readable string
 * @param minutes - Reading time in minutes
 * @returns Formatted string (e.g., "5분", "1시간 30분")
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${remainingMinutes}분`;
}
