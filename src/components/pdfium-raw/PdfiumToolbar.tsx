import { Link } from 'react-router-dom'
import { MAX_NORMALIZED } from './zoomUtils'

const btnStyle: React.CSSProperties = {
  background: '#2a4080',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 5,
  padding: '0.32rem 0.7rem',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: 500,
  flexShrink: 0,
}

interface PdfiumToolbarProps {
  pdfName: string
  currentPage: number
  pageCount: number
  zoomPercent: number
  rendering: boolean
  userMarkCount: number
  onZoom: (direction: 'in' | 'out') => void
  onUploadClick: () => void
  onClearMarks: () => void
}

export function PdfiumToolbar({
  pdfName,
  currentPage,
  pageCount,
  zoomPercent,
  rendering,
  userMarkCount,
  onZoom,
  onUploadClick,
  onClearMarks,
}: PdfiumToolbarProps) {
  return (
    <>
      {rendering && <style>{`
        .pdfium-container, .pdfium-container * { cursor: progress !important; }
      `}</style>}
      <header
        style={{
          background: '#16213e',
          padding: '0.55rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderBottom: '1px solid #2a4080',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <Link to="/" style={{ color: '#7eb8f7', flexShrink: 0 }}>
          ← Back
        </Link>
        <h2 style={{ margin: 0, fontSize: '0.9rem', flexShrink: 0, color: '#ccc' }}>
          Prototype 5 — PDFium Raw WASM · {pdfName}
        </h2>
        <div style={{ flex: 1 }} />

        {pageCount > 0 && (
          <span style={{ color: '#aaa', fontSize: '0.85rem', flexShrink: 0 }}>
            Page {currentPage} / {pageCount}
          </span>
        )}

        <div style={{ width: 1, height: 24, background: '#2a4080' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          <button onClick={() => onZoom('out')} style={btnStyle} title="Zoom out">
            −
          </button>
          <span style={{ color: '#e0e0e0', fontSize: '0.85rem', minWidth: 55, textAlign: 'center' }}>
            {zoomPercent}%
          </span>
          <button onClick={() => onZoom('in')} style={btnStyle} title="Zoom in">
            +
          </button>
        </div>

        <div style={{ width: 1, height: 24, background: '#2a4080' }} />

        <button onClick={onUploadClick} style={btnStyle} title="Upload a PDF">
          Upload PDF
        </button>

        {userMarkCount > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: '#2a4080' }} />
            <span style={{ color: '#aaa', fontSize: '0.82rem' }}>
              {userMarkCount} user mark{userMarkCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClearMarks}
              style={{ ...btnStyle, background: '#6b1a1a' }}
              title="Remove all user marks"
            >
              Clear all
            </button>
          </>
        )}

        <span style={{ color: '#555', fontSize: '0.8rem', flexShrink: 0 }}>
          Click to place mark · Drag to pan · Ctrl+wheel to zoom · Max {MAX_NORMALIZED}%
        </span>
      </header>
    </>
  )
}
