import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { usePdfPage } from '../../hooks/usePdfPage'
import MarksOverlay from './MarksOverlay'
import { PdfMark } from '../../types/marks'

interface Props {
  pdfUrl: string
  marks: PdfMark[]
  isAdding: boolean
  onMarkAdded: (x: number, y: number) => void
}

export default function PdfJsViewer({ pdfUrl, marks, isAdding, onMarkAdded }: Props) {
  const { canvasRef, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx, isLoading, error } =
    usePdfPage(pdfUrl, 1.5)

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
        // Disable panning while add mode is active so clicks go to the SVG overlay
        panning={{ disabled: isAdding }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ position: 'relative', display: 'inline-block' }}
        >
          {/* Canvas and SVG overlay share the same CSS transform applied by TransformComponent */}
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
