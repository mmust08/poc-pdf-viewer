# Prototype 1.2 — PDF.js Canvas Tile Renderer

**Route:** `/prototype/pdfjs-canvas`  
**Source:** `src/components/PdfJsCanvasViewer/`  
**Stack:** `pdfjs-dist` v4 · React 18

---

## Packages

| Package | Version | Role |
|---|---|---|
| `pdfjs-dist` | ^4.10.38 | PDF parsing and per-tile canvas rendering |

Worker loaded via Vite URL import (`pdfjs-dist/build/pdf.worker.mjs?url`).

---

## Architecture

```
PdfJsCanvasViewer
├── Scroll container (overflow: auto, right-click pan)
│   └── .pdfjs-page (sized to scale × native dimensions)
│       ├── pdfjs-stale-wrap (CSS-scaled old tiles, present during zoom transition)
│       ├── .pdfjs-tile-layer (TileRenderer target, CSS-scaled between committed scales)
│       └── <svg> overlay (marks, pointer events for add/drag/select)
└── Header (zoom, upload, mark controls, rendering indicator)
```

### File structure

| File | Purpose |
|---|---|
| `PdfJsCanvasViewer.tsx` | Main viewer — load PDF, two-scale system, stale-wrap lifecycle, SVG marks |
| `tileRenderer.ts` | `TileRenderer` class — tile cache, off-DOM render, `onIdle` callback |
| `PdfJsCanvasViewer.css` | Layout, tile positioning, panning cursor, stale-wrap z-index |

---

## Render Method

Pages are split into **512 × 512 px tiles**. `TileRenderer` manages a per-zoom tile cache (keyed by `zoom-row-col`) and renders only tiles that intersect the visible viewport plus a 1-tile buffer. Each tile renders off-DOM and is only `appendChild`-ed when its bitmap is fully drawn — eliminating the "white tile" flash.

### Two-scale system

| Variable | Role |
|---|---|
| `scale` | Live zoom level — updated on every wheel tick |
| `committedScale` | Lags `scale` by a 120 ms debounce — tiles are always rendered at this scale |

The `tileLayerRef` div is CSS-transformed by `scale / committedScale` between commits, keeping the view visually correct without issuing PDF.js render tasks on every wheel event.

### Stale-wrap anti-flash

When `committedScale` changes:
1. Existing tile canvases are **re-parented** (not copied) into a `pdfjs-stale-wrap` div sitting behind the fresh tile layer.
2. The wrap is CSS-scaled by `scale / oldCommittedScale` so the old tiles visually track the zoom.
3. `TileRenderer.onIdle` fires the moment all new tiles finish rendering — the wrap is removed instantly, no fade.
4. A 4 000 ms safety timer drops the wrap if `onIdle` never fires (e.g., render error).

Re-parenting is O(n tiles) DOM moves, not `drawImage` copies — no additional bitmaps are created.

### Anchor-point zoom

`useLayoutEffect` fires after `scale` updates. It reads `zoomAnchorRef` (set on each wheel event with cursor position and old scroll state) and adjusts `scrollLeft`/`scrollTop` so the PDF point under the cursor stays fixed.

---

## Key Improvements

### Tiled rendering
512 px tiles allow viewport-based caching. Scrolling reuses already-rendered tiles; only newly-exposed tiles are rendered. Tiles outside the viewport + buffer are discarded from cache and removed from the DOM.

### Atomic tile attach
Tiles render off-DOM and are only appended to the container when their bitmap is complete. Prevents any visible blank state per tile.

### Stale-wrap (no white flash on zoom)
Old tiles stay visible, CSS-scaled to approximate the new zoom, while fresh tiles render. Removed the instant new tiles are ready — zero visible gap.

### Right-click pan
Right mouse button drag adjusts the real scroll container, keeping scrollbars in sync. Context menu is suppressed during drag. Left-click is reserved for mark placement.

### Mark dragging
Marks use pointer capture (`setPointerCapture`) for reliable drag tracking across tile boundaries. A 3 px drag threshold distinguishes drag from click. Click on a mark selects it; click on the SVG background deselects or places a new mark.

### `MarkInfoPanel`
Selected marks show a floating panel with coordinates.

---

## TileRenderer API

```ts
class TileRenderer {
  setPage(page: PDFPageProxy): void      // switch document; clears cache
  setZoom(zoom: number): void            // change zoom; clears cache
  setOnIdle(cb: () => void): void        // fires when activeCount drops to 0
  isIdle(): boolean
  detachCurrentTiles(): void             // hand canvases to stale-wrap (no DOM remove)
  update(opts: UpdateOpts): void         // recompute visible range, render missing tiles
  clearAll(): void
  destroy(): void
}
```

---

## Key Constants

| Constant | Value | Purpose |
|---|---|---|
| `MIN_SCALE` | 0.5 | 50% minimum zoom |
| `MAX_SCALE` | 16 | 1 600% maximum zoom |
| `TILE_SIZE` | 512 px | Fixed tile dimensions |
| `BUFFER_TILES` | 1 | Extra tile rows/cols beyond visible edge |
| `DRAG_THRESHOLD` | 3 px | Min drag distance to distinguish from click |
| `PAGE_MARGIN` | 20 px | CSS margin around the page; factored into zoom-anchor math |
| `SNAPSHOT_MAX_LIFETIME_MS` | 4 000 | Safety cutoff for stale-wrap if `onIdle` never fires |
| Zoom debounce | 120 ms | Delay before bumping `committedScale` |
