# Decision Matrix — PDF.js Prototype Variants

**Prototype 1.1** — `PdfJsViewer` (full-page canvas, `src/components/pdfjs/PdfJsViewer.tsx`)  
**Prototype 1.2** — `PdfJsCanvasViewer` (tile-based canvas, `src/components/PdfJsCanvasViewer/PdfJsCanvasViewer.tsx`)

Scores are 1–10 (higher = better). Equal weight on all criteria.

---

## Scores

| Criterion | Weight | Proto 1.1 | Proto 1.2 |
|---|---|---|---|
| Multi-page support | 1× | **10** | 2 |
| Performance at high zoom | 1× | 6 | **9** |
| Mark interaction UX | 1× | 5 | **9** |
| Zoom range | 1× | **10** | 7 |
| Zoom mode presets | 1× | **10** | 3 |
| Pan gesture ergonomics | 1× | 7 | **8** |
| Maintainability / modularity | 1× | 6 | **8** |
| Canvas-limit resilience | 1× | 7 | **10** |
| Stale-content handling | 1× | 8 | **9** |
| Rendering smoothness | 1× | 8 | 8 |
| **Total (max 100)** | | **77** | **73** |

---

## Criteria Detail

### 1. Multi-page Support
- **1.1 — 10/10:** Virtualized multi-page rendering. Only pages within 2 viewport-heights of the visible area are mounted. Accurate current-page detection via cumulative height geometry.
- **1.2 — 2/10:** Hardcoded to page 1 only. No architecture for multi-page layout exists in the current implementation.

### 2. Performance at High Zoom
- **1.1 — 6/10:** Renders full-page canvas. At extreme zoom levels (>500%), falls back to a clip-region render. Can stutter on large A1/A0 format blueprints.
- **1.2 — 9/10:** 512×512 tile grid means only visible tiles (+ 1 buffer) are ever rendered. Scales to 16× without browser canvas-size limits. Tiles render independently, keeping the main thread free.

### 3. Mark Interaction UX
- **1.1 — 5/10:** Click anywhere on the SVG overlay to add a mark. No drag-to-move, no selection, no info panel, no visual differentiation between marks.
- **1.2 — 9/10:** Click to add → drag to reposition → click to select → info panel shows coordinates. Color assignment by label hash. Non-selected marks dim to 35% opacity. Pointer events with capture for precise drag.

### 4. Zoom Range
- **1.1 — 10/10:** 0.1×–50× (10%–5000%). Discrete step array with 10% increments up to 100%, then Firefox-style jumps above.
- **1.2 — 7/10:** 0.5×–16× (50%–1600%). Continuous 1.1× factor per wheel tick. Adequate for most use cases but won't reach sub-50% or above 1600%.

### 5. Zoom Mode Presets
- **1.1 — 10/10:** Named modes: `page-width`, `page-fit`, `auto`, `actual-size`, `custom`. ResizeObserver re-applies named modes on container resize.
- **1.2 — 3/10:** Custom numeric scale only. No fit-to-width, fit-to-page, or auto modes.

### 6. Pan Gesture Ergonomics
- **1.1 — 7/10:** Left-click drag to pan. Intuitive for general users, but conflicts with left-click mark placement — requires overlay element to intercept.
- **1.2 — 8/10:** Right-click drag to pan. Deliberately frees left-click for mark interactions. Less discoverable but architecturally cleaner separation of concerns.

### 7. Maintainability / Modularity
- **1.1 — 6/10:** ~970 LOC in a single file. `PageCanvas` is an embedded sub-component. Logic and rendering are tightly coupled. Harder to unit-test in isolation.
- **1.2 — 8/10:** ~660 LOC (main) + 200 LOC (`TileRenderer` class, separate file). `TileRenderer` is independently instantiable, testable. `useCanvasMarks` hook is also extracted. Better separation of concerns.

### 8. Canvas-Limit Resilience
- **1.1 — 7/10:** Uses a margin-based clip fallback when a full-page canvas would exceed the browser 16384px limit. Works, but clip boundaries can cause subtle visual seams.
- **1.2 — 10/10:** The 512×512 tile architecture means no single canvas ever approaches the size limit, regardless of zoom level or page dimensions.

### 9. Stale-Content Handling (during zoom)
- **1.1 — 8/10:** CSS rescales the old full-page canvas bitmap while the new render runs off-screen. Smooth, but the stretched bitmap looks blurry during the transition gap (~150ms debounce).
- **1.2 — 9/10:** Re-parents already-rendered tile canvases into a scaled container behind the active tile layer. No bitmap copy. Tiles appear in-place scaled until replaced by fresh renders. 4 s safety timer prevents zombie stale-wraps.

### 10. Rendering Smoothness
- **1.1 — 8/10:** RAF-debounced scroll listener, 150ms zoom debounce, 200px hysteresis skip-render threshold, double-buffering (offscreen canvas → atomic swap). Solid overall.
- **1.2 — 8/10:** 120ms committed-scale debounce, 1-tile buffer, direction-reversal accumulator clear. Comparable smoothness via different mechanisms.

---

## Summary

| | Proto 1.1 | Proto 1.2 |
|---|---|---|
| **Best for** | Multi-page documents, fit-to-width workflow, simpler mark use | High-zoom detail work, rich mark interactions, tile-scale performance |
| **Weakest area** | Mark UX, high-zoom scalability | Multi-page (absent), zoom presets (absent) |
| **Lines of code** | ~970 (monolithic) | ~860 (split across 3 files) |
| **Zoom range** | 10%–5000% | 50%–1600% |
| **Pan button** | Left-click drag | Right-click drag |
| **Overall score** | 77 / 100 | 73 / 100 |

### Recommendation

**Prototype 1.1 scores higher overall** primarily due to multi-page support and zoom mode presets — both are table-stakes requirements for a production blueprint viewer. However, **Prototype 1.2's mark interaction model and tile architecture are superior** and should be carried forward.

The ideal production implementation merges both: multi-page virtualization and zoom presets from 1.1, tile-based rendering and mark selection/drag UX from 1.2.
