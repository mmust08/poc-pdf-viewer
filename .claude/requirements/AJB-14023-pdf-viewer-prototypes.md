# Requirements: AJB-14023 — PDF Viewer Technology Evaluation

## Summary

Evaluate three candidate browser technologies for rendering PDF blueprints with overlaid coordinate registration marks, zoom, and pan. Produce one minimal prototype per technology plus brief evaluation notes.

## Functional Requirements

| # | Requirement |
|---|---|
| FR-1 | Each prototype renders a PDF blueprint in the browser |
| FR-2 | Each prototype displays a set of hardcoded registration marks overlaid at fixed PDF coordinate positions |
| FR-3 | Each prototype supports zoom (mouse wheel / pinch) |
| FR-4 | Each prototype supports pan (drag) |
| FR-5 | Registration marks remain anchored to their correct PDF coordinate position during zoom and pan |
| FR-6 | Brief notes per technology covering: what worked, what was painful, initial viability verdict |

## Out of Scope

- Real production PDFs or coordinate data
- Placing or saving registration marks (read-only display only)
- Production-quality implementation or error handling
- Mobile / Flutter integration
- PDFTron / Apryse (explicitly excluded as candidate)
- Authentication, backend integration, or data persistence

## Acceptance Criteria

1. **Given** three agreed candidate technologies, **When** the prototypes are complete, **Then** each one renders a PDF with hardcoded marks visible at the correct positions.
2. **Given** a user zooms or pans in any of the prototypes, **Then** marks remain anchored to their correct position.
3. **Given** the work is complete, **Then** brief notes per technology are available covering initial impressions and problem areas.

## Proposed Technologies

| # | Technology | Rationale |
|---|---|---|
| 1 | PDF.js (pdfjs-dist) + react-zoom-pan-pinch | Most widely used PDF engine; CSS transform approach is simplest for mark anchoring |
| 2 | Fabric.js (canvas scene graph) + PDF.js | Canvas-native zoom/pan via viewport transform; different paradigm to evaluate |
| 3 | Leaflet.js (map engine, CRS.Simple) + PDF.js | Map-style zoom/pan UX; blueprints are conceptually similar to maps |

> Technology choice requires alignment with Alexander Poopeiko or Andreas Edal Pedersen before implementation begins.

## Hardcoded Mark Data

Marks are defined in PDF user-space coordinates (points, origin bottom-left per PDF spec):

```typescript
{ id: "M1", x: 200,  y: 2100, label: "M1 — Column A" }
{ id: "M2", x: 840,  y: 1800, label: "M2 — Stairwell" }
{ id: "M3", x: 1400, y: 1200, label: "M3 — Electrical panel" }
{ id: "M4", x: 400,  y: 600,  label: "M4 — Exit door" }
{ id: "M5", x: 1200, y: 300,  label: "M5 — Ground anchor" }
```

## Non-Functional Requirements

- Must run in latest Chrome, Firefox, and Edge
- Development-only quality: no production build optimisation required
- Open-source dependencies only (no paid SDKs or SaaS APIs)

## Definition of Done

- [ ] Three prototype routes implemented and working
- [ ] Marks visible and correctly anchored at 1x, 2x, and 8x zoom in all three prototypes
- [ ] `NOTES_PROTO1.md`, `NOTES_PROTO2.md`, `NOTES_PROTO3.md` written with evaluation observations
- [ ] Technology choice aligned with Alexander Poopeiko or Andreas Edal Pedersen
