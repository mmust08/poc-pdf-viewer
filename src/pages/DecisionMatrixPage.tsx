import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

const printStyles = `
  @media print {
    a:first-of-type {
      display: none !important;
      margin: 0 !important;
      padding: 0 !important;
      height: 0 !important;
    }
  }
`

const criteria = [
  {
    name: 'Performance',
    description: 'Speed of rendering, panning, zooming, and general responsiveness',
    prototypes: {
      proto1: { score: 8, details: 'CSS transforms GPU-accelerated. PDF.js partially off-thread. Good for most documents.' },
      proto5: { score: 9, details: 'Full Web Worker rendering. PDFium WASM engine. 60fps scrolling/zoom. Excellent for large documents.' },
      proto6: { score: 9, details: 'Native SDK optimization. Built-in rendering pipeline. High performance.' },
    },
  },
  {
    name: 'Zoom Range',
    description: 'Available zoom levels and flexibility for detailed viewing',
    prototypes: {
      proto1: { score: 9, details: 'Supports 25%-5000% range. Full zoom capability regardless of PDF complexity.' },
      proto5: { score: 7, details: 'Supports 25%-5000% theoretically, but limited in practice for high-detail PDFs. Zoom range constrained by PDF file complexity and rendering performance.' },
      proto6: { score: 9, details: 'SDK-native zoom. Supports 10%-3000%+ range with smooth transitions.' },
    },
  },
  {
    name: 'Accuracy',
    description: 'Visual fidelity and correctness of PDF rendering',
    prototypes: {
      proto1: { score: 9, details: 'Excellent. Mozilla PDF.js proven in production. Maintains detail accuracy across all zoom levels.' },
      proto5: { score: 9, details: "Excellent. PDFium (Chrome's engine). Chromium-grade accuracy for complex documents." },
      proto6: { score: 5, details: 'Poor zoom detail rendering. Fails to maintain detail accuracy when zooming into high-detail areas. Rendering quality degrades at higher zoom levels.' },
    },
  },
  {
    name: 'Dev Effort',
    description: 'Time and complexity to implement and maintain',
    prototypes: {
      proto1: { score: 9, details: 'Low effort. Simple library integration. Minimal custom code (~100 lines).' },
      proto5: { score: 5, details: 'High effort. Custom viewer built from scratch. 1000+ lines. Worker setup, memory management.' },
      proto6: { score: 9, details: 'Low effort. SDK handles all complexity. Native annotation API. Turnkey solution.' },
    },
  },
  {
    name: 'Pricing',
    description: 'License cost and commercial viability',
    prototypes: {
      proto1: { score: 10, details: 'Free. Open-source Mozilla project. No licensing costs.' },
      proto5: { score: 10, details: 'Free. Open-source MIT-licensed package. Zero cost.' },
      proto6: { score: 4, details: 'Commercial. ~$5k-$50k+ per year depending on usage tier. Enterprise licensing.' },
    },
  },
  {
    name: 'Platform Support',
    description: 'Web and mobile/app platform compatibility',
    prototypes: {
      proto1: { score: 5, details: 'Web-only. Requires WebView implementation for mobile/app deployment. Additional work needed for cross-platform support.' },
      proto5: { score: 7, details: 'Web-only for WASM version. Flutter packages available for mobile (e.g., pdfium_flutter). Enables cross-platform code sharing.' },
      proto6: { score: 10, details: 'Supported on both Web and mobile platforms. Native SDKs available for iOS/Android. Seamless cross-platform experience.' },
    },
  },
]

const prototypes = [
  { id: 'proto1', name: 'PDF.js + react-zoom-pan-pinch', color: '#4E6E7E' },
  { id: 'proto5', name: 'PDFium Raw WASM', color: '#4A8065' },
  { id: 'proto6', name: 'Nutrient Web SDK', color: '#8A6B2A' },
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

export default function DecisionMatrixPage() {
  const calculateOverallScores = () => {
    const scores: Record<string, number> = {}
    prototypes.forEach((p) => {
      const total = criteria.reduce(
        (sum, c) => sum + c.prototypes[p.id as keyof typeof c.prototypes].score,
        0,
      )
      scores[p.id] = Math.round((total / criteria.length / 10) * 100)
    })
    return scores
  }

  const overallScores = calculateOverallScores()

  return (
    <>
      <style>{printStyles}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Back link + theme toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--clr-text-muted)',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--clr-accent-500)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--clr-text-muted)' }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M12 7.5H3M6.5 4L3 7.5L6.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
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
            background: 'rgba(78, 110, 126, 0.09)',
            border: '1px solid rgba(78, 110, 126, 0.22)',
            color: 'var(--clr-accent-500)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            marginBottom: '0.875rem',
          }}>
            Evaluation
          </span>
          <h1 style={{
            margin: '0 0 0.5rem',
            fontSize: '1.85rem',
            fontWeight: 700,
            color: 'var(--clr-text-primary)',
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
          }}>
            Decision Matrix
          </h1>
          <p style={{ margin: 0, color: 'var(--clr-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Comparison of PDF.js, PDFium Raw WASM, and Nutrient Web SDK across key evaluation criteria. Scores are on a scale of 1–10.
          </p>
        </div>

        {/* Overall score cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}>
          {prototypes.map((p) => (
            <div
              key={p.id}
              style={{
                ...glassCard,
                border: `1px solid ${p.color}28`,
                textAlign: 'center',
              }}
            >
              <div style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: p.color,
                marginBottom: '0.75rem',
                boxShadow: `0 0 10px ${p.color}60`,
              }} />
              <h3 style={{ margin: '0 0 0.75rem', color: p.color, fontSize: '0.9rem', fontWeight: 600 }}>
                {p.name}
              </h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: p.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {overallScores[p.id]}%
              </div>
              <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.78rem', margin: '0.5rem 0 0', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                Overall Score
              </p>
            </div>
          ))}
        </div>

        {/* Detailed criteria */}
        <div style={{ marginBottom: '2rem' }}>
          {criteria.map((c, idx) => (
            <div key={idx} style={{ ...glassCard, marginBottom: '1rem' }}>
              <h2 style={{ margin: '0 0 0.25rem', color: 'var(--clr-text-primary)', fontSize: '1.05rem', fontWeight: 600 }}>
                {c.name}
              </h2>
              <p style={{ color: 'var(--clr-text-muted)', margin: '0 0 1.25rem', fontSize: '0.85rem' }}>
                {c.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
                {prototypes.map((p) => {
                  const protoData = c.prototypes[p.id as keyof typeof c.prototypes]
                  const percentage = (protoData.score / 10) * 100

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: 'var(--clr-inset-surface)',
                        border: `1px solid ${p.color}28`,
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', fontWeight: 500 }}>
                            {p.name.split(' + ')[0].split(' Raw')[0]}
                          </span>
                          <span style={{ fontWeight: 700, color: p.color, fontSize: '0.9rem' }}>
                            {protoData.score}<span style={{ fontSize: '0.72rem', opacity: 0.7 }}>/10</span>
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: 4,
                          background: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${p.color}99, ${p.color})`,
                            borderRadius: 2,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--clr-text-secondary)', lineHeight: 1.6 }}>
                        {protoData.details}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div style={{
          ...glassCard,
          border: '1px solid rgba(78, 110, 126, 0.22)',
          marginBottom: '2rem',
        }}>
          <h2 style={{ margin: '0 0 1.5rem', color: 'var(--clr-text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>
            Recommendation Summary
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{
              background: 'rgba(78, 110, 126, 0.06)',
              border: '1px solid rgba(78, 110, 126, 0.16)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}>
              <h3 style={{ color: '#4E6E7E', marginTop: 0, marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                Recommended for Simplicity — PDF.js
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--clr-text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                <li>Excellent zoom range (25%–5000%)</li>
                <li>Maintains accuracy across all zoom levels</li>
                <li>Minimal custom code required (~100 lines)</li>
                <li>Zero licensing costs</li>
                <li style={{ color: 'var(--clr-text-muted)' }}>
                  <strong style={{ color: 'var(--clr-text-secondary)' }}>Trade-off:</strong> Slightly lower performance for very large documents vs PDFium
                </li>
              </ul>
            </div>

            <div style={{
              background: 'rgba(74, 128, 101, 0.06)',
              border: '1px solid rgba(74, 128, 101, 0.16)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}>
              <h3 style={{ color: '#4A8065', marginTop: 0, marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>
                Best Overall — PDFium Raw WASM
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--clr-text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                <li>Excellent performance (60fps for large documents)</li>
                <li>Chrome-grade rendering accuracy (PDFium)</li>
                <li>Maintains detail accuracy across all zoom levels</li>
                <li>Zero licensing costs</li>
                <li style={{ color: 'var(--clr-text-muted)' }}>
                  <strong style={{ color: 'var(--clr-text-secondary)' }}>Trade-off:</strong> Requires significant development effort (~1000+ lines custom code)
                </li>
              </ul>
            </div>
          </div>

          <div style={{
            background: 'rgba(138, 107, 42, 0.06)',
            border: '1px solid rgba(138, 107, 42, 0.16)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
          }}>
            <h3 style={{ color: '#8A6B2A', marginTop: 0, marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>
              Nutrient Web SDK — Not Recommended
            </h3>
            <p style={{ margin: 0, color: 'var(--clr-text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>
              Despite being a commercial solution, Nutrient Web SDK fails to render PDF details accurately when zoomed, making it unsuitable for detailed technical document viewing. The rendering quality degrades at higher zoom levels, which is critical for blueprint/drawing evaluation.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
