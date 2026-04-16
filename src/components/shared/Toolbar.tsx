import { useRef } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  hint?: string
  isAdding: boolean
  onToggleAdding: () => void
  userMarkCount: number
  onClearUserMarks: () => void
  onPdfLoaded: (url: string, name: string) => void
}

export default function Toolbar({
  title,
  hint,
  isAdding,
  onToggleAdding,
  userMarkCount,
  onClearUserMarks,
  onPdfLoaded,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    onPdfLoaded(url, file.name)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <header
      style={{
        background: '#16213e',
        padding: '0.6rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid #2a4080',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <Link to="/" style={{ color: '#7eb8f7', flexShrink: 0 }}>
        ← Back
      </Link>

      <h2 style={{ margin: 0, fontSize: '0.95rem', flexShrink: 0 }}>{title}</h2>

      {/* Divider */}
      <div style={{ flex: 1 }} />

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
        style={btnStyle('#2a4080', '#3a5090')}
        title="Upload a PDF file from your computer"
      >
        Upload PDF
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: '#2a4080' }} />

      {/* Add mark toggle */}
      <button
        onClick={onToggleAdding}
        style={btnStyle(
          isAdding ? '#1a6b3a' : '#2a4080',
          isAdding ? '#2a8b4a' : '#3a5090',
          isAdding ? '#4ade80' : undefined,
        )}
        title={isAdding ? 'Click on the PDF to place a mark. Click again to exit add mode.' : 'Enter add-mark mode'}
      >
        {isAdding ? '✚ Adding… (click PDF)' : '✚ Add Mark'}
      </button>

      {userMarkCount > 0 && (
        <>
          <span style={{ color: '#aaa', fontSize: '0.82rem' }}>
            {userMarkCount} user mark{userMarkCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClearUserMarks}
            style={btnStyle('#6b1a1a', '#8b2a2a')}
            title="Remove all user-placed marks"
          >
            Clear user marks
          </button>
        </>
      )}

      {hint && (
        <span style={{ color: '#666', fontSize: '0.8rem', flexShrink: 0 }}>{hint}</span>
      )}
    </header>
  )
}

function btnStyle(bg: string, _hover: string, color?: string): React.CSSProperties {
  return {
    background: bg,
    color: color ?? 'white',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 5,
    padding: '0.35rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'background 0.15s',
    flexShrink: 0,
  }
}
