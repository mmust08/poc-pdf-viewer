# Prototype 1.1 — PDF.js with Multi-page Virtualization

**Route:** `/prototype/pdfjs`  
**Source:** `src/components/pdfjs/`  
**Stack:** `pdfjs-dist` v4 · React 18

---

## Packages

| Package | Version | Role |
|---|---|---|
| `pdfjs-dist` | ^4.10.38 | PDF parsing and canvas rendering |

Worker loaded via Vite URL import (`pdfjs-dist/build/pdf.worker.mjs?url`) — no copy step needed.

---

## Architecture

```
PdfJsViewer
├── Scroll container (overflow: auto)
│   ├── PageCanvas × N visible pages
│   │   ├── <canvas> (absolutely positioned clip region)
│   │   └── MarksOverlay (SVG overlay, same dimensions as page)
│   └── Placeholder <div> × N virtualised pages (height-only, no canvas)
└── Toolbar (zoom, page count, file upload, mark controls)
```

### File structure

| File | Purpose |
|---|---|
| `PdfJsViewer.tsx` | Main viewer — scroll container, zoom/pan state, page virtualisation, PDF load |
| `MarksOverlay.tsx` | SVG overlay per page — click-to-add marks, coordinate conversion |
| `useMarks.ts` | Mark state + localStorage persistence keyed by filename |

---

## Render Method

Each page renders to a `<canvas>` inside `PageCanvas`. The canvas covers only the **visible region plus a dynamic pre-render margin** (75% of viewport, minimum 800 px). At extreme zoom levels this keeps canvas dimensions within the 16 384 px browser limit.

### Double-buffering

PDF.js renders into an offscreen canvas. Only when the task completes is the visible canvas resized and filled via `drawImage` in a single JS task — the old frame stays visible throughout, no grey flash.

### HiDPI

Canvas bitmap is allocated at `width × devicePixelRatio` but CSS-sized to logical pixels. The PDF.js viewport scale is also multiplied by DPR before rendering.

### Zoom debounce (150 ms)

On zoom the existing canvas is immediately CSS-rescaled to approximate the new zoom level (GPU, 0 ms latency). A 150 ms debounce delays the PDF.js render until the user pauses, preventing redundant renders on every wheel tick.

### Skip-render

If the visible region is still fully within the last-rendered clip region (200 px threshold), the render is skipped entirely — no work dispatched to PDF.js.

---

## Key Improvements

### Page virtualisation
Only mounts `PageCanvas` for pages within 2 viewport-heights of the visible area. Off-screen pages are replaced with empty `<div>` placeholders of the correct height so the scrollbar geometry stays stable.

### Anchor-point zoom
Ctrl+wheel captures the cursor position in PDF coordinate space before the scale changes (`pdfX = (pointerX + scrollLeft) / oldScale`). After React re-renders at the new scale, a `useEffect` restores `scrollLeft`/`scrollTop` so the point under the cursor stays fixed.

### Grab-to-pan
Left-click drag moves the viewport by directly manipulating `scrollLeft`/`scrollTop` on the scroll container. A pointer-down/up distance check (5 px²) distinguishes a drag from a click-to-add-mark.

### Smooth scroll normalisation
All wheel events (non-Ctrl) are intercepted via a non-passive listener. `deltaY`/`deltaX` are converted to pixels (handling `DOM_DELTA_LINE` and `DOM_DELTA_PAGE` modes) and capped at `MAX_SCROLL_DELTA` (300 px) before being applied to `scrollTop`/`scrollLeft`. This prevents Logitech smooth-scrolling drivers from sending a single high-velocity event that scrolls the document to its extreme in one move, while leaving normal mice and trackpads unaffected.

Ctrl+wheel zoom uses a separate delta accumulator (`wheelZoomAccumRef`). Each event adds to the accumulator; a zoom step only fires once the accumulated total crosses `ZOOM_WHEEL_THRESHOLD` (50 px), at which point the threshold amount is subtracted and any remainder carries forward. This means a Logitech smooth-scroll gesture that fires 20 small events produces the same number of zoom steps as an equivalent physical wheel rotation on a mechanical mouse.

### Mark persistence
`useMarks` writes to `localStorage` as `pdfmarks:<filename>` on every change, and restores on PDF load. `saveAndReset()` persists marks before switching to a different PDF.

### Fit-to-width on load
Initial scale is `containerWidth / firstPageWidthPt` so the first page fills the viewport immediately.

---

## Coordinate System

PDF origin is **bottom-left**; SVG origin is **top-left**. Marks are converted on render:

```
cx = mark.x * scale
cy = (pageHeightPt - mark.y) * scale
```

---

## Key Constants

| Constant | Value | Purpose |
|---|---|---|
| `MIN_SCALE` | 0.1 | 10% minimum zoom |
| `MAX_SCALE` | 50 | 5 000% maximum zoom |
| `ZOOM_STEPS` | [0.1 … 50.0] | Discrete step list for Ctrl+wheel and zoom buttons |
| `ZOOM_PRESETS` | 50–400 % | Dropdown preset percentages |
| `CONTAINER_H_PADDING` | 32 px | Horizontal padding subtracted when computing fit scales |
| `CONTAINER_V_PADDING` | 16 px | Vertical padding subtracted when computing fit scales |
| `MAX_CANVAS_DIM` | 16 384 | Browser canvas pixel limit per axis |
| `PAGE_GAP` | 12 px | Gap between pages |
| `MARGIN_FRACTION` | 0.75 | Pre-render margin as fraction of viewport |
| `MARGIN_MIN_PX` | 800 | Minimum pre-render margin |
| `RERENDER_THRESHOLD_PX` | 200 | Scroll distance before triggering re-render |
| `VIRTUALIZATION_VIEWPORTS` | 2 | Pages mounted beyond the visible viewport |
| `ZOOM_RENDER_DEBOUNCE_MS` | 150 | Debounce after zoom before issuing render |
| `MAX_SCROLL_DELTA` | 300 px | Cap per wheel event — prevents Logitech smooth-scroll runaway |
| `ZOOM_WHEEL_THRESHOLD` | 50 px | Accumulated Ctrl+wheel delta required to advance one zoom step |

---

## Audit Trail

| Date | Change |
|---|---|
| 2026-05-07 | Added smooth scroll normalisation — intercept non-Ctrl wheel events, cap delta at 300 px per event to prevent Logitech smooth-scrolling runaway (`PdfJsViewer.tsx`) |
| 2026-05-07 | Added Ctrl+wheel zoom accumulator — zoom step only fires after 50 px accumulated delta, preventing Logitech smooth-scroll from racing through multiple zoom steps per gesture (`PdfJsViewer.tsx`) |
| 2026-05-07 | Fix Ctrl+wheel zoom accumulator drain at MIN/MAX_SCALE — moved threshold subtraction after limit guard and reset accumulator on limit hit; fixes inverted direction and broken zoom after saturating at extremes (`PdfJsViewer.tsx`) |
| 2026-05-07 | Fix Ctrl+wheel zoom carry buildup — clamp carry to ±(ZOOM_WHEEL_THRESHOLD-1) after each step fires; prevents Logitech free-spin large-delta events from accumulating enough carry to fire reversed zoom steps when the user changes scroll direction (`PdfJsViewer.tsx`) |
