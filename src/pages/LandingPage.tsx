import { Link } from 'react-router-dom'

const prototypes = [
  {
    path: '/prototype/pdfjs',
    name: 'Prototype 1 — PDF.js + react-zoom-pan-pinch',
    paradigm: 'Canvas render + CSS transform container',
    description:
      'PDF.js renders the page to a <canvas>. An <svg> overlay (absolutely positioned, same container) holds the marks. react-zoom-pan-pinch wraps both in a single CSS matrix() transform — marks anchor for free.',
    difficulty: 'Low',
    notes: 'NOTES_PROTO1.md',
  },
  {
    path: '/prototype/fabric',
    name: 'Prototype 2 — Fabric.js',
    paradigm: 'Canvas scene graph with built-in viewport transform',
    description:
      'PDF.js renders to an offscreen canvas → data URL. Fabric.js displays it as a background image. Marks are fabric.Circle + fabric.Text objects. canvas.zoomToPoint() and canvas.relativePan() apply a viewport matrix to the whole scene.',
    difficulty: 'Medium',
    notes: 'NOTES_PROTO2.md',
  },
  {
    path: '/prototype/leaflet',
    name: 'Prototype 3 — Leaflet.js (CRS.Simple)',
    paradigm: 'Map engine with PDF as image layer',
    description:
      'PDF.js renders to a data URL → Leaflet ImageOverlay on a CRS.Simple map. Marks are L.marker with L.divIcon. Leaflet recalculates all marker screen positions on every view change — map-quality pan/zoom UX.',
    difficulty: 'Medium-High',
    notes: 'NOTES_PROTO3.md',
  },
  {
    path: '/prototype/embedpdf',
    name: 'Prototype 4 — embedPdf (Headless)',
    paradigm: 'PDFium-based headless library with plugin architecture',
    description:
      'embedPdf headless mode renders pages via PDFium WASM engine. Scroller handles continuous vertical layout with virtualization. Zoom and Pan plugins provide interactive controls. Marks are SVG circles overlaid per page in the renderPage callback.',
    difficulty: 'Low-Medium',
    notes: '',
  },
  {
    path: '/prototype/pdfium-raw',
    name: 'Prototype 5 — PDFium Raw WASM',
    paradigm: 'Native PDFium WASM engine with custom viewer built from scratch',
    description:
      'Direct PDFium WASM rendering via @hyzyla/pdfium — zero dependencies, Chromium-grade quality. Custom zoom/pan (25%-5000%), multi-page scroll with virtualization, adaptive-scale rendering with viewport clipping, double-buffered canvas, and click-to-add marks with localStorage persistence. Single WASM dependency, all viewer code built from scratch.',
    difficulty: 'Medium',
    notes: '',
  },
]

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ borderBottom: '2px solid #7eb8f7', paddingBottom: '0.5rem' }}>
        AJB-14023 — PDF Viewer Technology Evaluation
      </h1>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>
        Three minimal prototypes for evaluating browser PDF rendering with overlaid coordinate marks,
        zoom, and pan. Each prototype uses 5 hardcoded marks in PDF coordinate space.
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {prototypes.map((p) => (
          <div
            key={p.path}
            style={{
              background: '#16213e',
              border: '1px solid #2a4080',
              borderRadius: 8,
              padding: '1.5rem',
            }}
          >
            <h2 style={{ margin: '0 0 0.25rem' }}>
              <Link to={p.path}>{p.name}</Link>
            </h2>
            <p style={{ color: '#7eb8f7', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>
              {p.paradigm}
            </p>
            <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6 }}>{p.description}</p>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#aaa' }}>
              <span>Setup complexity: <strong style={{ color: '#e0e0e0' }}>{p.difficulty}</strong></span>
              <span>Notes: <strong style={{ color: '#e0e0e0' }}>{p.notes}</strong></span>
            </div>
          </div>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2rem', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#16213e' }}>
            {['Technology', 'Mark anchoring', 'Zoom/Pan', 'React integration', 'Setup risk'].map((h) => (
              <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #2a4080' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['PDF.js + RZPP', 'CSS transform (parent)', 'react-zoom-pan-pinch', 'Native React', 'Low'],
            ['Fabric.js', 'Viewport matrix (scene)', 'canvas.zoomToPoint()', 'useRef imperative', 'Medium'],
            ['Leaflet CRS.Simple', 'Leaflet recalculates', 'Map-native', 'react-leaflet', 'Medium-High'],
            ['embedPdf Headless', 'SVG overlay per page', 'Zoom/Pan plugins', 'Native React hooks', 'Low-Medium'],
            ['PDFium Raw WASM', 'SVG overlay per page', 'Custom (25%-5000%)', 'Native React', 'Medium'],
          ].map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#16213e' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '0.75rem', borderBottom: '1px solid #2a4080' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
