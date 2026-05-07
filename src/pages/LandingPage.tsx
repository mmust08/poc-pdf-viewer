import { Link, useNavigate } from 'react-router-dom'

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
    notes: 'NOTES_PROTO1_2.md',
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
    paradigm: 'Canvas scene graph with built-in viewport transform',
    description:
      'PDF.js renders to an offscreen canvas → data URL. Fabric.js displays it as a background image. Marks are fabric.Circle + fabric.Text objects. canvas.zoomToPoint() and canvas.relativePan() apply a viewport matrix to the whole scene.',
    difficulty: 'Medium',
    notes: 'NOTES_PROTO2.md',
    visible: false,
  },
  {
    path: '/prototype/leaflet',
    name: 'Prototype 3 — Leaflet.js (CRS.Simple)',
    paradigm: 'Map engine with PDF as image layer',
    description:
      'PDF.js renders to a data URL → Leaflet ImageOverlay on a CRS.Simple map. Marks are L.marker with L.divIcon. Leaflet recalculates all marker screen positions on every view change — map-quality pan/zoom UX.',
    difficulty: 'Medium-High',
    notes: 'NOTES_PROTO3.md',
    visible: false,
  },
  {
    path: '/prototype/embedpdf',
    name: 'Prototype 4 — embedPdf (Headless)',
    paradigm: 'PDFium-based headless library with plugin architecture',
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
  },
]

function DifficultyBadge({ level }: { level: string }) {
  const getColors = (l: string): { bg: string; color: string } => {
    if (l === 'Low') return { bg: 'rgba(52, 211, 153, 0.1)', color: '#34d399' }
    if (l === 'Medium') return { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }
    if (l === 'Medium-High') return { bg: 'rgba(251, 146, 60, 0.1)', color: '#fb923c' }
    if (l === 'High') return { bg: 'rgba(248, 113, 113, 0.1)', color: '#f87171' }
    return { bg: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }
  }
  const { bg, color } = getColors(level)
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 5,
      fontSize: '0.72rem',
      fontWeight: 600,
      background: bg,
      color,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap' as const,
    }}>
      {level}
    </span>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '3rem 2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: 6,
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          color: 'var(--clr-purple-400)',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          marginBottom: '1rem',
        }}>
          AJB-14023
        </span>

        <h1 style={{
          margin: '0 0 0.75rem',
          fontSize: '1.85rem',
          fontWeight: 700,
          color: 'var(--clr-text-primary)',
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
        }}>
          PDF Viewer Technology Evaluation
        </h1>

        <p style={{
          margin: '0 0 1.75rem',
          color: 'var(--clr-text-secondary)',
          fontSize: '0.95rem',
          lineHeight: 1.65,
          maxWidth: 580,
        }}>
          Prototypes evaluating browser PDF rendering with overlaid coordinate marks, zoom, and pan.
          Each prototype uses 5 hardcoded marks in PDF coordinate space. Supports PDF upload from your computer.
        </p>

        <Link
          to="/decision-matrix"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1rem',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: 8,
            color: 'var(--clr-purple-400)',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.18)'
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.45)'
            e.currentTarget.style.color = 'var(--clr-purple-300)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.25)'
            e.currentTarget.style.color = 'var(--clr-purple-400)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="0.5" y="0.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="5" y="0.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="9.5" y="0.5" width="3" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="0.5" y="5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="5" y="5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="9.5" y="5" width="3" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="0.5" y="9.5" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="5" y="9.5" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="9.5" y="9.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.8"/>
          </svg>
          View Decision Matrix
        </Link>
      </div>

      {/* Prototype cards */}
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        {prototypes.filter((p) => p.visible).map((p) => (
          <div
            key={p.path}
            onClick={() => navigate(p.path)}
            style={{
              background: 'var(--clr-surface)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-card)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--clr-surface-hover)'
              e.currentTarget.style.borderColor = 'var(--clr-border-hover)'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--clr-surface)'
              e.currentTarget.style.borderColor = 'var(--clr-border)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-card)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '0.5rem',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--clr-text-primary)',
                lineHeight: 1.35,
              }}>
                {p.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginTop: 1 }}>
                <DifficultyBadge level={p.difficulty} />
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: 'var(--clr-text-muted)', flexShrink: 0 }}>
                  <path d="M3 7.5H12M8.5 4L12 7.5L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <p style={{
              margin: '0 0 0.65rem',
              color: 'var(--clr-purple-400)',
              fontSize: '0.82rem',
              fontWeight: 500,
              lineHeight: 1.5,
              opacity: 0.85,
            }}>
              {p.paradigm}
            </p>

            <p style={{
              margin: '0 0 1rem',
              color: 'var(--clr-text-secondary)',
              fontSize: '0.875rem',
              lineHeight: 1.65,
            }}>
              {p.description}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.78rem',
              color: 'var(--clr-text-muted)',
            }}>
              <span>
                Complexity:{' '}
                <span style={{ color: 'var(--clr-text-secondary)', fontWeight: 500 }}>{p.difficulty}</span>
              </span>
              {p.notes && (
                <Link
                  to={`/notes/${p.notes}`}
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.78rem',
                    color: 'var(--clr-purple-400)',
                    fontWeight: 500,
                    transition: 'color 0.15s ease',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--clr-purple-300)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--clr-purple-400)' }}
                >
                  Notes →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
