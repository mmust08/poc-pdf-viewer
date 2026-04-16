# Prototype 3 — Leaflet.js (CRS.Simple)

**Route:** `/prototype/leaflet`  
**Stack:** `leaflet` v1.9 · `react-leaflet` v4 · `pdfjs-dist` v4 · React 18

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

PDF.js renders the page to a `dataUrl` via `usePdfPageDataUrl()`. Leaflet's `CRS.Simple` treats the map as a flat plane where layer coordinates equal pixel coordinates. The image is placed as an `ImageOverlay` with bounds `[[0, 0], [canvasHeightPx, canvasWidthPx]]`.

In `CRS.Simple`, latitude corresponds to Y and increases upward (origin at south = bottom of image). PDF coordinates also have Y increasing upward from the bottom. So the conversion is direct:

```
lat = mark.y * (canvasHeightPx / pageHeightPt)   // no inversion needed!
lng = mark.x * (canvasWidthPx / pageWidthPt)
```

Marks are `L.marker` with `L.divIcon` (HTML-only, no image assets). Leaflet recomputes all marker screen positions on every pan/zoom update — anchoring is Leaflet's core feature.

## Performance

- Initial render time: _TODO_ (includes PDF.js render + Leaflet init)
- Zoom frame rate: _TODO_  
- At 200+ marks: Leaflet handles thousands of markers efficiently; designed for this use case.

## Developer experience

- Setup gotchas: `leaflet/dist/leaflet.css` must be imported as a bare global (not CSS Module) — otherwise map tiles and controls are invisible. Default marker images 404 in Vite builds — `L.divIcon` is the workaround. `L.map()` must not be called twice on the same element (managed via `mapRef`).
- Lines of code (viewer component): ~100
- TypeScript: Clean — `@types/leaflet` is comprehensive.

## CRS.Simple Y-axis note

`CRS.Simple` lat increases upward (south = 0). PDF Y also increases upward (bottom = 0). This means **no Y inversion is needed** for Leaflet, unlike the SVG/canvas approaches (Prototypes 1 & 2). Verify by checking that M1 (highest PDF Y = 2100) appears near the top of the image.

## Suitability scores (1–5)

| Criterion | Score | Notes |
|---|---|---|
| Rendering quality | _/5 | |
| Mark anchoring reliability | _/5 | |
| Developer experience | _/5 | |
| Performance potential | _/5 | |

## Recommendation

_TODO: One-paragraph verdict after testing_
