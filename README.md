# Life Timeline

A personal lifetime pixel timeline. Every day is a pixel. Click any year to expand it.

## First-time setup

1. Make sure you have Node.js installed (https://nodejs.org — use the LTS version)
2. Open Terminal
3. Navigate to this folder:
   ```
   cd /path/to/life-timeline
   ```
4. Install dependencies:
   ```
   npm install
   ```
5. Start the dev server:
   ```
   npm run dev
   ```
6. Open **http://localhost:5173** in Chrome

## Adding events

Edit `public/events.json`. Each event looks like:

```json
{
  "id": "unique-id",
  "title": "My Event",
  "start_date": "2024-06-15",
  "end_date": "2024-06-15",
  "category": "family",
  "color": "#22c55e",
  "location": "Atlanta, GA",
  "tags": ["optional"],
  "artifacts": [
    { "type": "text", "content": "Notes about this event." }
  ]
}
```

For approximate dates, add:
```json
"start_precision": "circa",
"end_precision": "circa"
```

For a cover image, add:
```json
"cover_image": "/images/events/my-photo.jpg"
```
...and place the image in `public/images/events/`.

## Category color guide (suggested)
- family:    #22c55e (green)
- education: #a855f7 (purple)
- travel:    #06b6d4 (cyan)
- career:    #f97316 (orange)
- sports:    #3b82f6 (blue)
- art:       #f59e0b (amber)
- health:    #ef4444 (red)

## Interaction
- **Scroll** left/right to navigate years
- **Click any year** to expand it — the year column opens between the two timeline halves
- **Click any day square** in the expanded column to see event details
- **Click ✕** to close the expanded year

## Saving your work
The project lives entirely on your machine. Back it up by copying the folder or pushing to GitHub.
