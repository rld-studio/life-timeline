export interface Artifact {
  type: 'text' | 'image' | 'video' | 'audio' | 'link'
  content?: string
  url?: string
  caption?: string
}

export interface EventItem {
  id: string
  title: string
  start_date: string        // YYYY-MM-DD
  end_date: string          // YYYY-MM-DD
  category: string
  color: string
  location?: string
  tags?: string[]
  cover_image?: string      // path like /images/evt-id/cover.jpg
  start_precision?: 'exact' | 'circa'
  end_precision?: 'exact' | 'circa'
  artifacts?: Artifact[]
}

// Returned by the dev-server image API
export interface UploadResult {
  url: string       // e.g. /images/evt-id/cover.jpg
  filename: string
}
