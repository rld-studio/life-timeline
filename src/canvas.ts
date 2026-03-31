import { EventItem } from './types'
import { fmtISO, dayOfYear } from './dates'
import { pickDayColor } from './dayMap'

// ── Layout constants ──────────────────────────────────────────────────────────
export const GUTTER     = 1   // CSS px gap between year columns
export const PAD_TOP    = 34  // px above grid for decade labels
export const PAD_BOTTOM = 6
export const PAD_LEFT   = 12

export interface GridLayout {
  startYear: number
  totalYears: number
  cell: number
  yearW: number
  padTop: number
  padBottom: number
  padLeft: number
  totalW: number   // CSS px
  totalH: number   // CSS px
}

/** Compute layout given container height and the year range to display */
export function computeLayout(containerH: number, startYear: number, totalYears: number): GridLayout {
  const cell      = Math.max(2, (containerH - PAD_TOP) / 366)  // float — fills exact height
  const padTop    = PAD_TOP
  const padBottom = 0
  const yearW     = Math.max(8, Math.floor(cell) * 3)
  const totalW    = PAD_LEFT + totalYears * yearW + PAD_LEFT
  return {
    startYear,
    totalYears,
    cell,
    yearW,
    padTop,
    padBottom,
    padLeft: PAD_LEFT,
    totalW,
    totalH: containerH,
  }
}

/** X coordinate (CSS px) of the left edge of a year column */
export function yearX(layout: GridLayout, year: number): number {
  return layout.padLeft + (year - layout.startYear) * layout.yearW
}

// ── Main draw ─────────────────────────────────────────────────────────────────
export function drawGrid(
  canvas: HTMLCanvasElement,
  layout: GridLayout,
  dayMap: Map<string, EventItem[]>,
  today: Date,
  highlightYear: number | null,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const { totalW, totalH, startYear, totalYears, cell, yearW, padTop, padBottom, padLeft } = layout

  canvas.width  = Math.floor(totalW * dpr)
  canvas.height = Math.floor(totalH * dpr)
  canvas.style.width  = `${totalW}px`
  canvas.style.height = `${totalH}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const currentYear = today.getFullYear()
  const usableH = cell * 366

  // Background
  ctx.fillStyle = '#0c0c10'
  ctx.fillRect(0, 0, totalW, totalH)

  for (let yi = 0; yi < totalYears; yi++) {
    const year = startYear + yi
    const x    = padLeft + yi * yearW
    const isFuture   = year > currentYear
    const isHighlight = year === highlightYear
    const baseColor  = isFuture ? '#1a1a1f' : '#252528'

    // Highlight halo for the selected/expanded year
    if (isHighlight) {
      ctx.fillStyle = 'rgba(0, 220, 220, 0.08)'
      ctx.fillRect(x - 1, padTop, cell + 2, Math.min(usableH, 366 * cell))
    }

    for (let d = 0; d < 366; d++) {
      const date = new Date(year, 0, d + 1)
      if (date.getFullYear() !== year) break

      const yPx = padTop + d * cell
      if (yPx + cell > totalH - padBottom) break

      const iso  = fmtISO(date)
      const evts = dayMap.get(iso)
      let color  = baseColor

      if (evts && evts.length > 0) {
        const raw = pickDayColor(evts, d, baseColor)
        // Dim future event colours slightly
        color = isFuture ? raw + 'aa' : raw
      }

      ctx.fillStyle = color
      ctx.fillRect(x, yPx, cell, cell)
    }

    // Decade markers
    if (year % 10 === 0) {
      const cx = x + cell / 2
      const isCurrentDecade = year === Math.floor(currentYear / 10) * 10
      const labelColor = isCurrentDecade ? '#00dcdc' : 'rgba(255,255,255,0.70)'

      // Subtle vertical guide line
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fillRect(x, padTop, 1, usableH)

      // Label above grid
      ctx.fillStyle = labelColor
      ctx.font = `bold 9px "IBM Plex Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(year), cx, padTop - 14)

      // Triangle pointing down toward grid
      const triW = 5, triH = 4
      const tipY = padTop - 8
      ctx.fillStyle = labelColor
      ctx.beginPath()
      ctx.moveTo(cx - triW / 2, tipY - triH)
      ctx.lineTo(cx + triW / 2, tipY - triH)
      ctx.lineTo(cx, tipY)
      ctx.closePath()
      ctx.fill()

      ctx.textAlign = 'left'
    }
  }

  // Today horizontal dashed line
  const todayDoy = dayOfYear(today)
  const todayY   = padTop + todayDoy * cell + cell / 2
  ctx.strokeStyle = 'rgba(0, 220, 220, 0.45)'
  ctx.lineWidth   = 1
  ctx.setLineDash([3, 5])
  ctx.beginPath()
  ctx.moveTo(0, todayY)
  ctx.lineTo(totalW, todayY)
  ctx.stroke()
  ctx.setLineDash([])
}

// ── Hit testing ───────────────────────────────────────────────────────────────

/** mx in CSS px relative to the canvas left edge → year, or null */
export function hitYear(mx: number, layout: GridLayout): number | null {
  const yi = Math.floor((mx - layout.padLeft) / layout.yearW)
  if (yi < 0 || yi >= layout.totalYears) return null
  return layout.startYear + yi
}

/** (mx, my) in CSS px → ISO date string, or null */
export function hitDay(mx: number, my: number, layout: GridLayout): string | null {
  const { padLeft, yearW, cell, padTop, startYear, totalYears } = layout
  if (my < padTop) return null
  const yi = Math.floor((mx - padLeft) / yearW)
  if (yi < 0 || yi >= totalYears) return null
  const year = startYear + yi
  const doy  = Math.floor((my - padTop) / cell)
  if (doy < 0 || doy >= 366) return null
  const date = new Date(year, 0, doy + 1)
  if (date.getFullYear() !== year) return null
  return fmtISO(date)
}
