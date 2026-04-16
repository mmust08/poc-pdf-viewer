# Implementation Plan: AJB-14023 — PDF Viewer Prototypes

## Tech Stack

Single **Vite + React + TypeScript** app, React Router, three prototype routes.

### NPM Packages

**Shared (all prototypes):**
```
pdfjs-dist   react   react-dom   react-router-dom
vite   @vitejs/plugin-react   typescript   @types/react   @types/react-dom
```

**Prototype 1 only:** `react-zoom-pan-pinch`  
**Prototype 2 only:** `fabric` ^7  
**Prototype 3 only:** `leaflet   react-leaflet   @types/leaflet`

---

## File Structure

```
ajoursystem-pdf-viewer/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                     ← CRITICAL config (see below)
├── public/
│   └── sample-blueprint.pdf
└── src/
    ├── main.tsx
    ├── App.tsx                        ← routes: / | /prototype/pdfjs | /fabric | /leaflet
    ├── types/
    │   └── marks.ts                   ← PdfMark + HARDCODED_MARKS (source of truth)
    ├── hooks/
    │   └── usePdfPage.ts              ← usePdfPage() + usePdfPageDataUrl()
    ├── pages/
    │   ├── LandingPage.tsx
    │   ├── PdfJsPrototype.tsx
    │   ├── FabricPrototype.tsx
    │   └── LeafletPrototype.tsx
    ├── components/
    │   ├── pdfjs/
    │   │   ├── PdfJsViewer.tsx        ← canvas + SVG overlay in TransformComponent
    │   │   └── MarksOverlay.tsx       ← SVG <circle> marks, pointer-events: none
    │   ├── fabric/
    │   │   └── FabricViewer.tsx       ← fabric.Canvas + zoom/pan event handlers
    │   └── leaflet/
    │       └── LeafletViewer.tsx      ← MapContainer + ImageOverlay + L.marker divIcons
    └── styles/
        └── *.css
```

---

## Critical vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],  // pdfjs uses top-level await — cannot be pre-bundled
  },
  worker: { format: 'es' },
})
```

In `usePdfPage.ts`:
```typescript
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
GlobalWorkerOptions.workerSrc = pdfjsWorker
```

---

## Mark Coordinate System

PDF origin = bottom-left. Screen origin = top-left. Conversion:
```
screenX = mark.x * (canvasWidthPx / pageWidthPt)
screenY = (pageHeightPt - mark.y) * (canvasHeightPx / pageHeightPt)
```
Apply `Math.round()` to avoid sub-pixel drift at high zoom.

---

## Anchoring Mechanism Per Prototype

**Prototype 1 (PDF.js + react-zoom-pan-pinch)**  
`<canvas>` and `<svg>` overlay are siblings inside `TransformComponent`. One CSS `matrix()` transform is applied to the container — both layers move together. Mark SVG coordinates are static; the parent transform handles all zoom/pan. Zero anchoring code.

**Prototype 2 (Fabric.js)**  
Marks are `fabric.Circle` + `fabric.Text` objects in Fabric's scene graph. `canvas.zoomToPoint()` and `canvas.relativePan()` apply a viewport transform matrix to all objects. Use `useEffect` with `canvas.dispose()` cleanup (required for React 19 Strict Mode).

**Prototype 3 (Leaflet CRS.Simple)**  
PDF rendered to `dataUrl` → `ImageOverlay` with bounds `[[0,0],[pageHeightPx, pageWidthPx]]`. Marks as `L.marker` with `L.divIcon` (no image assets — avoids Vite 404). Leaflet recalculates all marker positions on each view change. Import `leaflet/dist/leaflet.css` as bare global (not CSS Module).

---

## Implementation Phases

### Phase 0 — Scaffold
1. `npm create vite@latest . -- --template react-ts`
2. Install all packages
3. Add `public/sample-blueprint.pdf` (any freely licensed PDF)
4. Write `vite.config.ts` with critical config
5. Write `src/types/marks.ts`
6. Write `src/hooks/usePdfPage.ts` (both exports)
7. Write routing skeleton in `App.tsx`

### Phase 1 — Prototype 1 (PDF.js + react-zoom-pan-pinch)
8. `PdfJsViewer.tsx` + `MarksOverlay.tsx`
9. `PdfJsPrototype.tsx` page
10. Test: marks anchored at 2x and 8x zoom

### Phase 2 — Prototype 2 (Fabric.js)
11. `FabricViewer.tsx`
12. `FabricPrototype.tsx` page
13. Test: marks anchored at 2x and 8x zoom

### Phase 3 — Prototype 3 (Leaflet)
14. `LeafletViewer.tsx`
15. `LeafletPrototype.tsx` page
16. Test: marks anchored at 2x and 8x zoom

### Phase 4 — Polish & Notes
17. `LandingPage.tsx` with comparison table
18. Cross-browser test: Chrome, Firefox, Edge
19. Write `NOTES_PROTO1.md`, `NOTES_PROTO2.md`, `NOTES_PROTO3.md`

---

## Known Risks & Mitigations

| Risk | Prototype | Mitigation |
|---|---|---|
| pdfjs worker silently fails in Vite | All | `optimizeDeps.exclude` + `?url` worker import |
| React 19 Strict Mode double-mount | Fabric | Bulletproof `canvas.dispose()` in useEffect cleanup |
| CRS.Simple Y-axis confusion | Leaflet | `map.fitBounds(imageBounds)` first, verify corner marks |
| Default marker PNG 404 | Leaflet | Use `L.divIcon` only |
| Leaflet CSS scoping breaks map | Leaflet | Bare global CSS import, not CSS Module |
| SVG coordinate drift at 8x zoom | PDF.js | `Math.round()` on initial coordinate calculation |

---

## Evaluation Notes Template (per prototype)

```markdown
## Prototype N — [Technology]

### What works well
### Coordinate anchoring approach  
### Performance (initial render, zoom frame rate)
### Developer experience (LoC, TypeScript, setup gotchas)
### Suitability score (1–5): rendering quality / anchoring / DX / perf potential
### Recommendation
```

---

## Verification Checklist

- [ ] All three prototype routes load without console errors
- [ ] PDF renders visibly in each prototype
- [ ] 5 marks visible at correct positions in each prototype
- [ ] Zoom (mouse wheel) works in each prototype
- [ ] Pan (drag) works in each prototype
- [ ] Marks stay anchored at 2x zoom
- [ ] Marks stay anchored at 8x zoom
- [ ] Works in Chrome, Firefox, Edge
- [ ] Evaluation notes written for all three
