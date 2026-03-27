import { EventItem } from './types'
import { parseISO, fmtISO, addDays, spanDays } from './dates'

/**
 * Build Map<iso, EventItem[]> for every day covered by every event.
 * Each day's list is sorted shortest-span-first (most specific wins).
 */
export function buildDayMap(events: EventItem[]): Map<string, EventItem[]> {
  const map = new Map<string, EventItem[]>()

  for (const evt of events) {
    const start = parseISO(evt.start_date)
    const end   = parseISO(evt.end_date)
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const iso = fmtISO(d)
      const arr = map.get(iso) ?? []
      arr.push(evt)
      map.set(iso, arr)
    }
  }

  // Sort: shortest span = most specific = first
  for (const [iso, arr] of map.entries()) {
    map.set(iso, [...arr].sort(
      (a, b) => spanDays(a.start_date, a.end_date) - spanDays(b.start_date, b.end_date)
    ))
  }

  return map
}

/**
 * Pick the display color for a day.
 * Shortest-span event wins; ties cycle by doy for visual variety.
 */
export function pickDayColor(evts: EventItem[], doy: number, fallback: string): string {
  if (!evts.length) return fallback
  const minSpan = spanDays(evts[0].start_date, evts[0].end_date)
  const pool = evts.filter(e => spanDays(e.start_date, e.end_date) === minSpan)
  return pool[pool.length > 1 ? doy % pool.length : 0]?.color ?? fallback
}
