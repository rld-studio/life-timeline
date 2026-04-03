export async function uploadImage(file: File, eventId: string, role: string): Promise<{url: string; filename: string}> {
  const form = new FormData()
  form.append('eventId', eventId)
  form.append('role', role)
  form.append('file', file)
  const res = await fetch('/_img/upload', { method: 'POST', body: form })
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

const LS_KEY = 'life-timeline-data'

export async function saveEvents(events: object[], categories: object[]): Promise<void> {
  if (!events || events.length === 0) { console.warn('saveEvents: refusing to save empty events array'); return; }
  const data = { events, categories }
  localStorage.setItem(LS_KEY, JSON.stringify(data))
  try {
    await fetch('/_events/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (e) {
    console.warn('localStorage only:', e)
  }
}

export async function loadEvents(): Promise<{ events: object[]; categories: object[] } | null> {
  const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem('life-timeline-events')
  if (!raw) return null
  const parsed = JSON.parse(raw)
  // Handle legacy format (plain array)
  if (Array.isArray(parsed)) return { events: parsed, categories: [] }
  return parsed
}
