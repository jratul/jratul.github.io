import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Format date string to Korean locale
 * @param dateString - ISO date string (e.g., "2026-01-06")
 * @param formatStr - date-fns format string (default: "yyyy년 MM월 dd일")
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  formatStr: string = 'yyyy년 MM월 dd일'
): string {
  try {
    const date = parseISO(dateString);
    return format(date, formatStr, { locale: ko });
  } catch (error) {
    console.error('Failed to format date:', dateString, error);
    return dateString;
  }
}

/**
 * Get relative time from date (e.g., "3일 전", "2개월 전")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function getRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return '오늘';
    if (diffInDays === 1) return '어제';
    if (diffInDays < 7) return `${diffInDays}일 전`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}주 전`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}개월 전`;
    return `${Math.floor(diffInDays / 365)}년 전`;
  } catch (error) {
    console.error('Failed to get relative time:', dateString, error);
    return dateString;
  }
}
