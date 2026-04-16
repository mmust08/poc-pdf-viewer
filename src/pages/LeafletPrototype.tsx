import { Link } from 'react-router-dom'
import LeafletViewer from '../components/leaflet/LeafletViewer'

export default function LeafletPrototype() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ background: '#16213e', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #2a4080', flexShrink: 0 }}>
        <Link to="/" style={{ color: '#7eb8f7' }}>← Back</Link>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Prototype 3 — Leaflet.js (CRS.Simple)</h2>
        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Scroll to zoom · Drag to pan</span>
      </header>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <LeafletViewer pdfUrl="/sample-blueprint.pdf" />
      </div>
    </div>
  )
}
