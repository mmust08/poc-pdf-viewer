# Prototype 5 — PDFium Raw WASM

## Description

Prototype 5 is a custom-built PDF viewer that renders PDFs using the PDFium engine compiled to WebAssembly. Unlike the other prototypes in this POC (PDF.js, EmbedPDF, Leaflet, Fabric.js), this prototype bypasses all high-level viewer libraries and talks directly to the PDFium WASM binary through a thin JavaScript wrapper (`@hyzyla/pdfium`). All rendering runs off the main thread inside a Web Worker, keeping the UI responsive at 60fps even for large-format documents like blueprints.

The viewer supports:
- Continuous vertical scroll with page virtualisation
- Ctrl+wheel and button-based zoom (25% increments, anchor-point aware)
- Grab-to-pan navigation
- Click-to-place marks with PDF coordinate space accuracy
- Hardcoded + user-defined marks persisted to localStorage
- File upload for arbitrary PDFs
- Progress cursor during rendering
- Fit-to-width on document load

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Main Thread (React)                                       │
│                                                            │
│  PdfiumRawViewer                                           │
│  ├─ State: scale, pageGeometries, currentPage, rendering   │
│  ├─ Scroll handler → scrollVersion (RAF-throttled)         │
│  ├─ Wheel/button zoom → pendingZoom → scroll adjustment    │
│  ├─ Pan handler (mousedown/move/up)                        │
│  ├─ Virtualisation: only mount visible pages ± 2 viewports │
│  │                                                         │
│  ├─ PageCanvas (per visible page)                          │
│  │   ├─ On zoom: CSS-stretch old canvas (instant, GPU)     │
│  │   ├─ After 150ms debounce: post render to worker        │
│  │   ├─ On renderDone: ImageData → offscreen → atomic swap │
│  │   ├─ Skip-render check (200px threshold)                │
│  │   ├─ Offscreen cache (reuse if same renderScale)        │
│  │   └─ Adaptive clip region for oversized pages           │
│  │                                                         │
│  └─ MarksOverlay (SVG circles + labels)                    │
│      └─ useMarks (localStorage persistence per filename)   │
│                                                            │
├─────────── postMessage (structured, zero-copy) ────────────┤
│                                                            │
│  Web Worker (pdfium.worker.ts)                             │
│  ├─ PDFiumLibrary.init() → WASM bootstrap (CDN fetch)      │
│  ├─ loadDocument(Uint8Array) → extract page geometries     │
│  ├─ computeMaxScale() → enforce canvas & memory limits     │
│  └─ page.render(scale × dpr, 'bitmap') → transfer buffer  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### File structure

| File | Lines | Purpose |
|------|------:|---------|
| `src/components/pdfium-raw/PdfiumRawViewer.tsx` | 778 | Main viewer, toolbar, PageCanvas, blitToCanvas |
| `src/components/pdfium-raw/pdfium.worker.ts` | 138 | Web Worker — WASM init, document load, render |
| `src/components/pdfium-raw/MarksOverlay.tsx` | 87 | SVG overlay for mark circles and labels |
| `src/components/pdfium-raw/useMarks.ts` | 69 | Hook for mark state + localStorage persistence |
| `src/types/marks.ts` | 24 | PdfMark interface + hardcoded sample marks |
| `src/pages/PdfiumRawPrototype.tsx` | 5 | Route page wrapper |

### Worker message protocol

**Main → Worker:**
| Message | Payload | Purpose |
|---------|---------|---------|
| `init` | — | Bootstrap PDFium WASM |
| `loadUrl` | `url`, `dpr` | Worker fetches PDF from URL |
| `loadBuffer` | `buffer` (transferred), `dpr` | Load PDF from uploaded file |
| `render` | `id`, `pageIndex`, `scale`, `dpr` | Render a page at given scale |

**Worker → Main:**
| Message | Payload | Purpose |
|---------|---------|---------|
| `ready` | — | WASM engine initialised |
| `loaded` | `geometries[]`, `maxScale` | Document parsed, page sizes extracted |
| `renderDone` | `id`, `data` (transferred), `width`, `height`, `renderScale` | Rendered bitmap pixels |
| `error` | `message` | Any failure |

### Rendering pipeline (per page)

1. **Visibility check** — virtualisation determines which pages are mounted
2. **CSS stretch** — on zoom, immediately scale the old canvas via CSS (GPU, 0ms latency)
3. **Debounce** — 150ms for zoom changes, 0ms for scroll-only
4. **Clip region** — if full page exceeds 16384px, compute visible region + 800px margin
5. **Skip-render check** — if current viewport is within 200px of cached region, skip
6. **Offscreen cache check** — if same renderScale is cached, blit from cache (skip worker)
7. **Worker render** — `page.render(scale × dpr, 'bitmap')` produces RGBA pixel buffer
8. **Zero-copy transfer** — `ArrayBuffer` transferred via `postMessage` (no serialisation)
9. **Atomic swap** — build `ImageData` → offscreen canvas → copy to visible canvas

### Key constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `ZOOM_FACTOR` | 1.25 | 25% per zoom step |
| `MIN_SCALE` | 0.25 | Minimum zoom (25%) |
| `MAX_CANVAS_DIM` | 16384 | Chromium canvas pixel limit |
| `MAX_BITMAP_PIXELS` | 100,000,000 | Memory budget per render |
| `PAGE_GAP` | 12px | Spacing between pages |
| `MARGIN_FRACTION` | 0.75 | Clip margin as fraction of viewport |
| `MARGIN_MIN_PX` | 800 | Minimum clip margin |
| `RERENDER_THRESHOLD_PX` | 200 | Scroll distance before re-render |
| `VIRTUALIZATION_VIEWPORTS` | 2 | Pages mounted beyond visible viewport |
| `ZOOM_RENDER_DEBOUNCE_MS` | 150 | Debounce after zoom before re-render |

---

## Package Evaluation: `@hyzyla/pdfium`

**Package:** [@hyzyla/pdfium](https://github.com/hyzyla/pdfium) v2.1.12
**License:** MIT
**Size:** 10.7 MB (unpacked, includes WASM binary)
**Dependencies:** None
**Maintainer:** hyzyla (single maintainer, published via GitHub Actions)

### What it provides

A thin JavaScript wrapper around Google's PDFium C++ library compiled to WebAssembly. The API surface is minimal:

```typescript
PDFiumLibrary.init()           // Bootstrap WASM engine
library.loadDocument(bytes)    // Parse a PDF from Uint8Array
doc.getPageCount()             // Number of pages
doc.getPage(index)             // Access a specific page (0-indexed)
page.getOriginalSize()         // { originalWidth, originalHeight } in PDF points
page.render({ scale, render }) // Render to bitmap (RGBA pixel array)
doc.destroy()                  // Free memory
```

### Strengths

| Aspect | Assessment |
|--------|------------|
| **Rendering fidelity** | PDFium is the same engine as Chrome's built-in PDF viewer. Excellent accuracy for complex documents, blueprints, and edge-case PDFs. |
| **Performance** | Native WASM execution. Rendering is CPU-bound but runs entirely in a Web Worker, so the main thread is never blocked. |
| **Bundle impact** | Zero runtime dependencies. The 10.7 MB WASM binary is fetched from CDN at startup (not bundled into the app JS). |
| **API simplicity** | Very small API surface — easy to understand, easy to wrap with custom logic. No framework opinions. |
| **Canvas control** | Full pixel-level control over the output. No opaque viewer chrome or DOM manipulation. The app owns the canvas entirely. |
| **Browser support** | Works in any browser with WebAssembly support (all modern browsers). |

### Weaknesses

| Aspect | Assessment |
|--------|------------|
| **Single maintainer** | One individual maintainer (hyzyla). Bus factor of 1. No corporate backing. |
| **WASM load time** | ~10 MB fetched from CDN on first load. Cold start adds 1-3 seconds depending on network. Subsequent loads are cached by the browser. |
| **CDN dependency** | By default, the WASM binary is loaded from a CDN (`/browser/cdn` import). If the CDN is down, the viewer fails. Can be self-hosted but requires extra build configuration. |
| **No text layer** | PDFium renders to bitmap only. There is no text selection, no searchable text, no accessibility layer. Building these would require additional PDFium APIs (text extraction) and significant custom work. |
| **No annotation support** | No built-in support for PDF annotations, form fields, or interactive elements. These would need to be implemented from scratch. |
| **Limited documentation** | The npm package has minimal docs. You need to read the source code and PDFium C++ docs to understand advanced features. |
| **Memory management** | The app must manually call `doc.destroy()` to free WASM memory. Leaks are silent — no garbage collection for WASM allocations. |
| **No incremental rendering** | The entire page is rendered at once. For very large pages at high zoom, this means rendering a massive bitmap even if only a small region is visible. (The prototype works around this with adaptive clipping, but that's custom logic.) |

### Comparison with PDF.js (Prototype 1)

| Dimension | `@hyzyla/pdfium` (Proto 5) | `pdfjs-dist` (Proto 1) |
|-----------|---------------------------|------------------------|
| Engine | PDFium (Chrome's engine) | Mozilla's PDF.js |
| Rendering | WASM bitmap (pixel array) | Canvas 2D + SVG text layer |
| Text selection | Not available | Built-in |
| Search | Not available | Built-in |
| Accessibility | Not available | Built-in text layer |
| Bundle size | 10.7 MB WASM (CDN) | ~2.5 MB (JS + worker) |
| Fidelity | Excellent (Chrome-grade) | Good (occasional edge-case differences) |
| Main thread | Fully off-thread | Partially off-thread |
| API control | Full pixel control | Higher-level abstractions |
| Community | Single maintainer | Mozilla-backed, large community |
| Maturity | 23 versions, ~1 year | 10+ years, industry standard |

### Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Maintainer abandonment | Medium | The WASM binary is a build of Google's PDFium — the wrapper is thin enough to fork/maintain internally if needed. |
| CDN outage | Medium | Self-host the WASM binary. Change import from `/browser/cdn` to `/browser` and serve the `.wasm` file from the app's own static assets. |
| No text layer | High (if needed) | Would require significant engineering. Consider PDF.js if text selection/search is a hard requirement. |
| Memory leaks | Low | Straightforward to manage with careful `destroy()` calls. The prototype already handles this correctly. |

### Verdict

`@hyzyla/pdfium` is a strong choice for **rendering-focused** PDF viewing where the priority is visual fidelity, performance, and full canvas control — exactly the use case of viewing large-format blueprints/drawings where users need to zoom, pan, and place coordinate marks.

It is **not suitable** if the product requires text selection, in-document search, form filling, or accessibility compliance — those features would need to be built from scratch or the project should fall back to PDF.js.

For this POC's specific requirement (blueprint viewing with mark placement), the package delivers excellent results with minimal overhead. The single-maintainer risk is real but mitigable given the thin wrapper over a Google-maintained engine.
