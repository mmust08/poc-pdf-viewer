# Production Readiness Review: PDFium Raw WASM Viewer

## Context

The `src/components/pdfium-raw/` directory contains a PDF viewer built on Google's PDFium engine via `@hyzyla/pdfium` WASM wrapper. It's currently a well-crafted prototype (PoC) with off-thread rendering, page virtualization, and smart caching — but several gaps block production use, especially for high-res architectural/scanned PDFs where image clarity and scale are critical.

---

## Tier 1 — Blocking Production Use

### 1. Single Web Worker serializes all renders
- **File:** `pdfium.worker.ts` — one worker processes render requests sequentially via `self.onmessage`
- **Impact:** Scrolling a 100+ page document queues renders FIFO; the user sees blank pages because the worker can't keep up
- **Fix:** Worker pool (2–4 workers matching `navigator.hardwareConcurrency`), each with its own PDFium instance + document copy. Main-thread coordinator dispatches round-robin or to least-busy worker

### 2. No render cancellation or priority queue
- **File:** `PdfiumRawViewer.tsx:666-667` — stale responses discarded *after* the worker already rendered them
- **Impact:** Worker wastes time on pages the user scrolled past, delaying visible-page renders
- **Fix:** Priority queue on main thread ordered by distance from viewport center. Cancellation channel (`SharedArrayBuffer` abort flag or `cancel` message) so the worker skips work before the expensive `page.render()` call

### 3. No worker crash recovery
- **File:** `PdfiumRawViewer.tsx:150-152` — worker terminated on unmount, but no `onerror` handler for mid-session crashes
- **Impact:** WASM OOM (realistic with large PDFs at high zoom) leaves the viewer permanently blank with no recovery path
- **Fix:** `worker.onerror` handler that: clears pending callbacks with error, sets error state in UI, spawns new worker, re-initializes PDFium + reloads current document. Expose a "Retry" button

### 4. Unbounded offscreen canvas cache
- **File:** `PdfiumRawViewer.tsx:540-543` — each PageCanvas holds `offscreenCacheRef` with no global memory budget
- **Impact:** With `VIRTUALIZATION_VIEWPORTS=2`, ~5-10 pages mounted. Each cache can be 50-100MB (A0 at 2x DPR) = 500MB–1GB. Chrome tabs cap at 2-4GB
- **Fix:** Global LRU cache with configurable pixel budget (e.g., 512MB). Track total cached pixels across all pages; evict least-recently-used entries when budget exceeded

### 5. Monolithic 778-line component
- **File:** `PdfiumRawViewer.tsx` — toolbar, scroll, zoom, pan, file upload, worker lifecycle, virtualization, and `PageCanvas` all in one file
- **Impact:** High cognitive load, difficult to test individual concerns, changes to zoom risk breaking scroll
- **Fix:** Extract into focused modules:
  - `useWorker.ts` — worker lifecycle, message dispatch, callback registry
  - `useZoom.ts` — zoom state, wheel handler, debounce, pendingZoom
  - `usePan.ts` — pan state and mouse handlers
  - `useVirtualization.ts` — visible page range calculation
  - `PageCanvas.tsx` — own file
  - `Toolbar.tsx` — extract toolbar UI

### 6. Zero test coverage
- **Impact:** Every change is a regression risk; rendering pipeline, coordinate transforms, zoom math all have complex edge cases
- **Fix (priority order):**
  1. Unit tests for pure functions: `zoomUtils.ts`, `computeMaxScale`, coordinate transforms
  2. Integration tests for worker message protocol (mock worker)
  3. Visual regression tests via Playwright screenshot comparison with known PDF fixtures
  4. E2E tests for zoom, scroll, mark placement

---

## Tier 2 — Critical Quality & Rendering

### 7. Sub-pixel rounding mismatch causes blurriness
- **File:** `PdfiumRawViewer.tsx:545-546` uses `Math.round(widthPt * scale)` but `@hyzyla/pdfium` internally uses `Math.floor` for bitmap dimensions
- **Impact:** 1px discrepancy between canvas CSS size and backing bitmap → browser upscales → subtle softening of fine lines on high-DPI displays
- **Fix:** Use `msg.width / dpr` and `msg.height / dpr` from the worker response as CSS size source-of-truth, or align to `Math.floor`

### 8. No tile-based rendering for large pages
- **File:** `pdfium.worker.ts:80-81` — renders entire page as single bitmap; `MAX_BITMAP_PIXELS=100M` caps zoom on large pages
- **Impact:** A0 blueprints (841×1189pt) at scale 10 with 2x DPR = 1.6B pixels, far exceeding the cap. Users can't zoom in to see small annotations
- **Fix:** Divide pages into 512×512 or 1024×1024 tiles. Use PDFium's `_FPDF_RenderPageBitmap` with offset parameters to render only viewport-overlapping tiles. Removes zoom ceiling entirely

### 9. WASM binary from third-party CDN — supply chain risk
- **File:** `pdfium.worker.ts:5` — `import { PDFiumLibrary } from '@hyzyla/pdfium/browser/cdn'` fetches 3.9MB WASM from `cdn.jsdelivr.net`
- **Impact:** Compromised CDN or package takeover → malicious code with access to all document data
- **Fix:** Self-host WASM binary. Import from `@hyzyla/pdfium` (non-CDN) with Vite asset handling. Verify WASM hash at build time

### 10. No text layer — no selection, search, or copy
- **Impact:** Table-stakes features for document review; `@hyzyla/pdfium` does expose `getText()` per page
- **Fix:** Extract text + character positions via PDFium text API. Render transparent `<span>` elements positioned over canvas (PDF.js approach). Add Ctrl+F search with cross-page highlighting

### 11. Network failure handling is fragile
- **File:** `pdfium.worker.ts:50-51` — `fetch(msg.url)` with no timeout, no retry, no abort controller
- **Impact:** CDN or PDF host down → worker blocks indefinitely, no recovery
- **Fix:** `AbortController` with timeout. Exponential backoff retry. Distinguish "engine failed to load" vs "PDF failed to load" in UI

### 12. No keyboard navigation
- **Impact:** WCAG 2.1 AA requirement; power users expect PageUp/Down, +/- zoom, Ctrl+0 fit-to-width
- **Fix:** `keydown` handler on container with standard shortcuts

---

## Tier 3 — Important Polish

### 13. WASM cold start blocks first render
- **File:** `pdfium.worker.ts:36-41` — WASM fetch + PDF fetch are sequential, 2-10s before first paint
- **Fix:** Parallel: fetch PDF on main thread while worker initializes WASM. Cache compiled WASM module in IndexedDB via `WebAssembly.compileStreaming`

### 14. `blitToCanvas` creates throwaway canvas on every call
- **File:** `PdfiumRawViewer.tsx:733` — `document.createElement('canvas')` on every blit, triple-copy pipeline
- **Impact:** Unnecessary GPU memory churn; potential quality loss from interpolation
- **Fix:** Reuse a single pre-allocated temp canvas per PageCanvas. For full-page case, draw directly from cache canvas to visible canvas

### 15. `imageSmoothingEnabled` not controlled
- **File:** `PdfiumRawViewer.tsx:762-764` — canvas 2D context uses browser default bilinear interpolation
- **Impact:** Poor middle ground for blueprints: blurs fine lines at high zoom, artifacts at low zoom
- **Fix:** Set `imageSmoothingQuality = 'high'` for scale-down, `imageSmoothingEnabled = false` for scale-up above 100%

### 16. Worker WASM heap never shrinks
- **Impact:** After rendering large page at high zoom, memory footprint stays elevated for entire session
- **Fix:** Monitor `WebAssembly.Memory.buffer.byteLength`. Terminate and respawn worker when switching documents to reclaim WASM heap

### 17. Transferred ArrayBuffers create double-copy peak memory
- **File:** `PdfiumRawViewer.tsx:671-678` — ArrayBuffer → ImageData → canvas = two full copies simultaneously
- **Fix:** Use `createImageBitmap()` from raw buffer, then `drawImage(imageBitmap)` to skip ImageData allocation. Or use `OffscreenCanvas` in worker to transfer `ImageBitmap` directly

### 18. Promise-based worker RPC instead of callback map
- **File:** `PdfiumRawViewer.tsx:49` — `renderCallbacksRef` manual ID→callback map is fragile with stale closures
- **Fix:** Proper `Promise<RenderResult>` RPC layer over `postMessage` with `AbortController` cancellation

### 19. Performance metrics and observability
- **Fix:** `performance.mark`/`measure` around WASM init, doc load, per-page render. Debug overlay for render time, cache hit rate, memory

### 20. Error reporting / telemetry
- **Fix:** Integrate Sentry or equivalent. Capture error type, PDF metadata (page count, file size), browser/OS, memory state

### 21. Touch/mobile support
- **Fix:** `PointerEvent` API for unified mouse/touch/pen. Pinch-to-zoom via two-finger gesture

### 22. Corrupted/password-protected PDF handling
- **File:** `pdfium.worker.ts:114-115` — generic error on bad PDFs
- **Fix:** Check `_FPDF_GetLastError()`, map to user-friendly messages. Add password prompt flow

---

## Tier 4 — Nice to Have

| # | Issue | Fix |
|---|-------|-----|
| 23 | PDFium `PRINTING` flag not set — LCD_TEXT can cause color fringing on non-LCD displays | Fork wrapper or call WASM directly with custom flags |
| 24 | `getVisiblePageRange` does O(n) scan per scroll | Precompute cumulative height array + binary search |
| 25 | File upload: no size/magic-byte validation | Validate file size cap + `%PDF-` header check |
| 26 | Screen reader: no ARIA attributes on canvases | `role="img"` + `aria-label` from extracted text |
| 27 | Mark labels: no schema validation on localStorage restore | Validate against `PdfMark` interface, sanitize labels |
| 28 | localStorage key collision with user-controlled filenames | Hash filename for storage key, budget check |
| 29 | Loading progress: static text during 2-10s initial load | Multi-step progress indicator with byte progress |
| 30 | Inline styles throughout (15+ in toolbar alone) | Extract to CSS modules for hover states, theming, responsive |

---

## Verification Plan

After implementing improvements:
1. **Rendering quality:** Open A0 blueprint at 400% zoom on 2x DPR display — verify sharp lines, no blurriness at canvas edges
2. **Scalability:** Load 500+ page PDF, scroll rapidly — verify no blank pages, render times under 200ms
3. **Memory:** Monitor DevTools Memory tab during zoom in/out cycle — verify cache eviction keeps usage under 1GB
4. **Worker recovery:** Force worker crash (e.g., via DevTools) — verify UI shows error + recovery works
5. **Network resilience:** Throttle network to 3G, load viewer — verify progress feedback and retry works
6. **Accessibility:** Tab through controls, use screen reader — verify all actions reachable
7. **Tests:** `npm test` passes all new unit/integration tests
