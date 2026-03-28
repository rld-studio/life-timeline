// imageApi.ts — StackBlitz-compatible (localStorage + base64)
// Images are stored as base64 data URLs embedded directly in events.
// To move to a real backend later, only this file needs to change.

const STORAGE_KEY = 'life-timeline-events'

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

export async function deleteImage(_url: string): Promise<void> {
  // base64 images live inside the event object — removing the reference is enough
}

export async function saveEvents(events: object[]): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export async function loadEvents(): Promise<object[] | null> {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}
