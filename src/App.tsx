import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import { EventItem } from './types'
import { DEFAULT_CATEGORIES, Category } from './categories'
import { buildDayMap } from './dayMap'
import {
  computeLayout, drawGrid, hitYear, hitDay,
  GridLayout, PAD_LEFT,
} from './canvas'
import { YearColumn } from './YearColumn'
import { DetailPanel } from './DetailPanel'
import { fmtISO } from './dates'
import { loadEvents, saveEvents } from './imageApi'

const YEAR_COL_W   = 52
const DETAIL_W     = 560
const START_YEAR   = 1800

export default function App() {
  const containerRef   = useRef<HTMLDivElement>(null)
  const scrollerRef    = useRef<HTMLDivElement>(null)
  const leftCanvasRef  = useRef<HTMLCanvasElement>(null)
  const rightCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef             = useRef(0)
  const hasAutoScrolled    = useRef(false)
  const drawAllRef         = useRef<(ts: number) => void>(() => {})

  const today       = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()

  const [events,           setEvents]           = useState<EventItem[]>([])
  const [categories,       setCategories]       = useState<Category[]>(DEFAULT_CATEGORIES)
  const [activeCategories, setActiveCategories] = useState<Set<string>>(() => new Set(DEFAULT_CATEGORIES.map(c => c.value)))
  const [loadError,        setLoadError]        = useState<string | null>(null)

  const dayMap = useMemo(() => buildDayMap(events), [events])

  const applyColors = (evts: EventItem[], cats: Category[]): EventItem[] =>
    evts.map(e => {
      const cat = cats.find(c => c.value === e.category)
      return cat ? { ...e, color: cat.color } : e
    })

  // Load events: prefer localStorage (has edits), fall back to events.json
  useEffect(() => {
    loadEvents().then(result => {
      if (result && result.events.length > 0) {
        const cats = result.categories.length > 0 ? result.categories as Category[] : DEFAULT_CATEGORIES
        if (result.categories.length > 0) setCategories(cats)
        setEvents(applyColors(result.events as EventItem[], cats))
        return
      }
      fetch('/events.json?t=' + Date.now(), { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
        .then((d: EventItem[]) => {
          const arr = applyColors(Array.isArray(d) ? d : [], DEFAULT_CATEGORIES)
          setEvents(arr)
          saveEvents(arr, DEFAULT_CATEGORIES) // seed localStorage
        })
        .catch(e => setLoadError(String(e)))
    }).catch(() => {
      fetch('/events.json?t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.json())
        .then((d: EventItem[]) => setEvents(applyColors(Array.isArray(d) ? d : [], DEFAULT_CATEGORIES)))
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

  const startYear   = START_YEAR
  const totalYears  = currentYear - START_YEAR + 50
  const [containerH, setContainerH] = useState(() => window.innerHeight)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setContainerH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const leftYears  = expandedYear !== null ? expandedYear - startYear + 1 : totalYears
  const rightYears = expandedYear !== null ? totalYears - leftYears : 0

  const leftLayout  = useMemo(() => computeLayout(containerH, startYear, leftYears), [containerH, startYear, leftYears])
  const rightLayout = useMemo(
    () => rightYears > 0 ? computeLayout(containerH, expandedYear! + 1, rightYears) : null,
    [containerH, expandedYear, rightYears]
  )

  const drawAll = useCallback((ts: number) => {
    if (leftCanvasRef.current)
      drawGrid(leftCanvasRef.current, leftLayout, dayMap, today, expandedYear, ts, activeCategories)
    if (rightCanvasRef.current && rightLayout)
      drawGrid(rightCanvasRef.current, rightLayout, dayMap, today, null, ts, activeCategories)
  }, [leftLayout, rightLayout, dayMap, today, expandedYear, activeCategories])

  // Keep ref current so the RAF loop always calls the latest drawAll
  useEffect(() => { drawAllRef.current = drawAll }, [drawAll])

  // Start the continuous animation loop once
  useEffect(() => {
    function loop(ts: number) {
      drawAllRef.current(ts)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    if (!events.length || hasAutoScrolled.current) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const { yearW, padLeft } = leftLayout
    const todayYi = currentYear - startYear
    const todayX  = padLeft + todayYi * yearW + yearW / 2
    scroller.scrollLeft = todayX - scroller.clientWidth / 2
    hasAutoScrolled.current = true
  }, [events.length, leftLayout, currentYear, startYear])

  const handleJumpToYear = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const yr = parseInt((e.target as HTMLInputElement).value)
    if (isNaN(yr)) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const yearIdx = yr - startYear
    const x = PAD_LEFT + yearIdx * leftLayout.yearW + leftLayout.yearW / 2
    scroller.scrollLeft = x - scroller.clientWidth / 2
  }, [startYear, leftLayout])

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

  const handleAddCategory = useCallback((category: Category) => {
    const next = [...categories, category]
    setCategories(next)
    saveEvents(events, next).catch(console.error)
  }, [categories, events])

  const handleToggleCategory = useCallback((value: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }, [])

  const [filterOpen, setFilterOpen] = useState(false)

  const handleSelectDay  = useCallback((iso: string) => setSelectedISO(iso), [])
  const handleClose      = useCallback(() => { setExpandedYear(null); setSelectedISO(null) }, [])

  return (
    <div className="app-root" ref={containerRef}>
      {loadError && <div className="load-error">⚠ {loadError}</div>}

      <div className="filter-widget">
        <button
          className={`filter-toggle${filterOpen ? ' filter-toggle--open' : ''}`}
          onClick={() => setFilterOpen(o => !o)}
          title="Filter categories"
        >⊞</button>
        {filterOpen && (
          <div className="filter-dropdown">
            <div className="filter-section-label">CATEGORIES</div>
            {categories.map(cat => {
              const active = activeCategories.has(cat.value)
              return (
                <button
                  key={cat.value}
                  className={`category-pill${active ? '' : ' category-pill--inactive'}`}
                  onClick={() => handleToggleCategory(cat.value)}
                >
                  <span className="category-pill-dot" style={{ background: cat.color }} />
                  {cat.label}
                </button>
              )
            })}
            <div className="filter-divider" />
            <div className="filter-section-label">JUMP TO YEAR</div>
            <input
              className="filter-year-input filter-year-input--full"
              type="number"
              placeholder="e.g. 1985"
              onKeyDown={handleJumpToYear}
            />
          </div>
        )}
      </div>

      <div className="timeline-scroller" ref={scrollerRef}>
        <div className="timeline-row" style={{ height: containerH }}>
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
                categories={categories}
                onAddCategory={handleAddCategory}
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
