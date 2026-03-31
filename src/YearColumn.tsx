import React, { useEffect, useRef, useState } from 'react'
import { EventItem } from './types'
import { daysInMonth, fmtISO, MONTHS } from './dates'
import { pickDayColor } from './dayMap'
import { sparkleColor } from './canvas'

interface Props {
  year: number
  selectedISO: string | null
  dayMap: Map<string, EventItem[]>
  onSelectDay: (iso: string) => void
  height: number
}

export function YearColumn({ year, selectedISO, dayMap, onSelectDay, height }: Props) {
  const selectedRef = useRef<HTMLButtonElement | null>(null)
  const rafRef      = useRef(0)
  const [ts, setTs] = useState(0)

  useEffect(() => {
    function loop(t: number) { setTs(t); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedISO])

  const months = Array.from({ length: 12 }, (_, m) => {
    const n    = daysInMonth(year, m)
    const days = Array.from({ length: n }, (_, i) => {
      const date = new Date(year, m, i + 1)
      const iso  = fmtISO(date)
      const evts = dayMap.get(iso) ?? []
      const doy  = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000)
      return { iso, date, evts, doy }
    })
    return { m, label: MONTHS[m], days }
  })

  return (
    <div className="year-col" style={{ height }}>
      <div className="year-col-inner">
        {months.map(({ m, label, days }) => (
          <div key={m} className="ycol-month">
            <div className="ycol-month-label">{label}</div>
            {days.map(({ iso, date, evts, doy }) => {
              const isSelected  = iso === selectedISO
              const hasEvents   = evts.length > 0
              const hasMultiple = evts.length > 1
              const color       = hasMultiple
                ? sparkleColor(evts.map(e => e.color), doy, year, ts)
                : hasEvents ? pickDayColor(evts, doy, '#2a2a2e') : ''

              return (
                <button
                  key={iso}
                  ref={isSelected ? selectedRef : null}
                  className={`ycol-day${isSelected ? ' ycol-day--sel' : ''}${hasEvents ? ' ycol-day--evt' : ''}`}
                  onClick={() => onSelectDay(iso)}
                  title={iso}
                >
                  <span
                    className="ycol-sq"
                    style={hasEvents ? { background: color } : undefined}
                  />
                  {hasMultiple && <span className="ycol-multi" />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
