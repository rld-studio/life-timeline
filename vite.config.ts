import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// ── Image management dev-server plugin ───────────────────────────────────────
//
// Exposes three endpoints during `vite dev`:
//
//   POST /_img/upload
//     multipart/form-data: { eventId, role ('cover'|'gallery'), file }
//     → { url, filename }
//
//   DELETE /_img/delete
//     JSON body: { url }   (e.g. "/images/evt-id/cover.jpg")
//     → { ok: true }
//
//   POST /_events/save
//     JSON body: EventItem[]
//     → { ok: true }
//
// Images are stored at: public/images/<eventId>/<filename>
// which Vite serves as static files at /images/<eventId>/<filename>.
//
// In production, replace this plugin with a real backend (Node/Express,
// Supabase Storage, S3, etc.). The frontend only talks to these URL paths.

function imageApiPlugin() {
  return {
    name: 'image-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {

        // ── Upload ──────────────────────────────────────────────────────────
        if (req.method === 'POST' && req.url === '/_img/upload') {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk)
            const body = Buffer.concat(chunks)

            const contentType: string = req.headers['content-type'] ?? ''
            const boundaryMatch = contentType.match(/boundary=(.+)/)
            if (!boundaryMatch) throw new Error('No boundary in content-type')
            const boundary = boundaryMatch[1]

            const parts = parseMultipart(body, boundary)
            const eventId  = parts.find(p => p.name === 'eventId')?.text
            const role     = parts.find(p => p.name === 'role')?.text ?? 'gallery'
            const filePart = parts.find(p => p.name === 'file')
            if (!eventId || !filePart) throw new Error('Missing eventId or file')

            const ext = (filePart.filename ?? 'img.jpg').split('.').pop()?.toLowerCase() ?? 'jpg'
            const safeName = role === 'cover'
              ? `cover.${ext}`
              : `img-${Date.now()}.${ext}`

            const dir = path.resolve('public/images', eventId)
            fs.mkdirSync(dir, { recursive: true })

            // Replace existing cover files
            if (role === 'cover') {
              const existing = fs.existsSync(dir)
                ? fs.readdirSync(dir).filter(f => f.startsWith('cover.'))
                : []
              existing.forEach(f => fs.unlinkSync(path.join(dir, f)))
            }

            fs.writeFileSync(path.join(dir, safeName), filePart.data)

            const url = `/images/${eventId}/${safeName}`
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ url, filename: safeName }))
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(err?.message) }))
          }
          return
        }

        // ── Delete ──────────────────────────────────────────────────────────
        if (req.method === 'DELETE' && req.url === '/_img/delete') {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk)
            const { url } = JSON.parse(Buffer.concat(chunks).toString())

            const rel = url.replace(/^\//, '')
            const abs = path.resolve('public', rel)
            const safeRoot = path.resolve('public/images')
            if (!abs.startsWith(safeRoot)) throw new Error('Path traversal denied')
            if (fs.existsSync(abs)) fs.unlinkSync(abs)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(err?.message) }))
          }
          return
        }

        // ── Save events.json ────────────────────────────────────────────────
        if (req.method === 'POST' && req.url === '/_events/save') {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk)
            const data = JSON.parse(Buffer.concat(chunks).toString())
            fs.writeFileSync(path.resolve('public/events.json'), JSON.stringify(data, null, 2))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(err?.message) }))
          }
          return
        }

        next()
      })
    },
  }
}

// ── Minimal multipart parser ─────────────────────────────────────────────────
interface Part { name: string; filename?: string; data: Buffer; text: string }

function parseMultipart(body: Buffer, boundary: string): Part[] {
  const sep = Buffer.from(`--${boundary}`)
  const parts: Part[] = []
  let start = 0
  while (start < body.length) {
    const idx = indexOf(body, sep, start)
    if (idx === -1) break
    const after = idx + sep.length
    if (body.slice(after, after + 2).equals(Buffer.from('--'))) break
    const headerEnd = indexOf(body, Buffer.from('\r\n\r\n'), after)
    if (headerEnd === -1) break
    const headerStr = body.slice(after + 2, headerEnd).toString()
    const dataStart = headerEnd + 4
    const nextSep = indexOf(body, sep, dataStart)
    const dataEnd = nextSep === -1 ? body.length : nextSep - 2
    const data = body.slice(dataStart, dataEnd)
    const nameMatch = headerStr.match(/name="([^"]+)"/)
    const filenameMatch = headerStr.match(/filename="([^"]+)"/)
    parts.push({ name: nameMatch?.[1] ?? '', filename: filenameMatch?.[1], data, text: data.toString() })
    start = nextSep === -1 ? body.length : nextSep
  }
  return parts
}

function indexOf(haystack: Buffer, needle: Buffer, from = 0): number {
  for (let i = from; i <= haystack.length - needle.length; i++) {
    if (haystack.slice(i, i + needle.length).equals(needle)) return i
  }
  return -1
}

export default defineConfig({
  plugins: [react(), imageApiPlugin()],
})
