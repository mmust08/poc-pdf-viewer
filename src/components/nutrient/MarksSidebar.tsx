import { memo } from 'react'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

interface Props {
  marks: PdfMark[]
  onNavigate: (mark: PdfMark) => void
  onDelete: (markId: string) => void
}

export default memo(function MarksSidebar({ marks, onNavigate, onDelete }: Props) {
  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        background: '#16213e',
        borderLeft: '1px solid #2a4080',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #2a4080',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#e0e0e0',
        }}
      >
        Marks ({marks.length})
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {marks.length === 0 && (
          <p style={{ color: '#666', fontSize: '0.82rem', textAlign: 'center', padding: '1rem' }}>
            No marks yet. Toggle "Add Mark" and click on the PDF.
          </p>
        )}
        {marks.map((m) => {
          const isHardcoded = hardcodedIds.has(m.id)
          return (
            <div
              key={m.id}
              onClick={() => onNavigate(m)}
              style={{
                background: '#0f3460',
                border: `1px solid ${isHardcoded ? '#7f1d1d' : '#2a4080'}`,
                borderRadius: 6,
                padding: '0.6rem 0.75rem',
                marginBottom: '0.4rem',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7eb8f7')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = isHardcoded ? '#7f1d1d' : '#2a4080')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: isHardcoded ? '#f87171' : '#7eb8f7',
                  }}
                >
                  {m.id}
                </span>
                {!isHardcoded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(m.id) }}
                    title="Delete mark"
                    style={{
                      background: '#6b1a1a',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 4,
                      padding: '0.15rem 0.45rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#ccc', marginTop: '0.25rem' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                Page {m.page} &middot; ({Math.round(m.x)}, {Math.round(m.y)})
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
