import { Link } from 'react-router-dom'

const prototypes = [
  {
    path: '/prototype/pdfjs',
    name: 'Prototype 1.1 — PDF.js with Multi-page Virtualization',
    paradigm: 'Full-page canvas rendering with viewport-based page virtualization',
    description:
      'Multi-page continuous vertical scroll with page virtualization — only renders pages within the visible viewport + dynamic pre-render margins for smooth scrolling. PDF.js renders each page to canvas (25%-5000% zoom, 0.25-50 scale). SVG overlay holds marks. Debounced zoom rendering (120ms) optimizes performance. Supports PDF file upload and localStorage persistence for user marks.',
    difficulty: 'Low',
    notes: 'NOTES_PROTO1.md',
    visible: true,
  },
  {
    path: '/prototype/pdfjs-canvas',
    name: 'Prototype 1.2 — PDF.js Canvas Tile Renderer',
    paradigm: 'Tiled canvas rendering with CSS upscaling during zoom',
    description:
      'PDF.js renders pages in 512×512 tiles for efficient viewport-based caching. Marks are SVG overlays. During zoom, tiles are CSS-scaled until render finishes, eliminating white flash. Supports zoom levels from 50% to 1600% with anchor-point zoom and right-click panning.',
    difficulty: 'Medium',
    notes: '',
    visible: true,
  },
  {
    path: '/prototype/pdfium-raw',
    name: 'Prototype 5 — PDFium Raw WASM',
    paradigm: 'Native PDFium WASM engine with custom viewer built from scratch',
    description:
      'Direct PDFium WASM rendering via @hyzyla/pdfium — zero dependencies, Chromium-grade quality. Custom zoom/pan (25%-5000%), multi-page scroll with virtualization, adaptive-scale rendering with viewport clipping, double-buffered canvas, and click-to-add marks with localStorage persistence. Single WASM dependency, all viewer code built from scratch.',
    difficulty: 'Medium',
    notes: 'NOTES_PROTO5.md',
    visible: true,
  },
  {
    path: '/prototype/fabric',
    name: 'Prototype 2 — Fabric.js',
    paradigm: '⚠️Warning: PDF Upload not working | Canvas scene graph with built-in viewport transform',
    description:
      'PDF.js renders to an offscreen canvas → data URL. Fabric.js displays it as a background image. Marks are fabric.Circle + fabric.Text objects. canvas.zoomToPoint() and canvas.relativePan() apply a viewport matrix to the whole scene.',
    difficulty: 'Medium',
    notes: 'NOTES_PROTO2.md',
    visible: false,
  },
  {
    path: '/prototype/leaflet',
    name: 'Prototype 3 — Leaflet.js (CRS.Simple)',
    paradigm: '⚠️Warning: PDF is rasterized, not vectorized | Map engine with PDF as image layer',
    description:
      'PDF.js renders to a data URL → Leaflet ImageOverlay on a CRS.Simple map. Marks are L.marker with L.divIcon. Leaflet recalculates all marker screen positions on every view change — map-quality pan/zoom UX.',
    difficulty: 'Medium-High',
    notes: 'NOTES_PROTO3.md',
    visible: false,
  },
  {
    path: '/prototype/embedpdf',
    name: 'Prototype 4 — embedPdf (Headless)',
    paradigm: '⚠️Warning: Large PDF fails to render | PDFium-based headless library with plugin architecture',
    description:
      'embedPdf headless mode renders pages via PDFium WASM engine. Scroller handles continuous vertical layout with virtualization. Zoom and Pan plugins provide interactive controls. Marks are SVG circles overlaid per page in the renderPage callback.',
    difficulty: 'Low-Medium',
    notes: '',
    visible: false,
  },
  {
    path: '/prototype/nutrient',
    name: 'Prototype 6 — Nutrient Web SDK (formerly PSPDFKit)',
    paradigm: 'Commercial SDK with PDFium engine, built-in viewer, and native annotation API',
    description:
      'Nutrient Web SDK provides a complete viewer with PDFium-based vector rendering, built-in zoom/pan, and a native annotation API. Marks are implemented as NoteAnnotation objects that automatically anchor to PDF coordinates across all zoom levels. Includes sidebar with mark list, click-to-navigate, and JSON export.',
    difficulty: 'Low',
    notes: 'NOTES_PROTO6.md',
    visible: true,
  }
]

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ borderBottom: '2px solid #7eb8f7', paddingBottom: '0.5rem' }}>
        AJB-14023 — PDF Viewer Technology Evaluation
      </h1>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>
        Multiple prototypes for evaluating browser PDF rendering with overlaid coordinate marks,
        zoom, and pan. Each prototype uses 5 hardcoded marks in PDF coordinate space. Supports PDF upload from your computer.
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/decision-matrix"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            background: '#2a4080',
            border: '1px solid #3d5b99',
            borderRadius: 6,
            color: '#7eb8f7',
            textDecoration: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#3d5b99'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2a4080'
          }}
        >
          📊 View Decision Matrix
        </Link>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {prototypes.filter(p => p.visible).map((p) => (
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
              <span>
                Notes:{' '}
                {p.notes ? (
                  <Link
                    to={`/notes/${p.notes}`}
                    style={{
                      color: '#7eb8f7',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    {p.notes}
                  </Link>
                ) : (
                  <strong style={{ color: '#e0e0e0' }}>—</strong>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2rem', fontSize: '0.9rem' }}>
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
            ['Nutrient SDK', 'Native annotations (SDK)', 'SDK-native', 'Imperative ref', 'Low'],
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
      </table> */}
    </div>
  )
}
