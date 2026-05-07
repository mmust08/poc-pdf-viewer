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
    <div style={{
      width: 280,
      flexShrink: 0,
      background: 'rgba(10, 9, 18, 0.88)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '0.82rem',
        fontWeight: 600,
        color: '#a9a7c0',
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
      }}>
        Marks ({marks.length})
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {marks.length === 0 && (
          <p style={{ color: '#67647c', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 1rem', lineHeight: 1.5 }}>
            No marks yet. Toggle "Add Mark" and click the PDF.
          </p>
        )}
        {marks.map((m) => {
          const isHardcoded = hardcodedIds.has(m.id)
          return (
            <div
              key={m.id}
              onClick={() => onNavigate(m)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isHardcoded ? 'rgba(248, 113, 113, 0.18)' : 'rgba(255, 255, 255, 0.07)'}`,
                borderRadius: 8,
                padding: '0.6rem 0.75rem',
                marginBottom: '0.4rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.055)'
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                e.currentTarget.style.borderColor = isHardcoded ? 'rgba(248, 113, 113, 0.18)' : 'rgba(255, 255, 255, 0.07)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: isHardcoded ? '#f87171' : '#a78bfa',
                }}>
                  {m.id}
                </span>
                {!isHardcoded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(m.id) }}
                    title="Delete mark"
                    style={{
                      background: 'rgba(248, 113, 113, 0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(248, 113, 113, 0.18)',
                      borderRadius: 4,
                      padding: '0.15rem 0.45rem',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a9a7c0', marginTop: '0.25rem' }}>
                {m.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#67647c', marginTop: '0.2rem' }}>
                Page {m.page} · ({Math.round(m.x)}, {Math.round(m.y)})
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
