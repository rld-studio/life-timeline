import React, { useEffect, useCallback } from 'react'

interface Props {
  images: { url: string; caption?: string }[]
  startIndex: number
  onClose: () => void
}

export function ImageLightbox({ images, startIndex, onClose }: Props) {
  const [index, setIndex] = React.useState(startIndex)
  const current = images[index]

  const prev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  if (!current) return null

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} title="Close (Esc)">✕</button>

      {images.length > 1 && (
        <>
          <button
            className="lightbox-nav lightbox-nav--prev"
            onClick={e => { e.stopPropagation(); prev() }}
            title="Previous (←)"
          >‹</button>
          <button
            className="lightbox-nav lightbox-nav--next"
            onClick={e => { e.stopPropagation(); next() }}
            title="Next (→)"
          >›</button>
        </>
      )}

      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <img src={current.url} alt={current.caption ?? ''} className="lightbox-img" />
        {current.caption && (
          <div className="lightbox-caption">{current.caption}</div>
        )}
        {images.length > 1 && (
          <div className="lightbox-counter">{index + 1} / {images.length}</div>
        )}
      </div>
    </div>
  )
}
