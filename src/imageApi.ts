import { UploadResult } from './types'

// ── Image API ─────────────────────────────────────────────────────────────────
//
// All image I/O goes through these two functions.
// They talk to the Vite dev-server plugin (vite.config.ts).
//
// To switch to a real backend (Supabase Storage, S3, etc.) only these
// functions need to change — the rest of the UI stays the same.

export async function uploadImage(
  file: File,
  eventId: string,
  role: 'cover' | 'gallery',
): Promise<UploadResult> {
  const fd = new FormData()
  fd.append('eventId', eventId)
  fd.append('role', role)
  fd.append('file', file)

  const res = await fetch('/_img/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Upload failed')
  }
  return res.json()
}

export async function deleteImage(url: string): Promise<void> {
  const res = await fetch('/_img/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Delete failed')
  }
}

export async function saveEvents(events: object[]): Promise<void> {
  const res = await fetch('/_events/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(events),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Save failed')
  }
}
