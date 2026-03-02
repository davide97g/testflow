# QA Test Recorder (Chrome Extension)

Manifest V3 Chrome Extension that records manual user actions on any webpage and exports structured JSON for later conversion to Playwright tests.

## Build

From the repo root (builds with Turbo):

```bash
bun run build
```

Or only the extension:

```bash
bun run build --filter=extension
```

From `apps/extension`:

```bash
npm install
npm run build
```

This compiles all `.ts` files to `dist/`. The manifest and panel reference scripts under `dist/`.

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `apps/extension` folder (the one containing `manifest.json` and the `dist/` folder with compiled `.js` files).

## Usage

1. Pin the extension and click the extension icon to open the **side panel** (or use the puzzle piece menu and open "QA Test Recorder").
2. **Start Recording** – recording state is stored in the background script; the content script in the active tab will capture events.
3. Use the page as normal (clicks, typing, form submit, navigation). Only click, input, change, submit, and navigation are recorded (no mousemove, scroll, hover).
4. **Stop Recording** when done.
5. **Export JSON** – downloads a `recording.json` file with `metadata` (url, recordedAt, userAgent) and `steps` (each with id, action, semanticLabel, selector, etc.).

## Output format

Exported JSON shape:

```json
{
  "metadata": {
    "url": "https://example.com",
    "recordedAt": "2025-03-02T12:00:00.000Z",
    "userAgent": "..."
  },
  "steps": [
    {
      "id": "...",
      "action": "click",
      "semanticLabel": "Click Login",
      "url": "https://...",
      "selector": { "primary": "...", "candidates": [...] },
      "timestamp": 1234567890
    }
  ]
}
```

You can convert this into Playwright tests in a separate step (not part of this extension).
