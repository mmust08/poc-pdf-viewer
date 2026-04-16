import { Link } from 'react-router-dom'
import PdfJsViewer from '../components/pdfjs/PdfJsViewer'

export default function PdfJsPrototype() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ background: '#16213e', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #2a4080', flexShrink: 0 }}>
        <Link to="/" style={{ color: '#7eb8f7' }}>← Back</Link>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Prototype 1 — PDF.js + react-zoom-pan-pinch</h2>
        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Scroll to zoom · Drag to pan</span>
      </header>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <PdfJsViewer pdfUrl="/sample-blueprint.pdf" />
      </div>
    </div>
  )
}
