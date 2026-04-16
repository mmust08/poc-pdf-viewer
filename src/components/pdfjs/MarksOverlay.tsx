import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

interface Props {
  marks: PdfMark[]
  pageWidthPt: number
  pageHeightPt: number
  canvasWidthPx: number
  canvasHeightPx: number
  isAdding: boolean
  onMarkAdded: (x: number, y: number) => void
}

function markToScreen(
  mark: PdfMark,
  pageWidthPt: number,
  pageHeightPt: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
) {
  const scaleX = canvasWidthPx / pageWidthPt
  const scaleY = canvasHeightPx / pageHeightPt
  return {
    cx: Math.round(mark.x * scaleX),
    cy: Math.round((pageHeightPt - mark.y) * scaleY),
  }
}

const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

export default function MarksOverlay({
  marks,
  pageWidthPt,
  pageHeightPt,
  canvasWidthPx,
  canvasHeightPx,
  isAdding,
  onMarkAdded,
}: Props) {
  if (!pageWidthPt || !canvasWidthPx) return null

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!isAdding) return
    // getBoundingClientRect() gives the visually-scaled rect.
    // Dividing by it normalises back to SVG user-unit (canvas-pixel) space.
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) * (canvasWidthPx / rect.width)
    const svgY = (e.clientY - rect.top) * (canvasHeightPx / rect.height)
    const pdfX = svgX * (pageWidthPt / canvasWidthPx)
    const pdfY = pageHeightPt - svgY * (pageHeightPt / canvasHeightPx)
    onMarkAdded(pdfX, pdfY)
  }

  return (
    <svg
      width={canvasWidthPx}
      height={canvasHeightPx}
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'visible',
        // Enable pointer events only when adding so normal pan/zoom isn't blocked
        pointerEvents: isAdding ? 'all' : 'none',
        cursor: isAdding ? 'crosshair' : 'inherit',
      }}
    >
      {/* Invisible full-size hit area when adding */}
      {isAdding && (
        <rect x={0} y={0} width={canvasWidthPx} height={canvasHeightPx} fill="rgba(100,200,255,0.08)" />
      )}

      {marks.map((mark) => {
        const { cx, cy } = markToScreen(mark, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx)
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
  )
}
