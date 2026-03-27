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

// ── Layout constants for the expanded panels ──────────────────────────────────
const YEAR_COL_W   = 52   // px — the narrow day-square column
const DETAIL_W     = 560  // px — the event detail panel
const EXPANDED_W   = YEAR_COL_W + DETAIL_W

// ── Total years to display ────────────────────────────────────────────────────
const TOTAL_YEARS = 120

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const containerRef  = useRef<HTMLDivElement>(null)
  const scrollerRef   = useRef<HTMLDivElement>(null)
  const leftCanvasRef = useRef<HTMLCanvasElement>(null)
  const rightCanvasRef= useRef<HTMLCanvasElement>(null)
  const rafRef        = useRef(0)

  const today       = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()

  // ── Events data ──
  const [events,    setEvents]    = useState<EventItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const dayMap = useMemo(() => buildDayMap(events), [events])

  useEffect(() => {
    fetch('/events.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d: EventItem[]) => setEvents(Array.isArray(d) ? d : []))
      .catch(e => setLoadError(String(e)))
  }, [])

  // ── UI state ──
  const [expandedYear, setExpandedYear] = useState<number | null>(null)
  const [selectedISO,  setSelectedISO]  = useState<string | null>(null)

  const selectedEvents = useMemo(
    () => (selectedISO ? dayMap.get(selectedISO) ?? [] : []),
    [dayMap, selectedISO]
  )

  // When expanded year changes, clear selected day
  useEffect(() => { setSelectedISO(null) }, [expandedYear])

  // ── Grid dimensions ──
  // Start 50 years before current year, show TOTAL_YEARS
  const startYear = currentYear - 50
  const [containerH, setContainerH] = useState(800)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setContainerH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Layout for left and right canvases ──
  // When a year is expanded:
  //   left canvas: startYear → expandedYear (inclusive)
  //   right canvas: expandedYear+1 → startYear+TOTAL_YEARS-1
  //   between them: YearColumn + DetailPanel (real DOM, pushes right canvas over)
  const leftYears  = expandedYear !== null ? expandedYear - startYear + 1 : TOTAL_YEARS
  const rightYears = expandedYear !== null ? TOTAL_YEARS - leftYears : 0

  const leftLayout  = useMemo(
    () => computeLayout(containerH, startYear, leftYears),
    [containerH, startYear, leftYears]
  )
  const rightLayout = useMemo(
    () => rightYears > 0 ? computeLayout(containerH, expandedYear! + 1, rightYears) : null,
    [containerH, expandedYear, rightYears]
  )

  // ── Draw ──
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

  // ── Auto-scroll: center today on initial load ──
  useEffect(() => {
    if (!events.length) return
    const scroller = scrollerRef.current
    if (!scroller) return
    // x of today's year in the left canvas
    const todayYi = currentYear - startYear
    const todayX  = PAD_LEFT + todayYi * YEAR_W + YEAR_W / 2
    const viewW   = scroller.clientWidth
    scroller.scrollLeft = todayX - viewW / 2
  }, [events.length, currentYear, startYear])

  // ── Prevent trackpad back/forward navigation ──
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      // If gesture has horizontal component, capture it
      if (Math.abs(e.deltaX) > 0) {
        e.preventDefault()
        el.scrollLeft += e.deltaX
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ── Canvas click handlers ──
  const handleLeftClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Try to hit a day first
    const iso = hitDay(mx, my, leftLayout)
    if (iso) {
      const clickedYear = parseInt(iso.slice(0, 4))
      setExpandedYear(clickedYear)
      setSelectedISO(iso)
      return
    }

    // Otherwise expand the clicked year
    const yr = hitYear(mx, leftLayout)
    if (yr !== null) setExpandedYear(yr)
  }, [leftLayout])

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rightLayout) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const iso = hitDay(mx, my, rightLayout)
    if (iso) {
      const clickedYear = parseInt(iso.slice(0, 4))
      setExpandedYear(clickedYear)
      setSelectedISO(iso)
      return
    }

    const yr = hitYear(mx, rightLayout)
    if (yr !== null) setExpandedYear(yr)
  }, [rightLayout])

  const handleSelectDay = useCallback((iso: string) => {
    setSelectedISO(iso)
  }, [])

  const handleClose = useCallback(() => {
    setExpandedYear(null)
    setSelectedISO(null)
  }, [])

  // ── Expanded year label for the column header ──
  const expandedYearLabel = expandedYear !== null
    ? String(expandedYear)
    : null

  return (
    <div className="app-root" ref={containerRef}>
      {loadError && <div className="load-error">⚠ {loadError}</div>}

      {/* One horizontal scroller containing everything */}
      <div className="timeline-scroller" ref={scrollerRef}>
        <div className="timeline-row">

          {/* ── LEFT CANVAS ── */}
          <canvas
            ref={leftCanvasRef}
            className="grid-canvas"
            style={{ width: leftLayout.totalW, height: containerH }}
            onClick={handleLeftClick}
          />

          {/* ── EXPANDED YEAR SECTION (only when a year is selected) ── */}
          {expandedYear !== null && (
            <>
              {/* Narrow day-square column */}
              <div className="expanded-year-wrapper">
                <div className="expanded-year-header">
                  <span className="expanded-year-label">{expandedYearLabel}</span>
                </div>
                <YearColumn
                  year={expandedYear}
                  selectedISO={selectedISO}
                  dayMap={dayMap}
                  onSelectDay={handleSelectDay}
                  height={containerH}
                />
              </div>

              {/* Event detail panel */}
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

          {/* ── RIGHT CANVAS (years after expanded year) ── */}
          {rightLayout && (
            <canvas
              ref={rightCanvasRef}
              className="grid-canvas"
              style={{ width: rightLayout.totalW, height: containerH }}
              onClick={handleRightClick}
            />
          )}

        </div>
      </div>
    </div>
  )
}
