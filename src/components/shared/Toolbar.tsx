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

      <h2 style={{ margin: 0, fontSize: '0.9rem', flexShrink: 0, color: '#ccc' }}>{title}</h2>

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
                background: '#0f3460',
                color: 'white',
                border: '1px solid #7eb8f7',
                borderRadius: 4,
                padding: '0.2rem 0.3rem',
                fontSize: '0.85rem',
              }}
            />
          ) : (
            <button
              onClick={() => { setPageInputValue(String(currentPage)); setEditingPage(true) }}
              title="Click to jump to a page"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e0e0e0',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '0.2rem 0.3rem',
                borderRadius: 4,
                minWidth: 70,
                textAlign: 'center',
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

      {pageCount > 1 && <div style={{ width: 1, height: 24, background: '#2a4080' }} />}

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
        style={btnStyle('#2a4080', false)}
        title="Upload a PDF file from your computer"
      >
        Upload PDF
      </button>

      <div style={{ width: 1, height: 24, background: '#2a4080' }} />

      {/* Add mark toggle */}
      <button
        onClick={onToggleAdding}
        style={btnStyle(isAdding ? '#1a6b3a' : '#2a4080', false, isAdding ? '#4ade80' : undefined)}
        title={isAdding ? 'Click on the PDF to place a mark. Click again to exit.' : 'Enter add-mark mode'}
      >
        {isAdding ? '✚ Adding… (click PDF)' : '✚ Add Mark'}
      </button>

      {userMarkCount > 0 && (
        <>
          <span style={{ color: '#aaa', fontSize: '0.82rem' }}>
            {userMarkCount} user mark{userMarkCount !== 1 ? 's' : ''} (this page)
          </span>
          <button
            onClick={onClearUserMarks}
            style={btnStyle('#6b1a1a', false)}
            title="Remove all user-placed marks (all pages)"
          >
            Clear all
          </button>
        </>
      )}

      {hint && !isAdding && (
        <span style={{ color: '#555', fontSize: '0.8rem', flexShrink: 0 }}>{hint}</span>
      )}
    </header>
  )
}

function btnStyle(bg: string, _disabled: boolean, color?: string): React.CSSProperties {
  return {
    background: bg,
    color: color ?? 'white',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5,
    padding: '0.32rem 0.7rem',
    cursor: 'pointer',
    fontSize: '0.83rem',
    fontWeight: 500,
    flexShrink: 0,
  }
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#111827' : '#2a4080',
    color: disabled ? '#444' : 'white',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5,
    padding: '0.2rem 0.55rem',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '1.1rem',
    lineHeight: 1,
    flexShrink: 0,
  }
}
