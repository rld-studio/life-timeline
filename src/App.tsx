import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import { EventItem } from './types'
import { buildDayMap } from './dayMap'
import {
  computeLayout, drawGrid, hitYear, hitDay,
  GridLayout, YEAR_W, PAD_LEFT, CELL,
} from './canvas'
import { YearColumn } from './YearColumn'
import { DetailPanel } from './DetailPanel'
import { fmtISO } from './dates'
import { loadEvents, saveEvents } from './imageApi'

const YEAR_COL_W   = 52
const DETAIL_W     = 560
const TOTAL_YEARS  = 120

export default function App() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const scrollerRef    = useRef<HTMLDivElement>(null)
  const leftCanvasRef  = useRef<HTMLCanvasElement>(null)
  const rightCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef(0)

  const today       = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()

  const [events,    setEvents]    = useState<EventItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const dayMap = useMemo(() => buildDayMap(events), [events])

  // Load events: prefer localStorage (has edits), fall back to events.json
  useEffect(() => {
    loadEvents().then(saved => {
      if (saved && saved.length > 0) {
        setEvents(saved as EventItem[])
        return
      }
      fetch('/events.json', { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
        .then((d: EventItem[]) => {
          const arr = Array.isArray(d) ? d : []
          setEvents(arr)
          saveEvents(arr) // seed localStorage
        })
        .catch(e => setLoadError(String(e)))
    }).catch(() => {
      fetch('/events.json', { cache: 'no-store' })
        .then(r => r.json())
        .then((d: EventItem[]) => setEvents(Array.isArray(d) ? d : []))
        .catch(e => setLoadError(String(e)))
    })
  }, [])

  const [expandedYear, setExpandedYear] = useState<number | null>(null)
  const [selectedISO,  setSelectedISO]  = useState<string | null>(null)

  const selectedEvents = useMemo(
    () => (selectedISO ? dayMap.get(selectedISO) ?? [] : []),
    [dayMap, selectedISO]
  )

  useEffect(() => { setSelectedISO(null) }, [expandedYear])

  const startYear = currentYear - 50
  const [containerH, setContainerH] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setContainerH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const leftYears  = expandedYear !== null ? expandedYear - startYear + 1 : TOTAL_YEARS
  const rightYears = expandedYear !== null ? TOTAL_YEARS - leftYears : 0

  const leftLayout  = useMemo(() => computeLayout(containerH, startYear, leftYears), [containerH, startYear, leftYears])
  const rightLayout = useMemo(
    () => rightYears > 0 ? computeLayout(containerH, expandedYear! + 1, rightYears) : null,
    [containerH, expandedYear, rightYears]
  )

  const drawAll = useCallback(() => {
    if (leftCanvasRef.current)
      drawGrid(leftCanvasRef.current, leftLayout, dayMap, today, expandedYear)
    if (rightCanvasRef.current && rightLayout)
      drawGrid(rightCanvasRef.current, rightLayout, dayMap, today, null)
  }, [leftLayout, rightLayout, dayMap, today, expandedYear])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(drawAll)
    return () => cancelAnimationFrame(rafRef.current)
  }, [drawAll])

  useEffect(() => {
    if (!events.length) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const todayYi = currentYear - startYear
    const todayX  = PAD_LEFT + todayYi * YEAR_W + YEAR_W / 2
    scroller.scrollLeft = todayX - scroller.clientWidth / 2
  }, [events.length, currentYear, startYear])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 0) { e.preventDefault(); el.scrollLeft += e.deltaX }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleLeftClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const iso = hitDay(e.clientX - rect.left, e.clientY - rect.top, leftLayout)
    if (iso) { setExpandedYear(parseInt(iso.slice(0, 4))); setSelectedISO(iso); return }
    const yr = hitYear(e.clientX - rect.left, leftLayout)
    if (yr !== null) setExpandedYear(yr)
  }, [leftLayout])

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rightLayout) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const iso = hitDay(e.clientX - rect.left, e.clientY - rect.top, rightLayout)
    if (iso) { setExpandedYear(parseInt(iso.slice(0, 4))); setSelectedISO(iso); return }
    const yr = hitYear(e.clientX - rect.left, rightLayout)
    if (yr !== null) setExpandedYear(yr)
  }, [rightLayout])

  const handleSelectDay  = useCallback((iso: string) => setSelectedISO(iso), [])
  const handleClose      = useCallback(() => { setExpandedYear(null); setSelectedISO(null) }, [])

  return (
    <div className="app-root" ref={containerRef}>
      {loadError && <div className="load-error">⚠ {loadError}</div>}
      <div className="timeline-scroller" ref={scrollerRef}>
        <div className="timeline-row">
          <canvas ref={leftCanvasRef} className="grid-canvas"
            style={{ width: leftLayout.totalW, height: containerH }} onClick={handleLeftClick} />

          {expandedYear !== null && (
            <>
              <div className="expanded-year-wrapper">
                <div className="expanded-year-header">
                  <span className="expanded-year-label">{expandedYear}</span>
                </div>
                <YearColumn year={expandedYear} selectedISO={selectedISO} dayMap={dayMap}
                  onSelectDay={handleSelectDay} height={containerH} />
              </div>

              <DetailPanel
                iso={selectedISO ?? fmtISO(new Date(expandedYear, 0, 1))}
                events={selectedEvents}
                allEvents={events}
                height={containerH}
                onClose={handleClose}
                onEventsChange={setEvents}
              />
            </>
          )}

          {rightLayout && (
            <canvas ref={rightCanvasRef} className="grid-canvas"
              style={{ width: rightLayout.totalW, height: containerH }} onClick={handleRightClick} />
          )}
        </div>
      </div>
    </div>
  )
}
