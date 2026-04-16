# Prototype 2 — Fabric.js

**Route:** `/prototype/fabric`  
**Stack:** `fabric` v6 · `pdfjs-dist` v4 · React 18

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

PDF.js renders the page to an offscreen canvas via `usePdfPageDataUrl()` which returns a `dataUrl`. `FabricImage.fromURL(dataUrl)` adds it as a background image. Marks are `Circle` + `FabricText` objects positioned using:

```
left = mark.x * (canvasWidthPx / pageWidthPt)
top  = (pageHeightPt - mark.y) * (canvasHeightPx / pageHeightPt)
```

All objects (image + marks) live in Fabric's scene graph. When `fc.zoomToPoint()` or `fc.viewportTransform` is modified, Fabric applies the viewport matrix to the whole scene on every `requestRenderAll()` call. Marks stay anchored because they are scene objects, not screen-space overlays.

## Performance

- Initial render time: _TODO_
- Zoom frame rate: _TODO_  
- At 200+ marks: Each zoom triggers a full canvas re-render (CPU). May degrade at high mark counts vs. the CSS transform approach.

## Developer experience

- Setup gotchas: Fabric v6 uses fully named ESM exports — no `fabric` namespace. `FabricImage.fromURL()` is now async (returns Promise). React Strict Mode double-mount required careful `canvas.dispose()` cleanup.
- Lines of code (viewer component): ~110
- TypeScript: `TPointerEvent` is `MouseEvent | TouchEvent` union — required casts for clientX/clientY access.

## Suitability scores (1–5)

| Criterion | Score | Notes |
|---|---|---|
| Rendering quality | _/5 | |
| Mark anchoring reliability | _/5 | |
| Developer experience | _/5 | |
| Performance potential | _/5 | |

## Recommendation

_TODO: One-paragraph verdict after testing_
