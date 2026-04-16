import { HARDCODED_MARKS, PdfMark } from '../../types/marks'

interface Props {
  pageWidthPt: number
  pageHeightPt: number
  canvasWidthPx: number
  canvasHeightPx: number
}

function markToScreen(
  mark: PdfMark,
  pageWidthPt: number,
  pageHeightPt: number,
  canvasWidthPx: number,
  canvasHeightPx: number
) {
  const scaleX = canvasWidthPx / pageWidthPt
  const scaleY = canvasHeightPx / pageHeightPt
  return {
    cx: Math.round(mark.x * scaleX),
    cy: Math.round((pageHeightPt - mark.y) * scaleY),
  }
}

export default function MarksOverlay({ pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx }: Props) {
  if (!pageWidthPt || !canvasWidthPx) return null

  return (
    <svg
      width={canvasWidthPx}
      height={canvasHeightPx}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {HARDCODED_MARKS.map((mark) => {
        const { cx, cy } = markToScreen(mark, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx)
        return (
          <g key={mark.id}>
            <circle cx={cx} cy={cy} r={10} fill="rgba(255,80,80,0.85)" stroke="white" strokeWidth={2} />
            <text
              x={cx + 14}
              y={cy + 5}
              fill="white"
              fontSize={12}
              fontWeight="bold"
              style={{ textShadow: '0 1px 3px black' }}
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
  )
}
