import { Link } from 'react-router-dom'

const criteria = [
  {
    name: 'Performance',
    description: 'Speed of rendering, panning, zooming, and general responsiveness',
    prototypes: {
      'proto1': { score: 8, details: 'CSS transforms GPU-accelerated. PDF.js partially off-thread. Good for most documents.' },
      'proto5': { score: 9, details: 'Full Web Worker rendering. PDFium WASM engine. 60fps scrolling/zoom. Excellent for large documents.' },
      'proto6': { score: 9, details: 'Native SDK optimization. Built-in rendering pipeline. High performance.' },
    },
  },
  {
    name: 'Zoom Range',
    description: 'Available zoom levels and flexibility for detailed viewing',
    prototypes: {
      'proto1': { score: 9, details: 'Supports 25%-5000% range. Full zoom capability regardless of PDF complexity.' },
      'proto5': { score: 7, details: 'Supports 25%-5000% theoretically, but limited in practice for high-detail PDFs. Zoom range constrained by PDF file complexity and rendering performance.' },
      'proto6': { score: 9, details: 'SDK-native zoom. Supports 10%-3000%+ range with smooth transitions.' },
    },
  },
  {
    name: 'Accuracy',
    description: 'Visual fidelity and correctness of PDF rendering',
    prototypes: {
      'proto1': { score: 9, details: 'Excellent. Mozilla PDF.js proven in production. Maintains detail accuracy across all zoom levels.' },
      'proto5': { score: 9, details: 'Excellent. PDFium (Chrome\'s engine). Chromium-grade accuracy for complex documents.' },
      'proto6': { score: 5, details: 'Poor zoom detail rendering. Fails to maintain detail accuracy when zooming into high-detail areas. Rendering quality degrades at higher zoom levels.' },
    },
  },
  {
    name: 'Dev Effort',
    description: 'Time and complexity to implement and maintain',
    prototypes: {
      'proto1': { score: 9, details: 'Low effort. Simple library integration. Minimal custom code (~100 lines).' },
      'proto5': { score: 5, details: 'High effort. Custom viewer built from scratch. 1000+ lines. Worker setup, memory management.' },
      'proto6': { score: 9, details: 'Low effort. SDK handles all complexity. Native annotation API. Turnkey solution.' },
    },
  },
  {
    name: 'Pricing',
    description: 'License cost and commercial viability',
    prototypes: {
      'proto1': { score: 10, details: 'Free. Open-source Mozilla project. No licensing costs.' },
      'proto5': { score: 10, details: 'Free. Open-source MIT-licensed package. Zero cost.' },
      'proto6': { score: 4, details: 'Commercial. ~$5k-$50k+ per year depending on usage tier. Enterprise licensing.' },
    },
  },
  {
    name: 'Platform Support',
    description: 'Web and mobile/app platform compatibility',
    prototypes: {
      'proto1': { score: 5, details: 'Web-only. Requires WebView implementation for mobile/app deployment. Additional work needed for cross-platform support.' },
      'proto5': { score: 7, details: 'Web-only for WASM version. Flutter packages available for mobile (e.g., pdfium_flutter). Enables cross-platform code sharing.' },
      'proto6': { score: 10, details: 'Supported on both Web and mobile platforms. Native SDKs available for iOS/Android. Seamless cross-platform experience.' },
    },
  },
]

const prototypes = [
  { id: 'proto1', name: 'PDF.js + react-zoom-pan-pinch', color: '#7eb8f7' },
  { id: 'proto5', name: 'PDFium Raw WASM', color: '#50c878' },
  { id: 'proto6', name: 'Nutrient Web SDK', color: '#ffa500' },
]

export default function DecisionMatrixPage() {
  const calculateOverallScores = () => {
    const scores: Record<string, number> = {}
    prototypes.forEach((p) => {
      const total = criteria.reduce((sum, c) => sum + c.prototypes[p.id as keyof typeof c.prototypes].score, 0)
      scores[p.id] = Math.round((total / criteria.length / 10) * 100)
    })
    return scores
  }

  const overallScores = calculateOverallScores()

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          color: '#7eb8f7',
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        ← Back to Landing
      </Link>

      <h1 style={{ borderBottom: '2px solid #7eb8f7', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        Decision Matrix: Prototype Selection
      </h1>
      <p style={{ color: '#aaa', marginBottom: '2rem' }}>
        Comparison of PDF.js, PDFium Raw WASM, and Nutrient Web SDK across key evaluation criteria. Scores are on a scale of 1-10.
      </p>

      {/* Overall Scores Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {prototypes.map((p) => (
          <div
            key={p.id}
            style={{
              background: '#16213e',
              border: `2px solid ${p.color}`,
              borderRadius: 8,
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: p.color }}>{p.name}</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: p.color }}>
              {overallScores[p.id]}%
            </div>
            <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Overall Score</p>
          </div>
        ))}
      </div>

      {/* Detailed Comparison */}
      <div style={{ marginBottom: '2rem' }}>
        {criteria.map((c, idx) => (
          <div
            key={idx}
            style={{
              background: '#16213e',
              border: '1px solid #2a4080',
              borderRadius: 8,
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ margin: '0 0 0.25rem', color: '#7eb8f7' }}>{c.name}</h2>
            <p style={{ color: '#aaa', margin: '0 0 1rem', fontSize: '0.9rem' }}>{c.description}</p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
              }}
            >
              {prototypes.map((p) => {
                const protoData = c.prototypes[p.id as keyof typeof c.prototypes]
                const score = protoData.score
                const percentage = (score / 10) * 100

                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#0f1419',
                      border: `1px solid ${p.color}33`,
                      borderRadius: 6,
                      padding: '1rem',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{p.name.split(' — ')[0]}</span>
                        <span style={{ fontWeight: 'bold', color: p.color }}>{score}/10</span>
                      </div>
                      {/* Score bar */}
                      <div
                        style={{
                          width: '100%',
                          height: 6,
                          background: '#2a4080',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: p.color,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#ccc', lineHeight: 1.5 }}>
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
      <div
        style={{
          background: '#16213e',
          border: '2px solid #7eb8f7',
          borderRadius: 8,
          padding: '2rem',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ margin: '0 0 1rem', color: '#7eb8f7' }}>Recommendation Summary</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <h3 style={{ color: '#50c878', marginTop: 0 }}>Recommended for Simplicity: PDF.js</h3>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.5rem' }}>
              <li>Excellent zoom range (25%-5000%)</li>
              <li>Maintains accuracy across all zoom levels</li>
              <li>Minimal custom code required (~100 lines)</li>
              <li>Zero licensing costs</li>
              <li>
                <strong>Trade-off:</strong> Slightly lower performance for very large documents vs PDFium
              </li>
            </ul>
          </div>

          <div>
            <h3 style={{ color: '#7eb8f7', marginTop: 0 }}>Best Overall: PDFium Raw WASM</h3>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.5rem' }}>
              <li>Excellent performance (60fps for large documents)</li>
              <li>Chrome-grade rendering accuracy (PDFium)</li>
              <li>Maintains detail accuracy across all zoom levels</li>
              <li>Zero licensing costs</li>
              <li>
                <strong>Trade-off:</strong> Requires significant development effort (~1000+ lines custom code)
              </li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #2a4080' }}>
          <h3 style={{ color: '#ffa500', marginTop: 0 }}>Nutrient Web SDK (Not Recommended)</h3>
          <p style={{ margin: '0.5rem 0 0' }}>
            Despite being a commercial solution, Nutrient Web SDK fails to render PDF details accurately when zoomed, making it unsuitable for detailed technical document viewing. The rendering quality degrades at higher zoom levels, which is critical for blueprint/drawing evaluation.
          </p>
        </div>
      </div>
    </div>
  )
}
