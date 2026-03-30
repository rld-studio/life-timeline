// imageApi.ts
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
  localStorage.setItem('life-timeline-events', JSON.stringify(events))
}

export async function loadEvents(): Promise<object[] | null> {
  const raw = localStorage.getItem('life-timeline-events')
  return raw ? JSON.parse(raw) : null
}
