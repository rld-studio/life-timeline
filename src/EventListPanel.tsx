// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { EventItem } from './types'
import { Category } from './categories'

interface Props {
  events: EventItem[]
  categories: Category[]
  activeCategories: Set<string>
  onClose: () => void
  onJumpToDate: (iso: string) => void
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (!m) return String(y)
  if (!d) return `${months[m - 1]} ${y}`
  return `${months[m - 1]} ${d}, ${y}`
}

function getDecade(iso: string): string {
  const year = parseInt(iso.slice(0, 4))
  const decade = Math.floor(year / 10) * 10
  return `${decade}s`
}

export function EventListPanel({ events, categories, activeCategories, onClose, onJumpToDate }: Props) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return events
      .filter(e => activeCategories.has(e.category))
      .filter(e => {
        if (!q) return true
        return (
          e.title.toLowerCase().includes(q) ||
          (e.location ?? '').toLowerCase().includes(q) ||
          (e.tags ?? []).some(t => t.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
  }, [events, activeCategories, search])

  // Group by decade
  const grouped = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const e of filtered) {
      const decade = getDecade(e.start_date)
      if (!map.has(decade)) map.set(decade, [])
      map.get(decade)!.push(e)
    }
    return Array.from(map.entries())
  }, [filtered])

  const getCatColor = (category: string) => {
    return categories.find(c => c.value === category)?.color ?? '#888'
  }

  const hasImages = (e: EventItem) =>
    !!e.cover_image || (e.artifacts ?? []).some(a => a.type === 'image')

  const hasNotes = (e: EventItem) =>
    (e.artifacts ?? []).some(a => a.type === 'text')

  return (
    <div className="evtlist-overlay" onClick={onClose}>
      <div className="evtlist-panel" onClick={e => e.stopPropagation()}>
        <div className="evtlist-header">
          <span className="evtlist-title">ALL EVENTS</span>
          <span className="evtlist-count">{filtered.length}</span>
          <button className="evtlist-close" onClick={onClose}>✕</button>
        </div>

        <div className="evtlist-search-row">
          <input
            ref={searchRef}
            className="evtlist-search"
            type="text"
            placeholder="Search title, location, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="evtlist-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="evtlist-body">
          {grouped.length === 0 && (
            <div className="evtlist-empty">No events match</div>
          )}
          {grouped.map(([decade, evts]) => (
            <div key={decade}>
              <div className="evtlist-decade">{decade}</div>
              {evts.map(e => (
                <button
                  key={e.id}
                  className="evtlist-row"
                  onClick={() => { onJumpToDate(e.start_date); onClose() }}
                >
                  <span
                    className="evtlist-dot"
                    style={{ background: getCatColor(e.category) }}
                  />
                  <span className="evtlist-date">{fmtDate(e.start_date)}</span>
                  <span className="evtlist-name">{e.title}</span>
                  {e.location && (
                    <span className="evtlist-loc">📍 {e.location}</span>
                  )}
                  <span className="evtlist-icons">
                    {hasImages(e) && <span className="evtlist-icon" title="Has images">▣</span>}
                    {hasNotes(e) && <span className="evtlist-icon" title="Has notes">≡</span>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
