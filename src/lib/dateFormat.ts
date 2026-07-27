import { format } from 'date-fns';

/** Project-wide display format: 01-Jan-2026 01:00 PM */
export const DISPLAY_DATETIME = 'dd-MMM-yyyy hh:mm a';
export const DISPLAY_DATE = 'dd-MMM-yyyy';

export const fmtDateTime = (value?: string | Date | null): string => {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return format(d, DISPLAY_DATETIME);
};

export const fmtDate = (value?: string | Date | null): string => {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return format(d, DISPLAY_DATE);
};
