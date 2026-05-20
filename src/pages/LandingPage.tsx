import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'
import { useRef, useState } from 'react'

const prototypes = [
  {
    path: '/prototype/pdfjs',
    name: 'Prototype 1.1 — PDF.js with Multi-page Virtualization',
    paradigm: 'Full-page canvas rendering with viewport-based page virtualization',
    description:
      'PDF.js renders each page to canvas (25%–5000% zoom, 0.25–50 scale). Only pages within the visible viewport are rendered, with dynamic pre-render margins for smooth scrolling. SVG overlay holds marks. Debounced zoom rendering (120ms) optimizes performance. Supports PDF upload and localStorage persistence for user marks.',
    difficulty: 'Medium',
    notes: 'NOTES_PROTO1.md',
    visible: true,
  },
  {
    path: '/prototype/pdfjs-canvas',
    name: 'Prototype 1.2 — PDF.js Canvas Tile Renderer',
    paradigm: 'Tiled canvas rendering with CSS upscaling during zoom',
    description:
      'PDF.js renders pages in 512×512 tiles for efficient viewport-based caching. Marks are SVG overlays. During zoom, tiles are CSS-scaled until a re-render completes, eliminating white flash. Supports 50%–1600% zoom with anchor-point zoom and right-click panning.',
    difficulty: 'Medium',
    notes: 'NOTES_PROTO1_2.md',
    visible: true,
  },
  {
    path: '/prototype/pdfium-raw',
    name: 'Prototype 5 — PDFium Raw WASM',
    paradigm: 'Native PDFium WASM engine with custom viewer built from scratch',
    description:
      'Direct PDFium WASM rendering via @hyzyla/pdfium — zero dependencies, Chromium-grade quality. Custom zoom/pan (25%–5000%), multi-page scroll with virtualization, adaptive-scale rendering with viewport clipping, double-buffered canvas, and click-to-add marks with localStorage persistence. Single WASM dependency, all viewer code built from scratch.',
    difficulty: 'High',
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

function parsePrototypeName(name: string): { label: string; title: string } {
  const sep = name.indexOf('—')
  if (sep === -1) return { label: '', title: name }
  return { label: name.slice(0, sep).trim(), title: name.slice(sep + 1).trim() }
}

function DifficultyBadge({ level }: { level: string }) {
  const { isDark } = useTheme()

  const getColors = (l: string): { bg: string; color: string } => {
    if (isDark) {
      if (l === 'Low')         return { bg: 'rgba(52, 160, 90,  0.16)', color: '#5CC87A' }
      if (l === 'Medium')      return { bg: 'rgba(190, 148, 42, 0.16)', color: '#D4A848' }
      if (l === 'Medium-High') return { bg: 'rgba(200, 110, 42, 0.16)', color: '#D88848' }
      if (l === 'High')        return { bg: 'rgba(195, 62,  62, 0.16)', color: '#D46868' }
      if (l === 'Hard')        return { bg: 'rgba(178, 48,  48, 0.18)', color: '#C45252' }
      return { bg: 'rgba(106, 170, 196, 0.14)', color: '#6AAAC4' }
    }
    if (l === 'Low')         return { bg: 'rgba(60, 130, 90,  0.10)', color: '#3C7A58' }
    if (l === 'Medium')      return { bg: 'rgba(155, 120, 50, 0.10)', color: '#8A6B2A' }
    if (l === 'Medium-High') return { bg: 'rgba(170, 100, 50, 0.10)', color: '#9A5E32' }
    if (l === 'High')        return { bg: 'rgba(160, 60,  60, 0.10)', color: '#9A4A4A' }
    if (l === 'Hard')        return { bg: 'rgba(150, 50,  50, 0.12)', color: '#8A3838' }
    return { bg: 'rgba(78, 110, 126, 0.10)', color: '#4E6E7E' }
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


function PrototypeCard({ p }: { p: (typeof prototypes)[0] }) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0 })
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  const { label, title } = parsePrototypeName(p.name)

  function handleMouseEnter() {
    setIsHovered(true)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / rect.width - 0.5
    const cy = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ rotX: -cy * 3, rotY: cx * 4 })
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  function handleMouseLeave() {
    setIsHovered(false)
    setTilt({ rotX: 0, rotY: 0 })
    setMousePos({ x: 50, y: 50 })
  }

  // Hue shifts from cool cyan-blue (195°) on the left to steel-teal (215°) on the right
  const hue = 195 + (mousePos.x / 100) * 20
  const glassGradient = `
    radial-gradient(circle 110px at ${mousePos.x}% ${mousePos.y}%,
      rgba(255, 255, 255, 0.07) 0%,
      transparent 60%
    ),
    radial-gradient(circle 240px at ${mousePos.x}% ${mousePos.y}%,
      hsla(${hue}, 52%, 68%, 0.07) 0%,
      transparent 70%
    )
  `

  const liveTransform = isHovered
    ? `perspective(1200px) rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) scale(1.022)`
    : undefined

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(p.path)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: isHovered ? 'var(--clr-surface-hover)' : 'var(--clr-surface)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: `1px solid ${isHovered ? 'var(--clr-border-hover)' : 'var(--clr-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        cursor: 'pointer',
        boxShadow: isHovered ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        transform: liveTransform,
        transition: 'transform 0.18s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
        willChange: 'transform',
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d' as const,
      }}
    >
      {/* Glassmorphism light sheen — follows mouse */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          opacity: isHovered ? 1 : 0,
          background: glassGradient,
          transition: 'opacity 0.35s ease',
          zIndex: 0,
        }}
      />

      {/* Card content — sits above the gradient overlay */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* Meta row: prototype label + difficulty */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.55rem',
      }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--clr-text-muted)',
        }}>
          {label}
        </span>
        <DifficultyBadge level={p.difficulty} />
      </div>

      {/* Title */}
      <h2 style={{
        margin: '0 0 0.75rem',
        fontSize: '1.05rem',
        fontWeight: 700,
        color: 'var(--clr-text-primary)',
        lineHeight: 1.3,
        letterSpacing: '-0.015em',
      }}>
        {title}
      </h2>

      {/* Paradigm */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.55rem',
        marginBottom: '0.875rem',
        paddingLeft: '0.75rem',
        borderLeft: '2px solid rgba(78, 110, 126, 0.28)',
      }}>
        <p style={{
          margin: 0,
          color: 'var(--clr-accent-500)',
          fontSize: '0.83rem',
          fontWeight: 500,
          lineHeight: 1.55,
        }}>
          {p.paradigm}
        </p>
      </div>

      {/* Description */}
      <p style={{
        margin: p.notes ? '0 0 1rem' : 0,
        color: 'var(--clr-text-secondary)',
        fontSize: '0.875rem',
        lineHeight: 1.7,
      }}>
        {p.description}
      </p>

      {/* Footer */}
      {p.notes && (
        <div style={{
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--clr-border-secondary)',
        }}>
          <Link
            to={`/notes/${p.notes}`}
            style={{
              fontSize: '0.78rem',
              color: 'var(--clr-accent-500)',
              fontWeight: 500,
              transition: 'color 0.15s ease',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--clr-accent-400)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--clr-accent-500)' }}
          >
            View notes →
          </Link>
        </div>
      )}

      </div>{/* end content wrapper */}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '3rem 2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 6,
            background: 'rgba(78, 110, 126, 0.09)',
            border: '1px solid rgba(78, 110, 126, 0.22)',
            color: 'var(--clr-accent-500)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
          }}>
            AJB-14023
          </span>
          <ThemeToggle />
        </div>

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
            background: 'rgba(78, 110, 126, 0.09)',
            border: '1px solid rgba(78, 110, 126, 0.22)',
            borderRadius: 8,
            color: 'var(--clr-accent-500)',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(78, 110, 126, 0.15)'
            e.currentTarget.style.borderColor = 'rgba(78, 110, 126, 0.38)'
            e.currentTarget.style.color = 'var(--clr-accent-400)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(78, 110, 126, 0.09)'
            e.currentTarget.style.borderColor = 'rgba(78, 110, 126, 0.22)'
            e.currentTarget.style.color = 'var(--clr-accent-500)'
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

        <Link
          to="/decision-matrix/pdfjs-variants"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1rem',
            background: 'rgba(74, 128, 101, 0.09)',
            border: '1px solid rgba(74, 128, 101, 0.22)',
            borderRadius: 8,
            color: '#4A8065',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(74, 128, 101, 0.15)'
            e.currentTarget.style.borderColor = 'rgba(74, 128, 101, 0.38)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(74, 128, 101, 0.09)'
            e.currentTarget.style.borderColor = 'rgba(74, 128, 101, 0.22)'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="0.5" y="0.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="5" y="0.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="0.5" y="5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="5" y="5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="0.5" y="9.5" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.8"/>
            <rect x="5" y="9.5" width="3.5" height="3" rx="0.5" fill="currentColor" opacity="0.8"/>
          </svg>
          PDF.js 1.1 vs 1.2
        </Link>
      </div>

      {/* Prototype cards */}
      <div style={{ display: 'grid', gap: '0.875rem' }}>
        {prototypes.filter((p) => p.visible).map((p) => (
          <PrototypeCard key={p.path} p={p} />
        ))}
      </div>
    </div>
  )
}
