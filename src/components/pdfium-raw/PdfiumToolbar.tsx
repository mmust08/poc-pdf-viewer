import { Link } from 'react-router-dom'
import { MAX_NORMALIZED } from './zoomUtils'

const btnStyle: React.CSSProperties = {
  background: 'rgba(139, 92, 246, 0.1)',
  color: '#a78bfa',
  border: '1px solid rgba(139, 92, 246, 0.2)',
  borderRadius: 5,
  padding: '0.32rem 0.7rem',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: 500,
  flexShrink: 0,
}

const clearBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'rgba(248, 113, 113, 0.1)',
  color: '#f87171',
  border: '1px solid rgba(248, 113, 113, 0.18)',
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
          background: 'rgba(10, 9, 18, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '0.55rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <Link to="/" style={{ color: '#a78bfa', flexShrink: 0, fontSize: '0.875rem', fontWeight: 500 }}>
          ← Back
        </Link>
        <h2 style={{ margin: 0, fontSize: '0.875rem', flexShrink: 0, color: '#a9a7c0', fontWeight: 500 }}>
          Prototype 5 — PDFium Raw WASM · {pdfName}
        </h2>
        <div style={{ flex: 1 }} />

        {pageCount > 0 && (
          <span style={{ color: '#67647c', fontSize: '0.82rem', flexShrink: 0 }}>
            Page {currentPage} / {pageCount}
          </span>
        )}

        <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.08)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          <button onClick={() => onZoom('out')} style={btnStyle} title="Zoom out">
            −
          </button>
          <span style={{ color: '#a9a7c0', fontSize: '0.83rem', minWidth: 55, textAlign: 'center' }}>
            {zoomPercent}%
          </span>
          <button onClick={() => onZoom('in')} style={btnStyle} title="Zoom in">
            +
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.08)' }} />

        <button onClick={onUploadClick} style={btnStyle} title="Upload a PDF">
          Upload PDF
        </button>

        {userMarkCount > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.08)' }} />
            <span style={{ color: '#67647c', fontSize: '0.82rem' }}>
              {userMarkCount} user mark{userMarkCount !== 1 ? 's' : ''}
            </span>
            <button onClick={onClearMarks} style={clearBtnStyle} title="Remove all user marks">
              Clear all
            </button>
          </>
        )}

        <span style={{ color: '#67647c', fontSize: '0.78rem', flexShrink: 0 }}>
          Click to place mark · Drag to pan · Ctrl+wheel to zoom · Max {MAX_NORMALIZED}%
        </span>
      </header>
    </>
  )
}
