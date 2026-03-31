import React, { useState, useCallback } from 'react'
import { EventItem, Artifact } from './types'
import { displayDateRange } from './dates'
import { ImageManager } from './ImageManager'
import { ImageLightbox } from './ImageLightbox'
import { saveEvents } from './imageApi'

interface Props {
  iso: string
  events: EventItem[]
  allEvents: EventItem[]
  height: number
  onClose: () => void
  onEventsChange: (events: EventItem[]) => void
}

export function DetailPanel({ iso, events, allEvents, height, onClose, onEventsChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleSaveEvent(updated: EventItem) {
    const exists = allEvents.some(e => e.id === updated.id)
    const next = exists
      ? allEvents.map(e => e.id === updated.id ? updated : e)
      : [...allEvents, updated]
    onEventsChange(next)
    await saveEvents(next).catch(console.error)
    setEditingId(null)
    setShowAddForm(false)
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Delete this event?')) return
    const next = allEvents.filter(e => e.id !== id)
    onEventsChange(next)
    await saveEvents(next).catch(console.error)
  }

  const blankEvent = (): EventItem => ({
    id: 'evt-' + iso + '-' + Date.now(),
    title: '',
    start_date: iso,
    end_date: iso,
    category: 'personal',
    color: '#a855f7',
    artifacts: [],
  })

  return (
    <div className="detail-panel" style={{ height }}>
      <button className="detail-close" onClick={onClose} title="Close">✕</button>
      <div className="detail-scroll">
        {showAddForm ? (
          <EventCardEdit evt={blankEvent()} isFirst={true} isNew={true}
            onSave={handleSaveEvent} onCancel={() => setShowAddForm(false)} />
        ) : (
          <div className="detail-add-row">
            <span className="detail-add-date">{iso}</span>
            <button className="detail-add-btn" onClick={() => setShowAddForm(true)}>+ Add Event</button>
          </div>
        )}
        {events.length === 0 && !showAddForm && (
          <div className="detail-empty"><p>No events on this day.</p></div>
        )}
        {events.map((evt, i) =>
          editingId === evt.id ? (
            <EventCardEdit key={evt.id} evt={evt} isFirst={i === 0} isNew={false}
              onSave={handleSaveEvent} onCancel={() => setEditingId(null)} />
          ) : (
            <EventCard key={evt.id} evt={evt} isFirst={i === 0}
              onEdit={() => setEditingId(evt.id)}
              onDelete={() => handleDeleteEvent(evt.id)} />
          )
        )}
      </div>
    </div>
  )
}

function EventCard({ evt, isFirst, onEdit, onDelete }: {
  evt: EventItem; isFirst: boolean; onEdit: () => void; onDelete: () => void
}) {
  const dateStr = displayDateRange(evt.start_date, evt.end_date, evt.start_precision, evt.end_precision)
  const textNotes = (evt.artifacts ?? []).filter(a => a.type === 'text')
  const galleryImgs = (evt.artifacts ?? []).filter(a => a.type === 'image' && a.url)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const allImages = [
    ...(evt.cover_image ? [{ url: evt.cover_image, caption: evt.title }] : []),
    ...galleryImgs.map(a => ({ url: a.url!, caption: a.caption })),
  ]
  return (
    <article className={`evt-card${isFirst ? ' evt-card--first' : ''}`}>
      {evt.cover_image ? (
        <div className="evt-cover" onClick={() => setLightboxIdx(0)}>
          <img src={evt.cover_image} alt={evt.title} className="evt-cover-img" />
          <button className="evt-expand" onClick={e => { e.stopPropagation(); setLightboxIdx(0) }}>⤢</button>
        </div>
      ) : (
        <div className="evt-cover evt-cover--placeholder" style={{ '--c': evt.color } as React.CSSProperties} />
      )}
      <div className="evt-header">
        <div className="evt-date">{dateStr}</div>
        <h2 className="evt-title">{evt.title}</h2>
        {evt.location && <div className="evt-location">📍 {evt.location}</div>}
        <div className="evt-header-row">
          <div className="evt-pill" style={{ borderColor: evt.color + '80', color: evt.color }}>{evt.category}</div>
          <div className="evt-card-actions">
            <button className="evt-edit-btn" onClick={onEdit}>✎ Edit</button>
            <button className="evt-delete-btn" onClick={onDelete}>✕</button>
          </div>
        </div>
      </div>
      {(textNotes.length > 0 || galleryImgs.length > 0) && (
        <div className="evt-body">
          {textNotes.map((a, i) => <p key={i} className="evt-note">{a.content}</p>)}
          {galleryImgs.length > 0 && (
            <div className="evt-gallery">
              {galleryImgs.map((a, i) => (
                <div key={i} className="evt-gallery-item"
                  onClick={() => setLightboxIdx(evt.cover_image ? i + 1 : i)}>
                  <img src={a.url} alt={a.caption ?? ''} />
                  {a.caption && <div className="evt-gallery-caption">{a.caption}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {evt.tags && evt.tags.length > 0 && (
        <div className="evt-tags">{evt.tags.map(t => <span key={t} className="evt-tag">#{t}</span>)}</div>
      )}
      {lightboxIdx !== null && allImages.length > 0 && (
        <ImageLightbox images={allImages} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </article>
  )
}

const CATEGORIES = [
  { value: 'family',    label: 'Family',    color: '#22c55e' },
  { value: 'education', label: 'Education', color: '#a855f7' },
  { value: 'career',    label: 'Career',    color: '#f59e0b' },
  { value: 'travel',    label: 'Travel',    color: '#06b6d4' },
  { value: 'health',    label: 'Health',    color: '#ef4444' },
  { value: 'sports',    label: 'Sports',    color: '#3b82f6' },
  { value: 'art',       label: 'Art',       color: '#f59e0b' },
  { value: 'personal',  label: 'Personal',  color: '#a855f7' },
  { value: 'milestone', label: 'Milestone', color: '#00dcdc' },
]

function EventCardEdit({ evt, isFirst, isNew, onSave, onCancel }: {
  evt: EventItem; isFirst: boolean; isNew: boolean
  onSave: (updated: EventItem) => Promise<void>; onCancel: () => void
}) {
  const [draft, setDraft] = useState<EventItem>({ ...evt, artifacts: [...(evt.artifacts ?? [])] })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'images'>(isNew ? 'details' : 'images')
  const [tagInput, setTagInput] = useState((evt.tags ?? []).join(', '))

  const set = useCallback(<K extends keyof EventItem>(k: K, v: EventItem[K]) => {
    setDraft(d => ({ ...d, [k]: v }))
  }, [])

  function handleCategoryChange(value: string) {
    const cat = CATEGORIES.find(c => c.value === value)
    set('category', value)
    if (cat) set('color', cat.color)
  }

  async function handleSave() {
    if (!draft.title.trim()) return alert('Please enter a title.')
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    setSaving(true)
    await onSave({ ...draft, tags })
    setSaving(false)
  }

  const noteText = (draft.artifacts ?? []).find(a => a.type === 'text')?.content ?? ''
  function handleNoteChange(text: string) {
    const imgs = (draft.artifacts ?? []).filter(a => a.type === 'image')
    const others = (draft.artifacts ?? []).filter(a => a.type !== 'text' && a.type !== 'image')
    set('artifacts', text ? [{ type: 'text', content: text }, ...imgs, ...others] : [...imgs, ...others])
  }

  return (
    <article className={`evt-card evt-card--edit${isFirst ? ' evt-card--first' : ''}`}>
      <div className="evt-edit-header" style={{ borderLeftColor: draft.color }}>
        <span className="evt-edit-label">{isNew ? 'New Event' : 'Editing'}</span>
        <span className="evt-edit-title-preview">{draft.title || 'Untitled'}</span>
      </div>
      <div className="evt-edit-tabs">
        <button className={`evt-edit-tab${activeTab === 'details' ? ' evt-edit-tab--active' : ''}`}
          onClick={() => setActiveTab('details')}>✎ Details</button>
        <button className={`evt-edit-tab${activeTab === 'images' ? ' evt-edit-tab--active' : ''}`}
          onClick={() => setActiveTab('images')}>🖼 Images</button>
      </div>
      {activeTab === 'details' && (
        <div className="evt-edit-details">
          <label className="evt-field">
            <span className="evt-field-label">Title *</span>
            <input className="evt-field-input" value={draft.title}
              onChange={e => set('title', e.target.value)} placeholder="Event title" />
          </label>
          <label className="evt-field">
            <span className="evt-field-label">Category</span>
            <select className="evt-field-input evt-field-select" value={draft.category}
              onChange={e => handleCategoryChange(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <div className="evt-field-row">
            <label className="evt-field">
              <span className="evt-field-label">Start date</span>
              <input className="evt-field-input" type="date" value={draft.start_date}
                onChange={e => set('start_date', e.target.value)} />
            </label>
            <label className="evt-field">
              <span className="evt-field-label">End date</span>
              <input className="evt-field-input" type="date" value={draft.end_date}
                onChange={e => set('end_date', e.target.value)} />
            </label>
          </div>
          <label className="evt-field">
            <span className="evt-field-label">Location</span>
            <input className="evt-field-input" value={draft.location ?? ''}
              onChange={e => set('location', e.target.value || undefined)}
              placeholder="City, State or venue" />
          </label>
          <label className="evt-field">
            <span className="evt-field-label">Notes</span>
            <textarea className="evt-field-input evt-field-textarea" value={noteText}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Write anything you want to remember..." />
          </label>
          <label className="evt-field">
            <span className="evt-field-label">Tags (comma-separated)</span>
            <input className="evt-field-input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              placeholder="birthday, trip, milestone" />
          </label>
        </div>
      )}
      {activeTab === 'images' && (
        <ImageManager eventId={draft.id} eventColor={draft.color}
          coverImage={draft.cover_image} artifacts={draft.artifacts ?? []}
          onCoverChange={url => set('cover_image', url)}
          onArtifactsChange={artifacts => set('artifacts', artifacts)} />
      )}
      <div className="evt-edit-actions">
        <button className="evt-btn evt-btn--cancel" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="evt-btn evt-btn--save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isNew ? '+ Create Event' : '✓ Save Changes'}
        </button>
      </div>
    </article>
  )
}