import React, { useRef, useState } from 'react'
import { uploadImage, deleteImage } from './imageApi'
import { Artifact } from './types'

// ── ImageManager ──────────────────────────────────────────────────────────────
//
// Used inside DetailPanel edit mode.
// Handles:
//   • Cover photo: upload, replace, remove
//   • Gallery images: add one or multiple, re-caption, remove
//
// Props mirror the mutable parts of EventItem so the parent controls state.

interface Props {
  eventId: string
  eventColor: string
  coverImage?: string
  artifacts: Artifact[]
  onCoverChange: (url: string | undefined) => void
  onArtifactsChange: (artifacts: Artifact[]) => void
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif'

export function ImageManager({
  eventId, eventColor,
  coverImage, artifacts,
  onCoverChange, onArtifactsChange,
}: Props) {
  const coverInputRef   = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [coverUploading,   setCoverUploading]   = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const galleryImages = artifacts.filter(a => a.type === 'image')
  const otherArtifacts = artifacts.filter(a => a.type !== 'image')

  // ── Cover ────────────────────────────────────────────────────────────────
  async function handleCoverFile(file: File) {
    setError(null)
    setCoverUploading(true)
    try {
      // Delete old cover from disk first
      if (coverImage) await deleteImage(coverImage).catch(() => {})
      const { url } = await uploadImage(file, eventId, 'cover')
      onCoverChange(url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCoverUploading(false)
    }
  }

  async function handleRemoveCover() {
    if (!coverImage) return
    setError(null)
    try {
      await deleteImage(coverImage)
      onCoverChange(undefined)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Gallery ──────────────────────────────────────────────────────────────
  async function handleGalleryFiles(files: FileList) {
    setError(null)
    setGalleryUploading(true)
    try {
      const newImages: Artifact[] = []
      for (const file of Array.from(files)) {
        const { url } = await uploadImage(file, eventId, 'gallery')
        newImages.push({ type: 'image', url, caption: '' })
      }
      onArtifactsChange([...otherArtifacts, ...galleryImages, ...newImages])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGalleryUploading(false)
    }
  }

  async function handleRemoveGalleryImage(url: string) {
    setError(null)
    try {
      await deleteImage(url)
      const next = artifacts.filter(a => !(a.type === 'image' && a.url === url))
      onArtifactsChange(next)
    } catch (e: any) {
      setError(e.message)
    }
  }

  function handleCaptionChange(url: string, caption: string) {
    const next = artifacts.map(a =>
      a.type === 'image' && a.url === url ? { ...a, caption } : a
    )
    onArtifactsChange(next)
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  function onDrop(e: React.DragEvent, target: 'cover' | 'gallery') {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files.length) return
    if (target === 'cover') handleCoverFile(files[0])
    else handleGalleryFiles(files)
  }

  return (
    <div className="img-manager">
      {error && <div className="img-error">⚠ {error}</div>}

      {/* ── Cover Photo ── */}
      <section className="img-section">
        <h3 className="img-section-title">Cover Photo</h3>

        {coverImage ? (
          <div className="img-cover-preview">
            <img src={coverImage} alt="Cover" className="img-cover-thumb" />
            <div className="img-cover-actions">
              <button
                className="img-btn img-btn--primary"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
              >
                {coverUploading ? 'Uploading…' : '↺ Replace'}
              </button>
              <button
                className="img-btn img-btn--danger"
                onClick={handleRemoveCover}
                disabled={coverUploading}
              >
                ✕ Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            className="img-drop-zone img-drop-zone--cover"
            style={{ '--c': eventColor } as React.CSSProperties}
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, 'cover')}
            onClick={() => coverInputRef.current?.click()}
          >
            {coverUploading
              ? <span className="img-drop-label">Uploading…</span>
              : <>
                  <span className="img-drop-icon">🖼</span>
                  <span className="img-drop-label">Drop or click to add cover photo</span>
                  <span className="img-drop-hint">JPG, PNG, WebP · will fill 4:3 area</span>
                </>
            }
          </div>
        )}

        <input
          ref={coverInputRef}
          type="file"
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleCoverFile(e.target.files[0])}
        />
      </section>

      {/* ── Gallery ── */}
      <section className="img-section">
        <h3 className="img-section-title">Gallery Images</h3>

        {galleryImages.length > 0 && (
          <div className="img-gallery-grid">
            {galleryImages.map((img, i) => (
              <div key={img.url ?? i} className="img-gallery-item">
                <div className="img-gallery-thumb-wrap">
                  <img src={img.url} alt={img.caption ?? ''} className="img-gallery-thumb" />
                  <button
                    className="img-gallery-remove"
                    title="Remove image"
                    onClick={() => img.url && handleRemoveGalleryImage(img.url)}
                  >✕</button>
                </div>
                <input
                  type="text"
                  className="img-caption-input"
                  placeholder="Caption (optional)"
                  value={img.caption ?? ''}
                  onChange={e => img.url && handleCaptionChange(img.url, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div
          className="img-drop-zone img-drop-zone--gallery"
          onDragOver={e => e.preventDefault()}
          onDrop={e => onDrop(e, 'gallery')}
          onClick={() => galleryInputRef.current?.click()}
        >
          {galleryUploading
            ? <span className="img-drop-label">Uploading…</span>
            : <>
                <span className="img-drop-icon">＋</span>
                <span className="img-drop-label">Drop or click to add images</span>
                <span className="img-drop-hint">Multiple files OK</span>
              </>
          }
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files?.length && handleGalleryFiles(e.target.files)}
        />
      </section>
    </div>
  )
}
