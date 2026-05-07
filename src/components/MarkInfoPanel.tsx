import { PdfMark } from '../types/marks'

interface MarkInfoPanelProps {
  mark: PdfMark
  screenX: number
  screenY: number
  onClose: () => void
}

export function MarkInfoPanel({ mark, screenX, screenY, onClose }: MarkInfoPanelProps) {
  return (
    <div
      className="mark-info-panel"
      style={{
        position: 'absolute',
        left: `${screenX + 16}px`,
        top: `${screenY - 40}px`,
        background: '#2a2a2a',
        border: '1px solid #444',
        borderRadius: 6,
        padding: '8px 12px',
        color: '#e5e4e7',
        fontSize: '12px',
        zIndex: 10,
        maxWidth: 200,
        wordWrap: 'break-word',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>{mark.label}</div>
      <div style={{ fontSize: '11px', color: '#aaa' }}>
        x: {Math.round(mark.x)} · y: {Math.round(mark.y)}
      </div>
      <button
        onClick={onClose}
        style={{
          marginTop: '6px',
          padding: '2px 6px',
          background: '#444',
          border: '1px solid #666',
          borderRadius: 3,
          color: '#e5e4e7',
          fontSize: '11px',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Close
      </button>
    </div>
  )
}
