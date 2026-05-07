# Prototype 5 — PDFium Raw WASM

**Route:** `/prototype/pdfium-raw`  
**Source:** `src/components/pdfium-raw/`  
**Stack:** `@hyzyla/pdfium` v2 · Web Workers · React 18

---

## Packages

| Package | Version | Role |
|---|---|---|
| `@hyzyla/pdfium` | ^2.1.12 | PDFium WASM engine — parses PDF and rasterises pages to RGBA bitmaps |

Zero other rendering dependencies. All viewer infrastructure is custom-built.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Main Thread (React)                                       │
│                                                            │
│  PdfiumRawViewer (thin composition layer)                  │
│  ├─ useZoom     → scale, handleZoom, Ctrl+wheel handler    │
│  ├─ usePan      → grab-to-pan via scrollLeft/scrollTop     │
│  ├─ useVirtualization → visibleRange, scrollVersion        │
│  ├─ useWorker   → requestRender, loadBuffer, loading state │
│  ├─ useMarks    → mark state, localStorage persistence     │
│  │                                                         │
│  ├─ PageCanvas (per visible page)                          │
│  │   ├─ CSS-stretch old canvas on zoom (instant, GPU)      │
│  │   ├─ 150 ms debounce → worker render request            │
│  │   ├─ CanvasCache hit → blit from cache (no worker)      │
│  │   ├─ renderDone: ImageData → offscreen → atomic swap    │
│  │   ├─ Skip-render check (200 px threshold)               │
│  │   └─ Viewport clip for oversized pages                  │
│  │                                                         │
│  └─ MarksOverlay (SVG circles + labels per page)           │
│                                                            │
├─────────── postMessage (structured, zero-copy) ────────────┤
│                                                            │
│  WorkerPool (N workers, round-robin dispatch)              │
│  └─ pdfium.worker.ts (each worker)                         │
│      ├─ PDFiumLibrary.init() → WASM bootstrap              │
│      ├─ loadDocument(Uint8Array) → page geometries         │
│      ├─ computeMaxScale() → canvas & memory limits         │
│      └─ page.render(scale × dpr) → transfer RGBA buffer    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### File structure

| File | Purpose |
|---|---|
| `PdfiumRawViewer.tsx` | Main viewer — composes hooks, renders page grid |
| `pdfium.worker.ts` | Web Worker — WASM init, document load, render |
| `WorkerPool.ts` | Pool lifecycle, round-robin dispatch, dead-worker respawn |
| `useWorker.ts` | React hook wrapping `WorkerPool` |
| `PageCanvas.tsx` | Per-page canvas — viewport clip, cache lookup, double-buffer blit |
| `CanvasCache.ts` | Cache keyed by `(pageIndex, scale, docVersion)` |
| `useZoom.ts` | Zoom state, anchor-point scroll adjustment, Ctrl+wheel |
| `usePan.ts` | Left-button grab-to-pan |
| `useVirtualization.ts` | Visible page range, scroll-version bump, current-page tracker |
| `viewportUtils.ts` | `computeClipRegion`, `shouldSkipRender` |
| `zoomUtils.ts` | `scaleToNormalized` — raw scale → 25–5 000% display percent |
| `MarksOverlay.tsx` | SVG overlay per page |
| `useMarks.ts` | Mark state + localStorage persistence |
| `PdfiumToolbar.tsx` | Toolbar with rendering indicator spinner |

---

## Render Method

PDF rendering runs entirely in Web Workers. The main thread never touches the PDFium WASM module.

### WorkerPool

- Default pool size: `min(4, navigator.hardwareConcurrency)`
- Render requests round-robin across workers — multiple pages render in parallel
- Dead workers (WASM crash, OOM) are automatically respawned up to 3 times
- All workers must acknowledge `loaded` before the document is considered ready, ensuring every worker has the PDF data

### Rendering pipeline (per page)

1. **Visibility check** — virtualisation determines which pages are mounted
2. **CSS stretch** — on zoom, immediately rescale old canvas via CSS (GPU, 0 ms latency)
3. **Debounce** — 150 ms for zoom changes, 0 ms for scroll-only
4. **Clip region** — if full page exceeds 16 384 px, compute visible region + 800 px margin
5. **Skip-render check** — if current viewport is within 200 px of cached region, skip
6. **CanvasCache check** — if same `renderScale` is cached for this page+docVersion, blit from cache (no worker dispatch)
7. **Worker render** — `page.render(scale × dpr)` produces RGBA pixel buffer
8. **Zero-copy transfer** — `ArrayBuffer` transferred via `postMessage`
9. **Atomic swap** — `ImageData` → offscreen canvas → `drawImage` to visible canvas

### Worker message protocol

**Main → Worker:**

| Message | Payload | Purpose |
|---|---|---|
| `init` | — | Bootstrap PDFium WASM |
| `loadUrl` | `url`, `dpr` | Fetch PDF by URL |
| `loadBuffer` | `buffer` (transferred), `dpr` | Load PDF from uploaded file |
| `render` | `id`, `pageIndex`, `scale`, `dpr` | Render a page |

**Worker → Main:**

| Message | Payload | Purpose |
|---|---|---|
| `ready` | — | WASM engine initialised |
| `loaded` | `geometries[]`, `maxScale` | Document parsed |
| `renderDone` | `id`, `data` (transferred), `width`, `height`, `renderScale` | Rendered bitmap |
| `error` | `message` | Any failure |

---

## Key Improvements

### Hook decomposition
Zoom, pan, virtualisation, and worker management are each their own custom hook. `PdfiumRawViewer.tsx` is a thin composition layer (~200 lines) with no rendering logic of its own.

### CanvasCache
Fully-rendered page canvases are cached by `(pageIndex, scale, docVersion)`. Scroll events that re-trigger `PageCanvas`'s effect hit the cache and blit instantly without touching a worker.

### `docVersion` cache invalidation
Incrementing `docVersion` on each new PDF load invalidates all cached canvases without needing to explicitly clear the cache.

### Adaptive `maxScale`
The worker computes the maximum safe render scale for the loaded PDF (limited by `MAX_CANVAS_DIM` 16 384 px and `MAX_BITMAP_PIXELS` 100 M) and reports it with the `loaded` message. Used as the zoom ceiling.

### Dead-worker respawn
If a worker crashes, it is automatically replaced and the document is reloaded into the new worker (up to 3 attempts). The retry button on the error overlay calls `pool.retryAll()` which terminates and recreates all workers.

### Rendering indicator
`PdfiumToolbar` shows a spinner while any render task is in flight (`rendering` state tracked by `useWorker`).

### Coordinate system
Same as Prototype 1.1 — PDF bottom-left origin → SVG top-left:
```
cy = (heightPt - mark.y) * scale
```

---

## Package: `@hyzyla/pdfium`

**Version:** 2.1.12 · **License:** MIT · **Size:** ~10.7 MB WASM (CDN) · **Dependencies:** none

### Strengths

| Aspect | Notes |
|---|---|
| Rendering fidelity | PDFium = Chrome's PDF engine. Chromium-grade accuracy for blueprints and complex PDFs |
| Performance | WASM, fully off-thread. Main thread never blocked |
| Bundle impact | Zero JS dependencies; WASM binary fetched from CDN at startup (not bundled) |
| API simplicity | Minimal surface — `init`, `loadDocument`, `getPage`, `render`, `destroy` |
| Canvas control | Full pixel-level control; no opaque viewer chrome |

### Weaknesses

| Aspect | Notes |
|---|---|
| Single maintainer | No corporate backing; bus factor 1 |
| Cold start | ~10 MB WASM fetch on first load (1–3 s on average network) |
| CDN dependency | Default import uses CDN; can be self-hosted with extra build config |
| No text layer | Bitmap-only. No text selection, search, or accessibility layer |
| No annotations | No built-in PDF annotation support |
| Memory management | Must manually call `doc.destroy()` — no GC for WASM allocations |

### vs. `pdfjs-dist`

| Dimension | `@hyzyla/pdfium` (Proto 5) | `pdfjs-dist` (Proto 1) |
|---|---|---|
| Engine | PDFium (Chrome) | Mozilla PDF.js |
| Rendering | WASM bitmap | Canvas 2D |
| Text selection | No | Built-in |
| Bundle size | ~10.7 MB WASM | ~2.5 MB JS |
| Fidelity | Excellent | Good |
| Off-thread | Fully | Partially |
| Community | Single maintainer | Mozilla-backed |

---

## Key Constants

| Constant | Value | Purpose |
|---|---|---|
| `ZOOM_FACTOR` | 1.25 | 25% per zoom step |
| `MIN_SCALE` | 0.25 | 25% minimum zoom |
| `MAX_CANVAS_DIM` | 16 384 | Browser canvas pixel limit per axis |
| `PAGE_GAP` | 12 px | Gap between pages |
| `MARGIN_FRACTION` | 0.75 | Clip margin fraction of viewport |
| `MARGIN_MIN_PX` | 800 | Minimum clip margin |
| `RERENDER_THRESHOLD_PX` | 200 | Scroll distance before re-render |
| `VIRTUALIZATION_VIEWPORTS` | 2 | Pages mounted beyond visible viewport |
| `ZOOM_RENDER_DEBOUNCE_MS` | 150 | Debounce after zoom before render |
| `MAX_RESPAWN_ATTEMPTS` | 3 | Dead-worker respawn limit |
