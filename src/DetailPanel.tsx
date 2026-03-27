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

  return (
    <div className="detail-panel" style={{ height }}>
      <button className="detail-close" onClick={onClose} title="Close">✕</button>

      {events.length === 0 ? (
        <div className="detail-empty">
          <span className="detail-empty-date">{iso}</span>
          <p>No events on this day.</p>
        </div>
      ) : (
        <div className="detail-scroll">
          {events.map((evt, i) =>
            editingId === evt.id ? (
              <EventCardEdit
                key={evt.id}
                evt={evt}
                isFirst={i === 0}
                onSave={async (updated) => {
                  const next = allEvents.map(e => e.id === updated.id ? updated : e)
                  onEventsChange(next)
                  await saveEvents(next).catch(console.error)
                  setEditingId(null)
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <EventCard
                key={evt.id}
                evt={evt}
                isFirst={i === 0}
                onEdit={() => setEditingId(evt.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Read-only card ─────────────────────────────────────────────────────────────
function EventCard({
  evt, isFirst, onEdit,
}: { evt: EventItem; isFirst: boolean; onEdit: () => void }) {
  const dateStr     = displayDateRange(evt.start_date, evt.end_date, evt.start_precision, evt.end_precision)
  const textNotes   = (evt.artifacts ?? []).filter(a => a.type === 'text')
  const galleryImgs = (evt.artifacts ?? []).filter(a => a.type === 'image' && a.url)

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const allImages = [
    ...(evt.cover_image ? [{ url: evt.cover_image, caption: evt.title }] : []),
    ...galleryImgs.map(a => ({ url: a.url!, caption: a.caption })),
  ]

  return (
    <article className={`evt-card${isFirst ? ' evt-card--first' : ''}`}>

      {/* Cover image */}
      {evt.cover_image ? (
        <div className="evt-cover" onClick={() => setLightboxIdx(0)}>
          <img src={evt.cover_image} alt={evt.title} className="evt-cover-img" />
          <button className="evt-expand" title="Expand image" onClick={e => { e.stopPropagation(); setLightboxIdx(0) }}>⤢</button>
        </div>
      ) : (
        <div className="evt-cover evt-cover--placeholder" style={{ '--c': evt.color } as React.CSSProperties} />
      )}

      {/* Header */}
      <div className="evt-header">
        <div className="evt-date">{dateStr}</div>
        <h2 className="evt-title">{evt.title}</h2>
        {evt.location && <div className="evt-location">📍 {evt.location}</div>}
        <div className="evt-header-row">
          <div className="evt-pill" style={{ borderColor: evt.color + '80', color: evt.color }}>
            {evt.category}
          </div>
          <button className="evt-edit-btn" onClick={onEdit} title="Edit event">
            ✎ Edit
          </button>
        </div>
      </div>

      {/* Body */}
      {(textNotes.length > 0 || galleryImgs.length > 0) && (
        <div className="evt-body">
          {textNotes.map((a, i) => (
            <p key={i} className="evt-note">{a.content}</p>
          ))}

          {galleryImgs.length > 0 && (
            <div className="evt-gallery">
              {galleryImgs.map((a, i) => (
                <div
                  key={i}
                  className="evt-gallery-item"
                  onClick={() => setLightboxIdx(evt.cover_image ? i + 1 : i)}
                  title="Click to enlarge"
                >
                  <img src={a.url} alt={a.caption ?? ''} />
                  {a.caption && <div className="evt-gallery-caption">{a.caption}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {evt.tags && evt.tags.length > 0 && (
        <div className="evt-tags">
          {evt.tags.map(t => <span key={t} className="evt-tag">#{t}</span>)}
        </div>
      )}

      {lightboxIdx !== null && allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </article>
  )
}

// ── Edit card ──────────────────────────────────────────────────────────────────
function EventCardEdit({
  evt, isFirst, onSave, onCancel,
}: {
  evt: EventItem
  isFirst: boolean
  onSave: (updated: EventItem) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<EventItem>({ ...evt, artifacts: [...(evt.artifacts ?? [])] })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'images'>('images')

  const set = useCallback(<K extends keyof EventItem>(k: K, v: EventItem[K]) => {
    setDraft(d => ({ ...d, [k]: v }))
  }, [])

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  return (
    <article className={`evt-card evt-card--edit${isFirst ? ' evt-card--first' : ''}`}>

      {/* Edit header */}
      <div className="evt-edit-header" style={{ borderLeftColor: draft.color }}>
        <span className="evt-edit-label">Editing</span>
        <span className="evt-edit-title-preview">{draft.title}</span>
      </div>

      {/* Tabs */}
      <div className="evt-edit-tabs">
        <button
          className={`evt-edit-tab${activeTab === 'images' ? ' evt-edit-tab--active' : ''}`}
          onClick={() => setActiveTab('images')}
        >🖼 Images</button>
        <button
          className={`evt-edit-tab${activeTab === 'details' ? ' evt-edit-tab--active' : ''}`}
          onClick={() => setActiveTab('details')}
        >✎ Details</button>
      </div>

      {/* ── Images tab ── */}
      {activeTab === 'images' && (
        <ImageManager
          eventId={draft.id}
          eventColor={draft.color}
          coverImage={draft.cover_image}
          artifacts={draft.artifacts ?? []}
          onCoverChange={url => set('cover_image', url)}
          onArtifactsChange={artifacts => set('artifacts', artifacts)}
        />
      )}

      {/* ── Details tab ── */}
      {activeTab === 'details' && (
        <div className="evt-edit-details">
          <label className="evt-field">
            <span className="evt-field-label">Title</span>
            <input
              className="evt-field-input"
              value={draft.title}
              onChange={e => set('title', e.target.value)}
            />
          </label>

          <label className="evt-field">
            <span className="evt-field-label">Location</span>
            <input
              className="evt-field-input"
              value={draft.location ?? ''}
              onChange={e => set('location', e.target.value || undefined)}
            />
          </label>

          <div className="evt-field-row">
            <label className="evt-field">
              <span className="evt-field-label">Start date</span>
              <input
                className="evt-field-input"
                type="date"
                value={draft.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </label>
            <label className="evt-field">
              <span className="evt-field-label">End date</span>
              <input
                className="evt-field-input"
                type="date"
                value={draft.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </label>
          </div>

          <label className="evt-field">
            <span className="evt-field-label">Notes</span>
            <textarea
              className="evt-field-input evt-field-textarea"
              value={(draft.artifacts ?? []).find(a => a.type === 'text')?.content ?? ''}
              onChange={e => {
                const others = (draft.artifacts ?? []).filter(a => a.type !== 'text')
                const imgs   = (draft.artifacts ?? []).filter(a => a.type === 'image')
                const text   = e.target.value
                set('artifacts', text
                  ? [{ type: 'text', content: text }, ...imgs, ...others.filter(a => a.type !== 'image')]
                  : [...imgs, ...others.filter(a => a.type !== 'image')]
                )
              }}
            />
          </label>

          <label className="evt-field">
            <span className="evt-field-label">Tags (comma-separated)</span>
            <input
              className="evt-field-input"
              value={(draft.tags ?? []).join(', ')}
              onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            />
          </label>
        </div>
      )}

      {/* Save / Cancel */}
      <div className="evt-edit-actions">
        <button className="evt-btn evt-btn--cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="evt-btn evt-btn--save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save'}
        </button>
      </div>
    </article>
  )
}
