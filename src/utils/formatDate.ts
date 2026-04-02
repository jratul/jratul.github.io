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
