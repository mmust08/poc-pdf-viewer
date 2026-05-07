# Prototype 6 — Nutrient Web SDK (formerly PSPDFKit)

**Route:** `/prototype/nutrient`  
**Source:** `src/components/nutrient/`  
**Stack:** `@nutrient-sdk/viewer` v1 · React 18

---

## Packages

| Package | Version | Role |
|---|---|---|
| `@nutrient-sdk/viewer` | ^1.14.0 | Complete PDF viewer SDK (PDFium engine, built-in UI, annotation API) |

`NutrientViewer.preloadWorker({ document: '', useCDN: true })` is called at module-load time to begin downloading the WASM worker before the component mounts.

---

## Architecture

```
NutrientViewer
├── Toolbar (upload, zoom +/-, fit-width, fit-page, add-mark toggle,
│           clear, export JSON, sidebar toggle, document format badge)
└── Main content row
    ├── SDK container <div> (ref={containerRef})
    │   └── Nutrient SDK owns all DOM inside here
    └── MarksSidebar (collapsible — mark list, navigate-to, per-mark delete)
```

### File structure

| File | Purpose |
|---|---|
| `NutrientViewer.tsx` | Main viewer — SDK lifecycle, annotation sync, toolbar, sidebar wiring |
| `useNutrientInstance.ts` | SDK load/unload, adaptive tileSize re-init, page geometry extraction |
| `useMarks.ts` | Mark state and localStorage persistence |
| `coordConversion.ts` | `pdfYToNutrient` / `nutrientYToPdf` |
| `pageFormats.ts` | `detectPageFormat` (A4/A3/Letter/…), `optimalTileSize` |
| `MarksSidebar.tsx` | Sidebar listing marks — navigate, delete |

---

## Render Method

The SDK manages all rendering internally (PDFium-based, tiled, GPU-accelerated). The React component's only job is to call `NutrientViewer.load()` with a container `<div>` and a document URL, then use the returned `instance` for all interaction.

### Adaptive tileSize

`useNutrientInstance` loads the document twice when necessary:
1. First load with `tileSize: 2048` — reads page dimensions and calls `optimalTileSize(geometries)`.
2. If `optimalTileSize` returns a different value (e.g., 4096 for A1/A2 blueprints), the SDK is unloaded and reloaded with the corrected `tileSize` before the instance is exposed to the viewer.

This avoids tile seams on large-format pages where the default tile is too small.

---

## Coordinate System

Nutrient uses **top-left origin, Y increasing downward** (same as the browser). PDF uses **bottom-left origin, Y increasing upward**. Conversion isolated in `coordConversion.ts`:

```ts
// PDF → Nutrient
pdfYToNutrient(pdfY, pageHeight) = pageHeight - pdfY

// Nutrient → PDF
nutrientYToPdf(nutrientY, pageHeight) = pageHeight - nutrientY
```

---

## Annotation Sync

Marks are stored in React state (`useMarks`) and synced to the SDK as `NoteAnnotation` objects. A `Map<markId, annotationId>` (`annotationMapRef`) tracks the mapping between internal mark IDs and SDK annotation IDs.

On each sync cycle:
1. Annotations for marks that no longer exist are deleted via `instance.delete(annotationId)`.
2. Annotations for new marks are created via `instance.create(new NoteAnnotation(...))`.
3. The returned annotation ID is stored in `annotationMapRef` for future deletion.

Hardcoded marks render red (`rgb(239,68,68)`); user marks render blue (`rgb(59,130,246)`).

---

## Key Improvements

### `page.press` event for adding marks
The SDK fires `page.press` on click. An `isAddingRef` ref (kept in sync with `isAdding` state) gates whether clicks place marks. Using a ref avoids re-subscribing the listener on every toggle — the listener is registered once and reads the ref value on each event.

### Navigate to mark
`instance.jumpToRect()` scrolls the SDK viewport to a 300 × 300 pt bounding box centred on the mark (coordinates converted to Nutrient space). Called from both the toolbar and `MarksSidebar`.

### `ZoomDisplay` component
A debounced `viewState.zoom.change` listener (150 ms) keeps a zoom percentage badge up to date without causing full re-renders of the viewer on every zoom step.

### `documentFormat` badge
On load, `useNutrientInstance` detects the page format of every page (A4, A3, Letter, A2, A1, …) and surfaces a single badge if all pages share the same format, or "Mixed" if they differ.

### Export JSON
Toolbar button downloads all marks (hardcoded + user) as `marks-<filename>.json`.

### `contain: layout style paint`
Applied to the SDK container `<div>`. Prevents internal SDK DOM mutations from triggering layout recalculation in the surrounding React tree.

### `autoSaveMode: DISABLED`
SDK auto-save is disabled. All persistence is handled by `useMarks` and localStorage — prevents unexpected annotation write-back to the PDF.

---

## Zoom Controls

The SDK exposes `instance.currentZoomLevel`, `instance.minimumZoomLevel`, `instance.maximumZoomLevel`, and `instance.setViewState()`. Custom zoom buttons call these directly:

```ts
// Zoom in
instance.setViewState((v) => v.set('zoom', instance.currentZoomLevel * 1.1))

// Fit to width
instance.setViewState((v) => v.set('zoom', NutrientSDK.ZoomMode.FIT_TO_WIDTH))
```

Initial zoom is set to `FIT_TO_WIDTH` in `useNutrientInstance` after load.

---

## License

The SDK runs in trial mode (watermark on PDF) without a license key. Provide a key via `VITE_NUTRIENT_LICENSE_KEY` in `.env.local` to suppress the watermark.
