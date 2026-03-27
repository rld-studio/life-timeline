export const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
export const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December']

/** Parse YYYY-MM-DD as local midnight (avoids timezone shift) */
export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format Date as YYYY-MM-DD using local time */
export function fmtISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add n days, returns new Date */
export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** 0-based day of year (Jan 1 = 0) */
export function dayOfYear(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000)
}

/** Days in a month (month0 = 0–11) */
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

/** Inclusive span length in days */
export function spanDays(startISO: string, endISO: string): number {
  const s = parseISO(startISO)
  const e = parseISO(endISO)
  return Math.max(1, Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1)
}

/** Display a single date, optionally prefixed with "circa" */
export function displayDate(iso: string, precision?: 'exact' | 'circa'): string {
  const d = parseISO(iso)
  const s = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return precision === 'circa' ? `circa ${s}` : s
}

/** Display a date range; single-day events show only one date */
export function displayDateRange(
  startISO: string,
  endISO: string,
  startPrec?: 'exact' | 'circa',
  endPrec?: 'exact' | 'circa'
): string {
  if (startISO === endISO) return displayDate(startISO, startPrec)
  return `${displayDate(startISO, startPrec)} — ${displayDate(endISO, endPrec)}`
}
