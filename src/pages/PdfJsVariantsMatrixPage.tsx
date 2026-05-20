import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

const PROTO_1_1 = { id: 'p1', label: 'Proto 1.1', name: 'PdfJsViewer', sub: 'Full-page canvas', color: '#4E6E7E', route: '/prototype/pdfjs' }
const PROTO_1_2 = { id: 'p2', label: 'Proto 1.2', name: 'PdfJsCanvasViewer', sub: 'Tile-based canvas', color: '#4A8065', route: '/prototype/pdfjs-canvas' }
const PROTOS = [PROTO_1_1, PROTO_1_2]

const criteria = [
  {
    name: 'Multi-page Support',
    description: 'Ability to render, navigate, and virtualize multiple PDF pages',
    scores: { p1: 10, p2: 2 },
    details: {
      p1: 'Virtualized multi-page layout with per-page canvas mounting. Only pages within 2 viewport-heights are rendered. Accurate page detection via cumulative height geometry.',
      p2: 'Hardcoded to page 1. No multi-page architecture exists in the current implementation.',
    },
  },
  {
    name: 'Performance at High Zoom',
    description: 'Rendering speed and smoothness when zoomed beyond 200%',
    scores: { p1: 6, p2: 9 },
    details: {
      p1: 'Renders full-page canvas. Falls back to a clip-region at extreme zoom (>browser 16384px limit). Can stutter on large-format blueprints.',
      p2: '512×512 tile grid — only visible tiles (+1 buffer) are rendered. Scales to 16× without canvas-size limits. Tiles render independently.',
    },
  },
  {
    name: 'Mark Interaction UX',
    description: 'Richness of annotation placement, selection, drag, and display',
    scores: { p1: 5, p2: 9 },
    details: {
      p1: 'Click to add a mark only. No drag-to-move, no selection state, no info panel, no visual differentiation between marks.',
      p2: 'Click to add → drag to reposition → click to select → info panel with coordinates. Color by label hash. Non-selected marks dim to 35% opacity.',
    },
  },
  {
    name: 'Zoom Range',
    description: 'Min/max zoom levels supported',
    scores: { p1: 10, p2: 7 },
    details: {
      p1: '0.1×–50× (10%–5000%). Discrete step array with 10% increments up to 100%, then Firefox-style jumps.',
      p2: '0.5×–16× (50%–1600%). Continuous 1.1× factor per wheel tick. No sub-50% or over-1600% zoom.',
    },
  },
  {
    name: 'Zoom Mode Presets',
    description: 'Named fit modes: page-width, page-fit, actual-size, auto',
    scores: { p1: 10, p2: 3 },
    details: {
      p1: 'page-width, page-fit, auto, actual-size, custom — all supported. ResizeObserver re-applies named mode on container resize.',
      p2: 'Custom numeric scale only. No named fit modes. No resize-aware re-scaling.',
    },
  },
  {
    name: 'Pan Gesture Ergonomics',
    description: 'Mouse button used for panning and conflict with mark placement',
    scores: { p1: 7, p2: 8 },
    details: {
      p1: 'Left-click drag to pan. Intuitive, but conflicts with mark placement — requires overlay element interception.',
      p2: 'Right-click drag to pan. Frees left-click entirely for mark interactions. Less discoverable but cleaner separation.',
    },
  },
  {
    name: 'Maintainability',
    description: 'Code modularity, separation of concerns, and testability',
    scores: { p1: 6, p2: 8 },
    details: {
      p1: '~970 LOC in a single file with embedded PageCanvas sub-component. Logic and rendering tightly coupled.',
      p2: '~660 LOC main + 200 LOC TileRenderer class (separate file) + useCanvasMarks hook. Better separation, easier to test.',
    },
  },
  {
    name: 'Canvas-Limit Resilience',
    description: 'Handling of the browser 16384px canvas dimension limit',
    scores: { p1: 7, p2: 10 },
    details: {
      p1: 'Clip-region fallback when a full-page canvas would exceed the limit. Works but can produce subtle visual seams.',
      p2: '512×512 tiles mean no single canvas ever approaches the limit at any zoom level or page size.',
    },
  },
  {
    name: 'Stale-Content Handling',
    description: 'Visual continuity between zoom events while re-rendering',
    scores: { p1: 8, p2: 9 },
    details: {
      p1: 'CSS rescales the old full-page bitmap while the new render runs off-screen (~150ms gap). Smooth but blurry during transition.',
      p2: 'Re-parents existing tile canvases behind the active layer — no bitmap copy. Tiles stay in place scaled until replaced. 4 s safety timer.',
    },
  },
  {
    name: 'Rendering Smoothness',
    description: 'Scroll and zoom feel — debouncing, double buffering, RAF usage',
    scores: { p1: 8, p2: 8 },
    details: {
      p1: 'RAF scroll debounce, 150ms zoom debounce, 200px hysteresis threshold, offscreen canvas double-buffering.',
      p2: '120ms committed-scale debounce, 1-tile buffer, wheel-direction reversal detection. Comparable via different mechanisms.',
    },
  },
]

const glassCard: CSSProperties = {
  background: 'var(--clr-surface)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid var(--clr-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{
        flex: 1,
        height: 5,
        background: 'rgba(128,128,128,0.12)',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${score * 10}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontWeight: 700, color, fontSize: '0.88rem', minWidth: 32, textAlign: 'right' }}>
        {score}<span style={{ fontSize: '0.7rem', opacity: 0.65 }}>/10</span>
      </span>
    </div>
  )
}

export default function PdfJsVariantsMatrixPage() {
  const totals = PROTOS.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = criteria.reduce((s, c) => s + c.scores[p.id as 'p1' | 'p2'], 0)
    return acc
  }, {})

  const winner = totals['p1'] >= totals['p2'] ? PROTO_1_1 : PROTO_1_2
  const loser = winner.id === 'p1' ? PROTO_1_2 : PROTO_1_1

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 2rem' }}>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link
          to="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--clr-text-muted)', fontSize: '0.875rem', fontWeight: 500, transition: 'color 0.15s ease' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--clr-accent-500)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--clr-text-muted)' }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M12 7.5H3M6.5 4L3 7.5L6.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Landing
        </Link>
        <ThemeToggle />
      </div>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <span style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: 6,
          background: 'rgba(78,110,126,0.09)',
          border: '1px solid rgba(78,110,126,0.22)',
          color: 'var(--clr-accent-500)',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '0.875rem',
        }}>
          PDF.js Implementation Comparison
        </span>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.85rem', fontWeight: 700, color: 'var(--clr-text-primary)', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
          Prototype 1.1 vs 1.2
        </h1>
        <p style={{ margin: 0, color: 'var(--clr-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Full-page canvas rendering versus tile-based canvas rendering — both built on PDF.js. Scores 1–10 across 10 criteria.
        </p>
      </div>

      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
        {PROTOS.map(p => (
          <div key={p.id} style={{ ...glassCard, border: `1px solid ${p.color}30`, textAlign: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, margin: '0 auto 0.75rem', boxShadow: `0 0 10px ${p.color}60` }} />
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>
              {p.label}
            </div>
            <h3 style={{ margin: '0 0 0.2rem', color: p.color, fontSize: '1rem', fontWeight: 700 }}>{p.name}</h3>
            <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.78rem', marginBottom: '1rem' }}>{p.sub}</div>
            <div style={{ fontSize: '2.75rem', fontWeight: 700, color: p.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {totals[p.id]}
            </div>
            <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem', marginTop: '0.35rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              / 100 points
            </div>
            <Link
              to={p.route}
              style={{
                display: 'inline-block',
                marginTop: '1rem',
                padding: '0.35rem 0.9rem',
                borderRadius: 6,
                background: `${p.color}18`,
                border: `1px solid ${p.color}40`,
                color: p.color,
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Open prototype →
            </Link>
          </div>
        ))}
      </div>

      {/* Quick comparison table */}
      <div style={{ ...glassCard, marginBottom: '1.5rem', overflowX: 'auto' }}>
        <h2 style={{ margin: '0 0 1.25rem', color: 'var(--clr-text-primary)', fontSize: '1rem', fontWeight: 600 }}>Quick Comparison</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              {['', 'Proto 1.1 — PdfJsViewer', 'Proto 1.2 — PdfJsCanvasViewer'].map((h, i) => (
                <th key={i} style={{
                  textAlign: i === 0 ? 'left' : 'center',
                  padding: '0.5rem 0.75rem',
                  color: i === 0 ? 'var(--clr-text-muted)' : (i === 1 ? PROTO_1_1.color : PROTO_1_2.color),
                  fontWeight: 600,
                  borderBottom: '1px solid var(--clr-border)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Multi-page', '✓ Virtualized', '✗ Page 1 only'],
              ['Zoom range', '10% – 5000%', '50% – 1600%'],
              ['Zoom presets', 'page-width, page-fit, auto, actual-size', 'None'],
              ['Pan gesture', 'Left-click drag', 'Right-click drag'],
              ['Mark drag', '✗', '✓'],
              ['Mark selection', '✗', '✓'],
              ['Canvas limit strategy', 'Clip-region fallback', 'Tile grid (never hits limit)'],
              ['Lines of code', '~970 (monolithic)', '~860 (3 files)'],
              ['Stale content during zoom', 'CSS-scale old bitmap', 'Re-parent + CSS-scale tiles'],
            ].map(([label, v1, v2], i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(128,128,128,0.04)' }}>
                <td style={{ padding: '0.55rem 0.75rem', color: 'var(--clr-text-muted)', fontWeight: 500 }}>{label}</td>
                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', color: 'var(--clr-text-secondary)' }}>{v1}</td>
                <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center', color: 'var(--clr-text-secondary)' }}>{v2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed criteria */}
      <div style={{ marginBottom: '1.5rem' }}>
        {criteria.map((c, idx) => {
          const winId = c.scores.p1 >= c.scores.p2 ? 'p1' : 'p2'
          return (
            <div key={idx} style={{ ...glassCard, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, color: 'var(--clr-text-primary)', fontSize: '1rem', fontWeight: 600 }}>{c.name}</h2>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: `${(winId === 'p1' ? PROTO_1_1 : PROTO_1_2).color}18`,
                  color: (winId === 'p1' ? PROTO_1_1 : PROTO_1_2).color,
                  whiteSpace: 'nowrap',
                }}>
                  {winId === 'p1' ? PROTO_1_1.label : PROTO_1_2.label} wins
                  {c.scores.p1 === c.scores.p2 ? ' (tie)' : ''}
                </span>
              </div>
              <p style={{ color: 'var(--clr-text-muted)', margin: '0 0 1.25rem', fontSize: '0.83rem' }}>{c.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                {PROTOS.map(p => (
                  <div key={p.id} style={{
                    background: 'var(--clr-inset-surface)',
                    border: `1px solid ${p.color}${c.scores[p.id as 'p1' | 'p2'] === Math.max(c.scores.p1, c.scores.p2) ? '40' : '1a'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {p.label}
                      </span>
                    </div>
                    <ScoreBar score={c.scores[p.id as 'p1' | 'p2']} color={p.color} />
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
                      {c.details[p.id as 'p1' | 'p2']}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendation */}
      <div style={{ ...glassCard, border: '1px solid rgba(78,110,126,0.22)' }}>
        <h2 style={{ margin: '0 0 1.25rem', color: 'var(--clr-text-primary)', fontSize: '1.05rem', fontWeight: 600 }}>Recommendation</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            background: `${winner.color}09`,
            border: `1px solid ${winner.color}28`,
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
          }}>
            <h3 style={{ color: winner.color, marginTop: 0, marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
              Higher Score — {winner.label} ({winner.name})
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--clr-text-secondary)', fontSize: '0.875rem', lineHeight: 1.75 }}>
              <li>Multi-page virtualization (critical for production)</li>
              <li>Full zoom range 10%–5000%</li>
              <li>Named fit modes (page-width, page-fit, auto)</li>
              <li>ResizeObserver re-applies zoom mode on resize</li>
              <li style={{ color: 'var(--clr-text-muted)' }}><strong style={{ color: 'var(--clr-text-secondary)' }}>Trade-off:</strong> Weaker mark UX, canvas-limit fallback at extreme zoom</li>
            </ul>
          </div>

          <div style={{
            background: `${loser.color}09`,
            border: `1px solid ${loser.color}28`,
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
          }}>
            <h3 style={{ color: loser.color, marginTop: 0, marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
              Superior in Key Areas — {loser.label} ({loser.name})
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--clr-text-secondary)', fontSize: '0.875rem', lineHeight: 1.75 }}>
              <li>Tile architecture eliminates canvas-size constraints</li>
              <li>Richer mark UX: drag, select, info panel, color coding</li>
              <li>Better code modularity (TileRenderer + useCanvasMarks)</li>
              <li>Cleaner pan/mark gesture separation (right-click pan)</li>
              <li style={{ color: 'var(--clr-text-muted)' }}><strong style={{ color: 'var(--clr-text-secondary)' }}>Trade-off:</strong> Single-page only, no zoom presets</li>
            </ul>
          </div>
        </div>

        <div style={{
          background: 'rgba(78,110,126,0.05)',
          border: '1px solid rgba(78,110,126,0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
        }}>
          <h3 style={{ color: 'var(--clr-text-primary)', marginTop: 0, marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>
            Ideal Path Forward
          </h3>
          <p style={{ margin: 0, color: 'var(--clr-text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            Neither prototype is production-ready alone. The optimal implementation merges the best of both: <strong>multi-page virtualization and zoom presets from 1.1</strong> combined with <strong>tile-based rendering and the mark selection/drag UX from 1.2</strong>. The <code>TileRenderer</code> class from 1.2 is the right rendering primitive — it just needs to be extended across a multi-page layout.
          </p>
        </div>
      </div>
    </div>
  )
}
