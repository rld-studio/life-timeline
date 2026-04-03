export interface Category {
  value: string
  label: string
  color: string
}

export const DEFAULT_CATEGORIES: Category[] = [
  { value: 'family',    label: 'Family',    color: '#22c55e' },
  { value: 'education', label: 'Education', color: '#a855f7' },
  { value: 'career',    label: 'Career',    color: '#f59e0b' },
  { value: 'travel',    label: 'Travel',    color: '#06b6d4' },
  { value: 'health',    label: 'Health',    color: '#ef4444' },
  { value: 'sports',    label: 'Sports',    color: '#3b82f6' },
  { value: 'art',       label: 'Art',       color: '#e879f9' },
  { value: 'personal',  label: 'Personal',  color: '#ec4899' },
  { value: 'milestone', label: 'Milestone', color: '#00dcdc' },
  { value: 'faith',     label: 'Faith',     color: '#fbbf24' },
]

export const COLOR_PALETTE = [
  '#22c55e','#a855f7','#f59e0b','#06b6d4','#ef4444',
  '#3b82f6','#f97316','#ec4899','#00dcdc','#fbbf24',
  '#84cc16','#e879f9','#38bdf8','#fb7185','#34d399',
  '#818cf8','#fcd34d','#f472b6','#60a5fa','#a3e635',
]
