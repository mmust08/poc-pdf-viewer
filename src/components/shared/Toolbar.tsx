import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  hint?: string
  // Page navigation
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
  // Mark controls
  isAdding: boolean
  onToggleAdding: () => void
  userMarkCount: number
  onClearUserMarks: () => void
  // PDF upload
  onPdfLoaded: (url: string, name: string) => void
}

export default function Toolbar({
  title,
  hint,
  currentPage,
  pageCount,
  onPageChange,
  isAdding,
  onToggleAdding,
  userMarkCount,
  onClearUserMarks,
  onPdfLoaded,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pageInputValue, setPageInputValue] = useState('')
  const [editingPage, setEditingPage] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    onPdfLoaded(url, file.name)
    e.target.value = ''
  }

  function commitPageInput() {
    const n = parseInt(pageInputValue, 10)
    if (!isNaN(n) && n >= 1 && n <= pageCount) onPageChange(n)
    setEditingPage(false)
  }

  return (
    <header
      style={{
        background: 'rgba(255, 255, 255, 0.80)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        padding: '0.55rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.6), 0 1px 8px rgba(0,0,0,0.05)',
        flexShrink: 0,
        flexWrap: 'wrap',
        fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
      }}
    >
      <Link
        to="/"
        style={{ color: '#4E6E7E', flexShrink: 0, fontSize: '0.875rem', fontWeight: 500, transition: 'color 0.15s ease' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#6D90A2' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#4E6E7E' }}
      >
        ← Back
      </Link>

      <h2 style={{ margin: 0, fontSize: '0.875rem', flexShrink: 0, color: '#5C5753', fontWeight: 500 }}>{title}</h2>

      <div style={{ flex: 1 }} />

      {/* Page navigation — only shown when PDF has more than 1 page */}
      {pageCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={navBtnStyle(currentPage <= 1)}
            title="Previous page"
          >
            ‹
          </button>

          {/* Clicking the page indicator lets you type a page number */}
          {editingPage ? (
            <input
              autoFocus
              value={pageInputValue}
              onChange={(e) => setPageInputValue(e.target.value)}
              onBlur={commitPageInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitPageInput()
                if (e.key === 'Escape') setEditingPage(false)
              }}
              style={{
                width: 48,
                textAlign: 'center',
                background: 'rgba(255,255,255,0.9)',
                color: '#1C1A17',
                border: '1px solid rgba(78, 110, 126, 0.38)',
                borderRadius: 5,
                padding: '0.2rem 0.3rem',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          ) : (
            <button
              onClick={() => { setPageInputValue(String(currentPage)); setEditingPage(true) }}
              title="Click to jump to a page"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#5C5753',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '0.2rem 0.3rem',
                borderRadius: 4,
                minWidth: 70,
                textAlign: 'center',
                fontFamily: 'inherit',
              }}
            >
              {currentPage} / {pageCount}
            </button>
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= pageCount}
            style={navBtnStyle(currentPage >= pageCount)}
            title="Next page"
          >
            ›
          </button>
        </div>
      )}

      {pageCount > 1 && <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.09)' }} />}

      {/* PDF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        style={btnStyle(false)}
        title="Upload a PDF file from your computer"
      >
        Upload PDF
      </button>

      <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.09)' }} />

      {/* Add mark toggle */}
      <button
        onClick={onToggleAdding}
        style={isAdding ? btnStyleActive() : btnStyle(false)}
        title={isAdding ? 'Click on the PDF to place a mark. Click again to exit.' : 'Enter add-mark mode'}
      >
        {isAdding ? '✚ Adding… (click PDF)' : '✚ Add Mark'}
      </button>

      {userMarkCount > 0 && (
        <>
          <span style={{ color: '#9E9A95', fontSize: '0.82rem' }}>
            {userMarkCount} user mark{userMarkCount !== 1 ? 's' : ''} (this page)
          </span>
          <button
            onClick={onClearUserMarks}
            style={btnStyleDanger()}
            title="Remove all user-placed marks (all pages)"
          >
            Clear all
          </button>
        </>
      )}

      {hint && !isAdding && (
        <span style={{ color: '#B0ACA7', fontSize: '0.8rem', flexShrink: 0 }}>{hint}</span>
      )}
    </header>
  )
}

function btnStyle(_disabled: boolean): React.CSSProperties {
  return {
    background: 'rgba(78, 110, 126, 0.08)',
    color: '#4E6E7E',
    border: '1px solid rgba(78, 110, 126, 0.18)',
    borderRadius: 5,
    padding: '0.32rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 500,
    flexShrink: 0,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  }
}

function btnStyleActive(): React.CSSProperties {
  return {
    background: 'rgba(74, 128, 101, 0.10)',
    color: '#3C7A58',
    border: '1px solid rgba(74, 128, 101, 0.28)',
    borderRadius: 5,
    padding: '0.32rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 500,
    flexShrink: 0,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  }
}

function btnStyleDanger(): React.CSSProperties {
  return {
    background: 'rgba(160, 60, 60, 0.07)',
    color: '#9A4A4A',
    border: '1px solid rgba(160, 60, 60, 0.16)',
    borderRadius: 5,
    padding: '0.32rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 500,
    flexShrink: 0,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  }
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? 'rgba(0,0,0,0.04)' : 'rgba(78, 110, 126, 0.08)',
    color: disabled ? '#C0BCB8' : '#4E6E7E',
    border: `1px solid ${disabled ? 'rgba(0,0,0,0.06)' : 'rgba(78, 110, 126, 0.18)'}`,
    borderRadius: 5,
    padding: '0.2rem 0.55rem',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '1.1rem',
    lineHeight: 1,
    flexShrink: 0,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  }
}
