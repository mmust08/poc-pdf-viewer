import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { usePdfPage } from '../../hooks/usePdfPage'
import MarksOverlay from './MarksOverlay'
import { PdfMark } from '../../types/marks'

interface Props {
  pdfUrl: string
  pageNumber: number
  onPageCountKnown: (count: number) => void
  marks: PdfMark[]
  isAdding: boolean
  onMarkAdded: (x: number, y: number) => void
}

export default function PdfJsViewer({ pdfUrl, pageNumber, onPageCountKnown, marks, isAdding, onMarkAdded }: Props) {
  const { canvasRef, pageCount, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx, isLoading, error } =
    usePdfPage(pdfUrl, pageNumber, 1.5)

  // Bubble page count up to parent the first time (and when PDF changes)
  if (pageCount > 0) onPageCountKnown(pageCount)

  if (error) return <div style={{ color: 'red', padding: '1rem' }}>Error: {error}</div>

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#555' }}>
      {isLoading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'white', zIndex: 10 }}>
          Loading PDF…
        </div>
      )}
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={10}
        wheel={{ step: 0.1 }}
        panning={{ disabled: isAdding }}
        // Re-mount on page change to reset zoom/pan position
        key={`${pdfUrl}-p${pageNumber}`}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ position: 'relative', display: 'inline-block' }}
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <canvas ref={canvasRef as any} style={{ display: 'block' }} />
          <MarksOverlay
            marks={marks}
            pageWidthPt={pageWidthPt}
            pageHeightPt={pageHeightPt}
            canvasWidthPx={canvasWidthPx}
            canvasHeightPx={canvasHeightPx}
            isAdding={isAdding}
            onMarkAdded={onMarkAdded}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
