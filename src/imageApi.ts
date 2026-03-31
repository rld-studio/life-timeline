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

export async function saveEvents(events: object[]): Promise<void> {
  localStorage.setItem('life-timeline-events', JSON.stringify(events))
  try {
    await fetch('/_events/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    })
  } catch (e) {
    console.warn('localStorage only:', e)
  }
}

export async function loadEvents(): Promise<object[] | null> {
  const raw = localStorage.getItem('life-timeline-events')
  return raw ? JSON.parse(raw) : null
}
