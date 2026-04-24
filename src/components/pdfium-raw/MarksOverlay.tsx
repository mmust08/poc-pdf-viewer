import { useRef } from 'react'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

const CLICK_THRESHOLD_SQ = 25
const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

interface MarkOverlayProps {
  marks: PdfMark[]
  scale: number
  heightPt: number
  canvasWidth: number
  canvasHeight: number
  onMarkAdded: (x: number, y: number) => void
}

export default function MarksOverlay({
  marks,
  scale,
  heightPt,
  canvasWidth,
  canvasHeight,
  onMarkAdded,
}: MarkOverlayProps) {
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (pointerDownRef.current) {
      const dx = e.clientX - pointerDownRef.current.x
      const dy = e.clientY - pointerDownRef.current.y
      pointerDownRef.current = null
      if (dx * dx + dy * dy > CLICK_THRESHOLD_SQ) return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const pdfX = (e.clientX - rect.left) / scale
    const pdfY = heightPt - (e.clientY - rect.top) / scale
    onMarkAdded(pdfX, pdfY)
  }

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onPointerDown={(e) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={handleClick}
    >
      {marks.length > 0 && (
        <svg
          width={canvasWidth}
          height={canvasHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          {marks.map((mark) => {
            const cx = mark.x * scale
            const cy = (heightPt - mark.y) * scale
            const isUser = !hardcodedIds.has(mark.id)
            return (
              <g key={mark.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={10}
                  fill={isUser ? 'rgba(80,180,255,0.9)' : 'rgba(255,80,80,0.85)'}
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={cx + 14}
                  y={cy + 5}
                  fill="white"
                  fontSize={12}
                  fontWeight="bold"
                  paintOrder="stroke"
                  stroke="black"
                  strokeWidth={3}
                >
                  {mark.label}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
