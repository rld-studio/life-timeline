import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..')
const eventsPath = path.join(root, 'public', 'events.json')
const imagesRoot = path.join(root, 'public', 'images')

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'image/avif': 'avif',
}

// Returns filename on success, null if the data URL has no payload (skip it)
function saveDataUrl(dataUrl, destDir, filename) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null   // empty or malformed payload — caller will nullify the field
  const [, mime, b64] = match
  const ext = MIME_TO_EXT[mime] ?? 'jpg'
  const fname = filename.endsWith('.' + ext) ? filename : `${filename}.${ext}`
  fs.mkdirSync(destDir, { recursive: true })
  fs.writeFileSync(path.join(destDir, fname), Buffer.from(b64, 'base64'))
  return fname
}

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'))

let saved = 0
let skipped = 0
let counter = 1

for (const evt of events) {
  const dir = path.join(imagesRoot, evt.id)

  // cover_image
  if (evt.cover_image?.startsWith('data:')) {
    const fname = saveDataUrl(evt.cover_image, dir, 'cover')
    if (fname) {
      evt.cover_image = `/images/${evt.id}/${fname}`
      console.log(`  [${evt.id}] cover → ${evt.cover_image}`)
      saved++
    } else {
      console.warn(`  [${evt.id}] cover skipped (empty payload) — field cleared`)
      evt.cover_image = undefined
      skipped++
    }
  }

  // artifact image urls
  for (const artifact of evt.artifacts ?? []) {
    if (artifact.type === 'image' && artifact.url?.startsWith('data:')) {
      const fname = saveDataUrl(artifact.url, dir, `img-${counter++}`)
      if (fname) {
        artifact.url = `/images/${evt.id}/${fname}`
        console.log(`  [${evt.id}] artifact → ${artifact.url}`)
        saved++
      } else {
        console.warn(`  [${evt.id}] artifact skipped (empty payload) — url cleared`)
        artifact.url = undefined
        skipped++
      }
    }
  }
}

fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2) + '\n')
console.log(`\nDone. Migrated ${saved} image(s), skipped ${skipped} empty payload(s). events.json updated.`)
