import { useEffect, useRef } from 'react'
import { Canvas, Circle, FabricImage, FabricText, Point } from 'fabric'
import { usePdfPageDataUrl } from '../../hooks/usePdfPage'
import { PdfMark, HARDCODED_MARKS } from '../../types/marks'

interface Props {
  pdfUrl: string
  pageNumber: number
  onPageCountKnown: (count: number) => void
  marks: PdfMark[]
  isAdding: boolean
  onMarkAdded: (x: number, y: number) => void
}

const hardcodedIds = new Set(HARDCODED_MARKS.map((m) => m.id))

export default function FabricViewer({ pdfUrl, pageNumber, onPageCountKnown, marks, isAdding, onMarkAdded }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)

  const isAddingRef = useRef(isAdding)
  const onMarkAddedRef = useRef(onMarkAdded)
  const geometryRef = useRef({ pageWidthPt: 0, pageHeightPt: 0, canvasWidthPx: 0, canvasHeightPx: 0 })

  isAddingRef.current = isAdding
  onMarkAddedRef.current = onMarkAdded

  const { dataUrl, pageCount, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx, isLoading, error } =
    usePdfPageDataUrl(pdfUrl, pageNumber, 1.5)

  if (pageCount > 0) onPageCountKnown(pageCount)
  geometryRef.current = { pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx }

  // Initialize Fabric canvas once
  useEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    const fc = new Canvas(el, { selection: false, backgroundColor: '#888' })
    fabricRef.current = fc

    fc.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent
      let zoom = fc.getZoom()
      zoom *= 0.999 ** e.deltaY
      zoom = Math.min(Math.max(zoom, 0.2), 10)
      fc.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom)
      e.preventDefault()
      e.stopPropagation()
    })

    let isPanning = false
    let lastX = 0
    let lastY = 0
    let didMove = false

    fc.on('mouse:down', (opt) => {
      if (isAddingRef.current) return
      isPanning = true
      didMove = false
      const me = opt.e as MouseEvent
      lastX = me.clientX
      lastY = me.clientY
    })
    fc.on('mouse:move', (opt) => {
      if (!isPanning) return
      const me = opt.e as MouseEvent
      const dx = me.clientX - lastX
      const dy = me.clientY - lastY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didMove = true
      const vpt = fc.viewportTransform
      vpt[4] += dx
      vpt[5] += dy
      fc.requestRenderAll()
      lastX = me.clientX
      lastY = me.clientY
    })
    fc.on('mouse:up', (opt) => {
      isPanning = false
      if (isAddingRef.current && !didMove) {
        const pointer = fc.getScenePoint(opt.e)
        const { pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx } = geometryRef.current
        if (!canvasWidthPx) return
        const pdfX = pointer.x * (pageWidthPt / canvasWidthPx)
        const pdfY = pageHeightPt - pointer.y * (pageHeightPt / canvasHeightPx)
        onMarkAddedRef.current(pdfX, pdfY)
      }
      didMove = false
    })

    function resize() {
      if (!containerRef.current) return
      fc.setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      fc.dispose()
      fabricRef.current = null
    }
  }, [])

  // Re-render content whenever PDF page data or marks change
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !dataUrl || !pageWidthPt) return

    async function loadContent() {
      if (!fc) return
      fc.clear()

      const img = await FabricImage.fromURL(dataUrl!)
      img.set({ left: 0, top: 0, selectable: false, evented: false })
      fc.add(img)

      const scaleX = canvasWidthPx / pageWidthPt
      const scaleY = canvasHeightPx / pageHeightPt

      for (const mark of marks) {
        const left = Math.round(mark.x * scaleX)
        const top = Math.round((pageHeightPt - mark.y) * scaleY)
        const isUser = !hardcodedIds.has(mark.id)

        fc.add(new Circle({
          left: left - 10, top: top - 10, radius: 10,
          fill: isUser ? 'rgba(80,180,255,0.9)' : 'rgba(255,80,80,0.85)',
          stroke: 'white', strokeWidth: 2, selectable: false, evented: false,
        }))

        fc.add(new FabricText(mark.label, {
          left: left + 14, top: top - 8, fontSize: 13, fontWeight: 'bold',
          fill: 'white', stroke: 'black', strokeWidth: 2, paintFirst: 'stroke',
          selectable: false, evented: false,
        }))
      }

      fc.requestRenderAll()
    }

    loadContent()
  }, [dataUrl, pageWidthPt, pageHeightPt, canvasWidthPx, canvasHeightPx, marks])

  // Reset viewport when page changes
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    fc.setViewportTransform([1, 0, 0, 1, 0, 0])
  }, [pageNumber])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', cursor: isAdding ? 'crosshair' : 'default' }}>
      {isLoading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'white', zIndex: 10 }}>
          Loading PDF…
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'red', zIndex: 10 }}>
          Error: {error}
        </div>
      )}
      {isAdding && (
        <div style={{ position: 'absolute', top: '0.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(26,107,58,0.9)', color: '#4ade80', padding: '0.3rem 1rem', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, zIndex: 20, pointerEvents: 'none' }}>
          Click anywhere on the PDF to place a mark
        </div>
      )}
      <canvas ref={canvasElRef} />
    </div>
  )
}
