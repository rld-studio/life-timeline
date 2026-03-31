// imageApi.ts — saves to disk via Vite dev server + localStorage backup

export async function uploadImage(
  file: File,
  _eventId: string,
  _role: 'cover' | 'gallery',
): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ url: reader.result as string, filename: file.name })
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export async function deleteImage(_url: string): Promise<void> {}

export async function saveEvents(events: object[]): Promise<void> {
  // Save to localStorage immediately as backup
  localStorage.setItem('life-timeline-events', JSON.stringify(events))
  // Also write to disk via Vite plugin so data survives browser cache clears
  try {
    await fetch('/_events/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
    })
  } catch (e) {
    console.warn('Could not save to disk, localStorage only:', e)
  }
}

export async function loadEvents(): Promise<object[] | null> {
  // Prefer localStorage (has latest edits), fall back to events.json
  const raw = localStorage.getItem('life-timeline-events')
  return raw ? JSON.parse(raw) : null
}
