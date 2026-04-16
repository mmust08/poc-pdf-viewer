# Prototype 1 — PDF.js + react-zoom-pan-pinch

**Route:** `/prototype/pdfjs`  
**Stack:** `pdfjs-dist` v4 · `react-zoom-pan-pinch` v3 · React 18

---

## What works well

_TODO: Fill in after manual testing_

- 
- 

## What was painful

_TODO: Fill in after manual testing_

- 
- 

## Coordinate anchoring approach

Both the `<canvas>` (PDF.js render target) and the `<svg>` marks overlay live inside the same `TransformComponent` div. `react-zoom-pan-pinch` applies a single CSS `matrix(scale, 0, 0, scale, tx, ty)` transform to this container. Since both layers share the same parent transform, the browser moves them together — marks never drift. The SVG mark coordinates (`cx`, `cy`) are computed once at render time using:

```
cx = mark.x * (canvasWidthPx / pageWidthPt)
cy = (pageHeightPt - mark.y) * (canvasHeightPx / pageHeightPt)
```

These values never change after initial render. No re-anchoring code is needed.

## Performance

- Initial render time: _TODO_
- Zoom frame rate: _TODO_  
- At 200+ marks: CSS transform approach scales well — no canvas re-render on zoom, just GPU compositing.

## Developer experience

- Setup gotchas: `optimizeDeps.exclude: ['pdfjs-dist']` required in vite.config.ts; without it, PDF loading silently fails.
- Lines of code (viewer component): ~50
- TypeScript: Clean — no type friction.

## Suitability scores (1–5)

| Criterion | Score | Notes |
|---|---|---|
| Rendering quality | _/5 | |
| Mark anchoring reliability | _/5 | |
| Developer experience | _/5 | |
| Performance potential | _/5 | |

## Recommendation

_TODO: One-paragraph verdict after testing_
